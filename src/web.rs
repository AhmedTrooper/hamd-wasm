use crate::ops::StorageOps;

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

    fn resolve(&self) -> Result<web_sys::Storage, String> {
        let window = web_sys::window().ok_or("no global window")?;
        let storage = match self.kind {
            WebStorageKind::Local => window.local_storage(),
            WebStorageKind::Session => window.session_storage(),
        };
        storage
            .map_err(|_| "storage access denied".to_string())?
            .ok_or_else(|| "storage unavailable".to_string())
    }
}

impl StorageOps for WebBackend {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), String> {
        self.resolve()?
            .set_item(key, value)
            .map_err(|_| "quota exceeded or write denied".to_string())
    }

    fn raw_get(&self, key: &str) -> Result<Option<String>, String> {
        self.resolve()?
            .get_item(key)
            .map_err(|_| "read denied".to_string())
    }

    fn raw_remove(&mut self, key: &str) -> Result<(), String> {
        self.resolve()?
            .remove_item(key)
            .map_err(|_| "remove denied".to_string())
    }

    fn raw_keys(&self) -> Result<Vec<String>, String> {
        let storage = self.resolve()?;
        let len = storage.length().map_err(|_| "length failed".to_string())?;
        let mut keys = Vec::with_capacity(len as usize);
        for i in 0..len {
            if let Some(k) = storage.key(i).map_err(|_| "key read failed".to_string())? {
                keys.push(k);
            }
        }
        Ok(keys)
    }
}
