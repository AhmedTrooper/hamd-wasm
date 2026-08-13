mod cookie;
mod crypto;
mod memory;
mod ops;
mod web;

use std::sync::Arc;

use parking_lot::Mutex;
use wasm_bindgen::prelude::*;

use crate::crypto::EncryptionKey;
use crate::ops::StorageOps;

macro_rules! impl_storage {
    ($Name:ident, $InnerName:ident, $Backend:ty, $backend_init:expr) => {
        struct $InnerName {
            backend: $Backend,
            prefix: String,
            encryption_key: Option<EncryptionKey>,
        }

        #[wasm_bindgen]
        #[derive(Clone)]
        pub struct $Name {
            state: Arc<Mutex<$InnerName>>,
        }

        #[wasm_bindgen]
        impl $Name {
            #[wasm_bindgen(constructor)]
            pub fn new(prefix: Option<String>) -> Self {
                Self {
                    state: Arc::new(Mutex::new($InnerName {
                        backend: $backend_init,
                        prefix: prefix.unwrap_or_else(|| "hamd:".into()),
                        encryption_key: None,
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

            pub fn set(&self, key: &str, value: JsValue) -> Result<(), JsValue> {
                let mut guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);
                let json: String = js_sys::JSON::stringify(&value)?.into();

                let stored = match &guard.encryption_key {
                    Some(ek) => crypto::encrypt(ek.bytes(), json.as_bytes())
                        .map_err(|e| JsValue::from_str(&e))?,
                    None => json,
                };

                guard
                    .backend
                    .raw_set(&full_key, &stored)
                    .map_err(|e| JsValue::from_str(&e))
            }

            pub fn get(&self, key: &str) -> Result<JsValue, JsValue> {
                let guard = self.state.lock();
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
                        js_sys::JSON::parse(&json)
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
                    .map_err(|e| JsValue::from_str(&e))
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
                Ok(())
            }

            pub fn has(&self, key: &str) -> Result<bool, JsValue> {
                let guard = self.state.lock();
                let full_key = format!("{}{}", guard.prefix, key);
                guard
                    .backend
                    .raw_get(&full_key)
                    .map(|v| v.is_some())
                    .map_err(|e| JsValue::from_str(&e))
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
        }
    };
}

impl_storage!(Local, LocalInner, web::WebBackend, web::WebBackend::local());
impl_storage!(
    Session,
    SessionInner,
    web::WebBackend,
    web::WebBackend::session()
);
impl_storage!(
    Memory,
    MemoryInner,
    memory::MemoryBackend,
    memory::MemoryBackend::new()
);
impl_storage!(
    Cookies,
    CookiesInner,
    cookie::CookieBackend,
    cookie::CookieBackend::new()
);
