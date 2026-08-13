mod cookie;
mod crypto;
mod envelope;
mod idb;
mod memory;
mod ops;
mod sync;
mod web;

use std::sync::Arc;

use parking_lot::Mutex;
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;

use base64::Engine as _;

use crate::crypto::EncryptionKey;
use crate::ops::{StorageError, StorageOps};

fn validate_key(key: &str) -> Result<(), JsValue> {
    if key.is_empty() {
        return Err(JsValue::from_str("key must be non-empty"));
    }
    if key.len() > 256 {
        return Err(JsValue::from_str("key too long: max 256 bytes"));
    }
    if key.contains('\0') || key.contains('\n') || key.contains('\r') {
        return Err(JsValue::from_str("key contains invalid control characters"));
    }
    Ok(())
}

macro_rules! impl_storage {
    ($Name:ident, $InnerName:ident, $Backend:ty, $backend_init:expr, $sync_kind:expr) => {
        struct $InnerName {
            backend: $Backend,
            prefix: String,
            encryption_key: Option<EncryptionKey>,
            sync: sync::SyncState,
        }

        #[wasm_bindgen]
        #[derive(Clone)]
        pub struct $Name {
            state: Arc<Mutex<$InnerName>>,
        }

        #[wasm_bindgen]
        impl $Name {
            // wasm32 is single-threaded; Arc here is shared ownership across JS handles,
            // not cross-thread sharing, so the !Send JS handle types inside are fine.
            #[allow(clippy::arc_with_non_send_sync)]
            #[wasm_bindgen(constructor)]
            pub fn new(prefix: Option<String>) -> Self {
                Self {
                    state: Arc::new(Mutex::new($InnerName {
                        backend: $backend_init,
                        prefix: prefix.unwrap_or_else(|| "hamd:".into()),
                        encryption_key: None,
                        sync: sync::SyncState::new($sync_kind),
                    })),
                }
            }

            #[wasm_bindgen(js_name = "enableEncryption")]
            pub fn enable_encryption(&self, key: &[u8]) -> Result<(), JsValue> {
                if key.len() != 32 {
                    return Err(JsValue::from_str("key must be exactly 32 bytes"));
                }
                let mut bytes = [0u8; 32];
                bytes.copy_from_slice(key);
                self.state.lock().encryption_key = Some(EncryptionKey::new(bytes));
                Ok(())
            }

            #[wasm_bindgen(js_name = "generateKey")]
            pub fn generate_key(&self) -> Result<Vec<u8>, JsValue> {
                let key_vec = crypto::generate_key();
                let mut bytes = [0u8; 32];
                bytes.copy_from_slice(&key_vec);
                self.state.lock().encryption_key = Some(EncryptionKey::new(bytes));
                Ok(key_vec)
            }

            pub fn set(
                &self,
                key: &str,
                value: JsValue,
                ttl_ms: Option<f64>,
            ) -> Result<(), JsValue> {
                validate_key(key)?;
                if let Some(ms) = ttl_ms
                    && (!ms.is_finite() || ms <= 0.0)
                {
                    return Err(JsValue::from_str("ttlMs must be a positive finite number"));
                }
                let (full_key, stored) = {
                    let mut guard = self.state.lock();
                    let full_key = format!("{}{}", guard.prefix, key);
                    let json: String = js_sys::JSON::stringify(&value)?.into();
                    let payload = match ttl_ms {
                        Some(ms) => envelope::wrap(&json, ms),
                        None => json,
                    };

                    let stored = match &guard.encryption_key {
                        Some(ek) => crypto::encrypt(ek.bytes(), payload.as_bytes())
                            .map_err(StorageError::Other)?,
                        None => payload,
                    };

                    match guard.backend.raw_set(&full_key, &stored) {
                        Ok(()) => {
                            let prefix = guard.prefix.clone();
                            guard.sync.notify("set", &prefix, key);
                            return Ok(());
                        }
                        // Quota hit: fall through, evict expired entries, retry once.
                        Err(StorageError::QuotaExceeded) => (full_key, stored),
                        Err(e) => return Err(e.into()),
                    }
                };

                self.purge_expired()?;
                let mut guard = self.state.lock();
                guard
                    .backend
                    .raw_set(&full_key, &stored)
                    .map_err(JsValue::from)?;
                let prefix = guard.prefix.clone();
                guard.sync.notify("set", &prefix, key);
                Ok(())
            }

            pub fn get(&self, key: &str) -> Result<JsValue, JsValue> {
                validate_key(key)?;
                let mut guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);

                match guard.backend.raw_get(&full_key).map_err(JsValue::from)? {
                    Some(raw) => {
                        let json = match &guard.encryption_key {
                            Some(ek) => crypto::decrypt(ek.bytes(), &raw).map_err(JsValue::from)?,
                            None => raw,
                        };
                        let parsed = js_sys::JSON::parse(&json)?;
                        match envelope::unwrap(parsed)? {
                            envelope::Unwrapped::Value(value) => Ok(value),
                            envelope::Unwrapped::Expired => {
                                guard.backend.raw_remove(&full_key).map_err(JsValue::from)?;
                                Ok(JsValue::NULL)
                            }
                        }
                    }
                    None => Ok(JsValue::NULL),
                }
            }

            pub fn remove(&self, key: &str) -> Result<(), JsValue> {
                validate_key(key)?;
                let mut guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);
                guard.backend.raw_remove(&full_key).map_err(JsValue::from)?;
                let prefix = guard.prefix.clone();
                guard.sync.notify("remove", &prefix, key);
                Ok(())
            }

            pub fn clear(&self) -> Result<(), JsValue> {
                let mut guard = self.state.lock();
                let prefix = guard.prefix.clone();
                let keys: Vec<String> = guard
                    .backend
                    .raw_keys()
                    .map_err(JsValue::from)?
                    .into_iter()
                    .filter(|k| k.starts_with(&prefix))
                    .collect();

                for k in &keys {
                    guard.backend.raw_remove(k).map_err(JsValue::from)?;
                }
                guard.sync.notify("clear", &prefix, "");
                Ok(())
            }

            pub fn has(&self, key: &str) -> Result<bool, JsValue> {
                Ok(!self.get(key)?.is_null())
            }

            pub fn keys(&self) -> Result<JsValue, JsValue> {
                let guard = self.state.lock();
                let prefix = &guard.prefix;
                let arr = js_sys::Array::new();

                for k in guard.backend.raw_keys().map_err(JsValue::from)? {
                    if let Some(stripped) = k.strip_prefix(prefix) {
                        arr.push(&JsValue::from_str(stripped));
                    }
                }
                Ok(arr.into())
            }

            pub fn length(&self) -> Result<u32, JsValue> {
                let guard = self.state.lock();
                let prefix = &guard.prefix;
                let count = guard
                    .backend
                    .raw_keys()
                    .map_err(JsValue::from)?
                    .iter()
                    .filter(|k| k.starts_with(prefix))
                    .count();
                Ok(count as u32)
            }

            #[wasm_bindgen(js_name = "purgeExpired")]
            pub fn purge_expired(&self) -> Result<(), JsValue> {
                let user_keys: Vec<String> = {
                    let guard = self.state.lock();
                    let prefix = guard.prefix.clone();
                    guard
                        .backend
                        .raw_keys()
                        .map_err(JsValue::from)?
                        .into_iter()
                        .filter_map(|k| k.strip_prefix(&prefix).map(String::from))
                        .collect()
                };
                for k in user_keys {
                    self.get(&k)?;
                }
                Ok(())
            }

            pub fn subscribe(&self, cb: js_sys::Function) -> Result<JsValue, JsValue> {
                let id = {
                    let mut guard = self.state.lock();
                    let prefix = guard.prefix.clone();
                    guard.sync.subscribe(prefix, cb)?
                };
                let state = self.state.clone();
                Ok(Closure::once_into_js(move || {
                    state.lock().sync.unsubscribe(id);
                }))
            }

            pub fn mset(
                &self,
                entries: js_sys::Object,
                ttl_ms: Option<f64>,
            ) -> Result<(), JsValue> {
                let pairs = js_sys::Object::entries(&entries);
                for i in 0..pairs.length() {
                    let pair: js_sys::Array = pairs.get(i).unchecked_into();
                    let key = pair
                        .get(0)
                        .as_string()
                        .ok_or_else(|| JsValue::from_str("mset keys must be strings"))?;
                    self.set(&key, pair.get(1), ttl_ms)?;
                }
                Ok(())
            }

            pub fn mget(&self, keys: js_sys::Array) -> Result<JsValue, JsValue> {
                let result = js_sys::Object::new();
                for i in 0..keys.length() {
                    let Some(key) = keys.get(i).as_string() else {
                        return Err(JsValue::from_str("mget keys must be strings"));
                    };
                    validate_key(&key)?;
                    let value = self.get(&key)?;
                    js_sys::Reflect::set(&result, &JsValue::from_str(&key), &value)?;
                }
                Ok(result.into())
            }

            #[wasm_bindgen(js_name = "setBytes")]
            pub fn set_bytes(
                &self,
                key: &str,
                bytes: &[u8],
                ttl_ms: Option<f64>,
            ) -> Result<(), JsValue> {
                validate_key(key)?;
                if let Some(ms) = ttl_ms
                    && (!ms.is_finite() || ms <= 0.0)
                {
                    return Err(JsValue::from_str("ttlMs must be a positive finite number"));
                }
                let b64_len = (bytes.len() * 4).div_ceil(3) + 32;
                if b64_len > 4_800_000 {
                    return Err(JsValue::from_str(
                        "bytes too large for string storage, use IndexedDb",
                    ));
                }
                let b64 = base64::engine::general_purpose::STANDARD.encode(bytes);
                let json = format!("{{\"__bin\":true,\"data\":\"{b64}\"}}");
                let (full_key, stored) = {
                    let mut guard = self.state.lock();
                    let full_key = format!("{}{}", guard.prefix, key);
                    let payload = match ttl_ms {
                        Some(ms) => envelope::wrap(&json, ms),
                        None => json,
                    };
                    let stored = match &guard.encryption_key {
                        Some(ek) => crypto::encrypt(ek.bytes(), payload.as_bytes())
                            .map_err(StorageError::Other)?,
                        None => payload,
                    };
                    match guard.backend.raw_set(&full_key, &stored) {
                        Ok(()) => {
                            let prefix = guard.prefix.clone();
                            guard.sync.notify("set", &prefix, key);
                            return Ok(());
                        }
                        Err(StorageError::QuotaExceeded) => (full_key, stored),
                        Err(e) => return Err(e.into()),
                    }
                };
                self.purge_expired()?;
                let mut guard = self.state.lock();
                guard
                    .backend
                    .raw_set(&full_key, &stored)
                    .map_err(JsValue::from)?;
                let prefix = guard.prefix.clone();
                guard.sync.notify("set", &prefix, key);
                Ok(())
            }

            #[wasm_bindgen(js_name = "getBytes")]
            pub fn get_bytes(&self, key: &str) -> Result<Option<Vec<u8>>, JsValue> {
                validate_key(key)?;
                let val = self.get(key)?;
                if val.is_null() || val.is_undefined() {
                    return Ok(None);
                }
                let is_bin = js_sys::Reflect::get(&val, &JsValue::from_str("__bin"))?
                    .as_bool()
                    .unwrap_or(false);
                if !is_bin {
                    return Err(JsValue::from_str("value is not binary data"));
                }
                let data = js_sys::Reflect::get(&val, &JsValue::from_str("data"))?
                    .as_string()
                    .ok_or_else(|| JsValue::from_str("invalid binary data"))?;
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(&data)
                    .map_err(|e| JsValue::from_str(&format!("base64 decode: {e}")))?;
                Ok(Some(bytes))
            }
        }
    };
}

