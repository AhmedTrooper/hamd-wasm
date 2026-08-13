use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

use crate::ops::{StorageError, StorageOps};

pub(crate) enum WebStorageKind {
    Local,
    Session,
}

pub(crate) struct WebBackend {
    kind: WebStorageKind,
}

impl WebBackend {
    pub(crate) fn local() -> Self {
        Self {
            kind: WebStorageKind::Local,
        }
    }

    pub(crate) fn session() -> Self {
        Self {
            kind: WebStorageKind::Session,
        }
    }

    fn resolve(&self) -> Result<web_sys::Storage, StorageError> {
        let window =
            web_sys::window().ok_or_else(|| StorageError::Other("no global window".into()))?;
        let storage = match self.kind {
            WebStorageKind::Local => window.local_storage(),
            WebStorageKind::Session => window.session_storage(),
        };
        storage
            .map_err(|_| StorageError::Other("storage access denied".into()))?
            .ok_or_else(|| StorageError::Other("storage unavailable".into()))
    }
}

fn quota_error(e: &JsValue) -> bool {
    e.dyn_ref::<web_sys::DomException>()
        .is_some_and(|dom| dom.name() == "QuotaExceededError" || dom.code() == 22)
}

impl StorageOps for WebBackend {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), StorageError> {
        self.resolve()?.set_item(key, value).map_err(|e| {
            if quota_error(&e) {
                StorageError::QuotaExceeded
            } else {
                StorageError::Other("write denied".into())
            }
        })
    }

    fn raw_get(&self, key: &str) -> Result<Option<String>, StorageError> {
        self.resolve()?
            .get_item(key)
            .map_err(|_| StorageError::Other("read denied".into()))
    }

    fn raw_remove(&mut self, key: &str) -> Result<(), StorageError> {
        self.resolve()?
            .remove_item(key)
            .map_err(|_| StorageError::Other("remove denied".into()))
    }

    fn raw_keys(&self) -> Result<Vec<String>, StorageError> {
        let storage = self.resolve()?;
        let len = storage
            .length()
            .map_err(|_| StorageError::Other("length failed".into()))?;
        let mut keys = Vec::with_capacity(len as usize);
        for i in 0..len {
            if let Some(k) = storage
                .key(i)
                .map_err(|_| StorageError::Other("key read failed".into()))?
            {
                keys.push(k);
            }
        }
        Ok(keys)
    }
}
