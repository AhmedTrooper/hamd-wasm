use wasm_bindgen::JsValue;

pub(crate) enum StorageError {
    QuotaExceeded,
    Other(String),
}

impl From<StorageError> for JsValue {
    fn from(e: StorageError) -> JsValue {
        match e {
            StorageError::QuotaExceeded => {
                JsValue::from_str("quota exceeded after evicting expired entries")
            }
            StorageError::Other(msg) => JsValue::from_str(&msg),
        }
    }
}

pub(crate) trait StorageOps {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), StorageError>;
    fn raw_get(&self, key: &str) -> Result<Option<String>, StorageError>;
    fn raw_remove(&mut self, key: &str) -> Result<(), StorageError>;
    fn raw_keys(&self) -> Result<Vec<String>, StorageError>;
}