impl_storage!(
    Local,
    LocalInner,
    web::WebBackend,
    web::WebBackend::local(),
    "local"
);
impl_storage!(
    Session,
    SessionInner,
    web::WebBackend,
    web::WebBackend::session(),
    "session"
);
impl_storage!(
    Memory,
    MemoryInner,
    memory::MemoryBackend,
    memory::MemoryBackend::new(),
    "memory"
);
impl_storage!(
    Cookies,
    CookiesInner,
    cookie::CookieBackend,
    cookie::CookieBackend::new(),
    "cookies"
);

struct IndexedDbInner {
    backend: idb::IdbBackend,
    prefix: String,
    encryption_key: Option<EncryptionKey>,
    sync: sync::SyncState,
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct IndexedDb {
    state: Arc<Mutex<IndexedDbInner>>,
}

impl IndexedDb {
    async fn db(&self) -> Result<web_sys::IdbDatabase, JsValue> {
        if let Some(db) = self.state.lock().backend.cached_db() {
            return Ok(db);
        }
        let db = idb::open_db().await.map_err(JsValue::from)?;
        self.state.lock().backend.set_cached_db(db.clone());
        Ok(db)
    }

    fn encrypt_value(&self, json: &str) -> Result<String, JsValue> {
        match &self.state.lock().encryption_key {
            Some(ek) => crypto::encrypt(ek.bytes(), json.as_bytes()).map_err(JsValue::from),
            None => Ok(json.to_string()),
        }
    }

