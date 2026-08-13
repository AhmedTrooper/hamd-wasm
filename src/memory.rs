use std::collections::HashMap;

use crate::ops::{StorageError, StorageOps};

pub(crate) struct MemoryBackend {
    data: HashMap<String, String>,
}

impl MemoryBackend {
    pub(crate) fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }
}

impl StorageOps for MemoryBackend {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), StorageError> {
        self.data.insert(key.to_string(), value.to_string());
        Ok(())
    }

    fn raw_get(&self, key: &str) -> Result<Option<String>, StorageError> {
        Ok(self.data.get(key).cloned())
    }

    fn raw_remove(&mut self, key: &str) -> Result<(), StorageError> {
        self.data.remove(key);
        Ok(())
    }

    fn raw_keys(&self) -> Result<Vec<String>, StorageError> {
        Ok(self.data.keys().cloned().collect())
    }
}
