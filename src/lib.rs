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
use wasm_bindgen::prelude::*;

use crate::crypto::EncryptionKey;
use crate::ops::StorageOps;

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
                let mut guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);
                let json: String = js_sys::JSON::stringify(&value)?.into();
                let payload = match ttl_ms {
                    Some(ms) => envelope::wrap(&json, ms),
                    None => json,
                };

                let stored = match &guard.encryption_key {
                    Some(ek) => crypto::encrypt(ek.bytes(), payload.as_bytes())
                        .map_err(|e| JsValue::from_str(&e))?,
                    None => payload,
                };

                guard
                    .backend
                    .raw_set(&full_key, &stored)
                    .map_err(|e| JsValue::from_str(&e))?;
                let prefix = guard.prefix.clone();
                guard.sync.notify("set", &prefix, key);
                Ok(())
            }

            pub fn get(&self, key: &str) -> Result<JsValue, JsValue> {
                let mut guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);

                match guard
                    .backend
                    .raw_get(&full_key)
                    .map_err(|e| JsValue::from_str(&e))?
                {
                    Some(raw) => {
                        let json = match &guard.encryption_key {
                            Some(ek) => crypto::decrypt(ek.bytes(), &raw)
                                .map_err(|e| JsValue::from_str(&e))?,
                            None => raw,
                        };
                        let parsed = js_sys::JSON::parse(&json)?;
                        match envelope::unwrap(parsed)? {
                            envelope::Unwrapped::Value(value) => Ok(value),
                            envelope::Unwrapped::Expired => {
                                guard
                                    .backend
                                    .raw_remove(&full_key)
                                    .map_err(|e| JsValue::from_str(&e))?;
                                Ok(JsValue::NULL)
                            }
                        }
                    }
                    None => Ok(JsValue::NULL),
                }
            }

            pub fn remove(&self, key: &str) -> Result<(), JsValue> {
                let mut guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);
                guard
                    .backend
                    .raw_remove(&full_key)
                    .map_err(|e| JsValue::from_str(&e))?;
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
                    .map_err(|e| JsValue::from_str(&e))?
                    .into_iter()
                    .filter(|k| k.starts_with(&prefix))
                    .collect();

                for k in &keys {
                    guard
                        .backend
                        .raw_remove(k)
                        .map_err(|e| JsValue::from_str(&e))?;
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

                for k in guard
                    .backend
                    .raw_keys()
                    .map_err(|e| JsValue::from_str(&e))?
                {
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
                    .map_err(|e| JsValue::from_str(&e))?
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
                        .map_err(|e| JsValue::from_str(&e))?
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
        let db = idb::open_db().await.map_err(|e| JsValue::from_str(&e))?;
        self.state.lock().backend.set_cached_db(db.clone());
        Ok(db)
    }

    fn encrypt_value(&self, json: &str) -> Result<String, JsValue> {
        match &self.state.lock().encryption_key {
            Some(ek) => {
                crypto::encrypt(ek.bytes(), json.as_bytes()).map_err(|e| JsValue::from_str(&e))
            }
            None => Ok(json.to_string()),
        }
    }

    fn decrypt_value(&self, stored: &str) -> Result<String, JsValue> {
        match &self.state.lock().encryption_key {
            Some(ek) => crypto::decrypt(ek.bytes(), stored).map_err(|e| JsValue::from_str(&e)),
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
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let json: String = js_sys::JSON::stringify(&value)?.into();
        let payload = match ttl_ms {
            Some(ms) => envelope::wrap(&json, ms),
            None => json,
        };
        let stored = self.encrypt_value(&payload)?;
        let db = self.db().await?;
        idb::raw_set(&db, &full_key, &stored)
            .await
            .map_err(|e| JsValue::from_str(&e))?;
        let guard = self.state.lock();
        let prefix = guard.prefix.clone();
        guard.sync.notify("set", &prefix, key);
        Ok(())
    }

    pub async fn get(&self, key: &str) -> Result<JsValue, JsValue> {
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let db = self.db().await?;
        let Some(stored) = idb::raw_get(&db, &full_key)
            .await
            .map_err(|e| JsValue::from_str(&e))?
        else {
            return Ok(JsValue::NULL);
        };
        let json = self.decrypt_value(&stored)?;
        let parsed = js_sys::JSON::parse(&json)?;
        match envelope::unwrap(parsed)? {
            envelope::Unwrapped::Value(value) => Ok(value),
            envelope::Unwrapped::Expired => {
                idb::raw_remove(&db, &[full_key])
                    .await
                    .map_err(|e| JsValue::from_str(&e))?;
                Ok(JsValue::NULL)
            }
        }
    }

    pub async fn remove(&self, key: &str) -> Result<(), JsValue> {
        let full_key = format!("{}{}", self.state.lock().prefix, key);
        let db = self.db().await?;
        idb::raw_remove(&db, &[full_key])
            .await
            .map_err(|e| JsValue::from_str(&e))?;
        let guard = self.state.lock();
        let prefix = guard.prefix.clone();
        guard.sync.notify("remove", &prefix, key);
        Ok(())
    }

    pub async fn clear(&self) -> Result<(), JsValue> {
        let prefix = self.state.lock().prefix.clone();
        let db = self.db().await?;
        let keys = idb::raw_keys(&db)
            .await
            .map_err(|e| JsValue::from_str(&e))?;
        let doomed: Vec<String> = keys
            .into_iter()
            .filter(|k| k.starts_with(&prefix))
            .collect();
        idb::raw_remove(&db, &doomed)
            .await
            .map_err(|e| JsValue::from_str(&e))?;
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
        for k in idb::raw_keys(&db)
            .await
            .map_err(|e| JsValue::from_str(&e))?
        {
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
            .map_err(|e| JsValue::from_str(&e))?
            .into_iter()
            .filter(|k| k.starts_with(&prefix))
            .count();
        Ok(count as u32)
    }

    #[wasm_bindgen(js_name = "purgeExpired")]
    pub async fn purge_expired(&self) -> Result<(), JsValue> {
        let prefix = self.state.lock().prefix.clone();
        let db = self.db().await?;
        let raw = idb::raw_keys(&db)
            .await
            .map_err(|e| JsValue::from_str(&e))?;
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
}