    fn decrypt_value(&self, stored: &str) -> Result<String, JsValue> {
        match &self.state.lock().encryption_key {
            Some(ek) => crypto::decrypt(ek.bytes(), stored).map_err(JsValue::from),
            None => Ok(stored.to_string()),
        }
    }
}

#[wasm_bindgen]
impl IndexedDb {
    // wasm32 is single-threaded; Arc here is shared ownership across JS handles,
    // not cross-thread sharing, so the !Send JS handle types inside are fine.
    #[allow(clippy::arc_with_non_send_sync)]
    #[wasm_bindgen(constructor)]
    pub fn new(prefix: Option<String>) -> Self {
        Self {
            state: Arc::new(Mutex::new(IndexedDbInner {
                backend: idb::IdbBackend::new(),
                prefix: prefix.unwrap_or_else(|| "hamd:".into()),
                encryption_key: None,
                sync: sync::SyncState::new("indexeddb"),
            })),
        }
    }

    #[wasm_bindgen(js_name = "enableEncryption")]
    pub fn enable_encryption(&self, key: &[u8]) -> Result<(), JsValue> {
        if key.len() != 32 {
            return Err(JsValue::from_str("key must be exactly 32 bytes"));
        }
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(key);
        self.state.lock().encryption_key = Some(EncryptionKey::new(bytes));
        Ok(())
    }

    #[wasm_bindgen(js_name = "generateKey")]
    pub fn generate_key(&self) -> Result<Vec<u8>, JsValue> {
        let key_vec = crypto::generate_key();
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&key_vec);
        self.state.lock().encryption_key = Some(EncryptionKey::new(bytes));
        Ok(key_vec)
    }

    pub async fn set(&self, key: &str, value: JsValue, ttl_ms: Option<f64>) -> Result<(), JsValue> {
        validate_key(key)?;
        if let Some(ms) = ttl_ms
            && (!ms.is_finite() || ms <= 0.0)
        {
            return Err(JsValue::from_str("ttlMs must be a positive finite number"));
        }
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let json: String = js_sys::JSON::stringify(&value)?.into();
        let payload = match ttl_ms {
            Some(ms) => envelope::wrap(&json, ms),
            None => json,
        };
        let stored = self.encrypt_value(&payload)?;
        let db = self.db().await?;
        let needs_retry = match idb::raw_set(&db, &full_key, &stored).await {
            Ok(()) => false,
            // Quota hit: evict expired entries, retry once.
            Err(StorageError::QuotaExceeded) => true,
            Err(e) => return Err(e.into()),
        };
        if needs_retry {
            self.purge_expired().await?;
            idb::raw_set(&db, &full_key, &stored)
                .await
                .map_err(JsValue::from)?;
        }
        let guard = self.state.lock();
        let prefix = guard.prefix.clone();
        guard.sync.notify("set", &prefix, key);
        Ok(())
    }

    pub async fn get(&self, key: &str) -> Result<JsValue, JsValue> {
        validate_key(key)?;
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let db = self.db().await?;
        let Some(stored) = idb::raw_get(&db, &full_key).await.map_err(JsValue::from)? else {
            return Ok(JsValue::NULL);
        };
        let json = self.decrypt_value(&stored)?;
        let parsed = js_sys::JSON::parse(&json)?;
        match envelope::unwrap(parsed)? {
            envelope::Unwrapped::Value(value) => Ok(value),
            envelope::Unwrapped::Expired => {
                idb::raw_remove(&db, &[full_key])
                    .await
                    .map_err(JsValue::from)?;
                Ok(JsValue::NULL)
            }
        }
    }

    pub async fn remove(&self, key: &str) -> Result<(), JsValue> {
        validate_key(key)?;
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let db = self.db().await?;
        idb::raw_remove(&db, &[full_key])
            .await
            .map_err(JsValue::from)?;
        let guard = self.state.lock();
        let prefix = guard.prefix.clone();
        guard.sync.notify("remove", &prefix, key);
        Ok(())
    }

    pub async fn clear(&self) -> Result<(), JsValue> {
        let prefix = self.state.lock().prefix.clone();
        let db = self.db().await?;
        let keys = idb::raw_keys(&db).await.map_err(JsValue::from)?;
        let doomed: Vec<String> = keys
            .into_iter()
            .filter(|k| k.starts_with(&prefix))
            .collect();
        idb::raw_remove(&db, &doomed).await.map_err(JsValue::from)?;
        self.state.lock().sync.notify("clear", &prefix, "");
        Ok(())
    }

    pub async fn has(&self, key: &str) -> Result<bool, JsValue> {
        Ok(!self.get(key).await?.is_null())
    }

    pub async fn keys(&self) -> Result<JsValue, JsValue> {
        let prefix = self.state.lock().prefix.clone();
        let db = self.db().await?;
        let arr = js_sys::Array::new();
        for k in idb::raw_keys(&db).await.map_err(JsValue::from)? {
            if let Some(stripped) = k.strip_prefix(&prefix) {
                arr.push(&JsValue::from_str(stripped));
            }
        }
        Ok(arr.into())
    }

    pub async fn length(&self) -> Result<u32, JsValue> {
        let prefix = self.state.lock().prefix.clone();
        let db = self.db().await?;
        let count = idb::raw_keys(&db)
            .await
            .map_err(JsValue::from)?
            .into_iter()
            .filter(|k| k.starts_with(&prefix))
            .count();
        Ok(count as u32)
    }

    #[wasm_bindgen(js_name = "purgeExpired")]
    pub async fn purge_expired(&self) -> Result<(), JsValue> {
        let prefix = self.state.lock().prefix.clone();
        let db = self.db().await?;
        let raw = idb::raw_keys(&db).await.map_err(JsValue::from)?;
        let user_keys: Vec<String> = raw
            .into_iter()
            .filter_map(|k| k.strip_prefix(&prefix).map(String::from))
            .collect();
        for k in user_keys {
            self.get(&k).await?;
        }
        Ok(())
    }

    pub fn subscribe(&self, cb: js_sys::Function) -> Result<JsValue, JsValue> {
        let id = {
            let mut guard = self.state.lock();
            let prefix = guard.prefix.clone();
            guard.sync.subscribe(prefix, cb)?
        };
        let state = self.state.clone();
        Ok(Closure::once_into_js(move || {
            state.lock().sync.unsubscribe(id);
        }))
    }

    pub async fn mset(&self, entries: js_sys::Object, ttl_ms: Option<f64>) -> Result<(), JsValue> {
        let pairs = js_sys::Object::entries(&entries);
        for i in 0..pairs.length() {
            let pair: js_sys::Array = pairs.get(i).unchecked_into();
            let key = pair
                .get(0)
                .as_string()
                .ok_or_else(|| JsValue::from_str("mset keys must be strings"))?;
            self.set(&key, pair.get(1), ttl_ms).await?;
        }
        Ok(())
    }

    pub async fn mget(&self, keys: js_sys::Array) -> Result<JsValue, JsValue> {
        let result = js_sys::Object::new();
        for i in 0..keys.length() {
            let Some(key) = keys.get(i).as_string() else {
                return Err(JsValue::from_str("mget keys must be strings"));
            };
            validate_key(&key)?;
            let value = self.get(&key).await?;
            js_sys::Reflect::set(&result, &JsValue::from_str(&key), &value)?;
        }
        Ok(result.into())
    }

    #[wasm_bindgen(js_name = "setBytes")]
    pub async fn set_bytes(
        &self,
        key: &str,
        bytes: Vec<u8>,
        ttl_ms: Option<f64>,
    ) -> Result<(), JsValue> {
        validate_key(key)?;
        if let Some(ms) = ttl_ms
            && (!ms.is_finite() || ms <= 0.0)
        {
            return Err(JsValue::from_str("ttlMs must be a positive finite number"));
        }
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        let json = format!("{{\"__bin\":true,\"data\":\"{b64}\"}}");
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let payload = match ttl_ms {
            Some(ms) => envelope::wrap(&json, ms),
            None => json,
        };
        let stored = self.encrypt_value(&payload)?;
        let db = self.db().await?;
        let needs_retry = match idb::raw_set(&db, &full_key, &stored).await {
            Ok(()) => false,
            Err(StorageError::QuotaExceeded) => true,
            Err(e) => return Err(e.into()),
        };
        if needs_retry {
            self.purge_expired().await?;
            idb::raw_set(&db, &full_key, &stored)
                .await
                .map_err(JsValue::from)?;
        }
        let guard = self.state.lock();
        let prefix = guard.prefix.clone();
        guard.sync.notify("set", &prefix, key);
        Ok(())
    }

    #[wasm_bindgen(js_name = "getBytes")]
    pub async fn get_bytes(&self, key: &str) -> Result<Option<Vec<u8>>, JsValue> {
        validate_key(key)?;
        let val = self.get(key).await?;
        if val.is_null() || val.is_undefined() {
            return Ok(None);
        }
        let is_bin = js_sys::Reflect::get(&val, &JsValue::from_str("__bin"))?
            .as_bool()
            .unwrap_or(false);
        if !is_bin {
            return Err(JsValue::from_str("value is not binary data"));
        }
        let data = js_sys::Reflect::get(&val, &JsValue::from_str("data"))?
            .as_string()
            .ok_or_else(|| JsValue::from_str("invalid binary data"))?;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&data)
            .map_err(|e| JsValue::from_str(&format!("base64 decode: {e}")))?;
        Ok(Some(bytes))
    }
}
