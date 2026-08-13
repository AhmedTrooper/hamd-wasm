use std::collections::HashMap;

use crate::ops::StorageOps;

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
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), String> {
        self.data.insert(key.to_string(), value.to_string());
        Ok(())
    }

    fn raw_get(&self, key: &str) -> Result<Option<String>, String> {
        Ok(self.data.get(key).cloned())
    }

    fn raw_remove(&mut self, key: &str) -> Result<(), String> {
        self.data.remove(key);
        Ok(())
    }

    fn raw_keys(&self) -> Result<Vec<String>, String> {
        Ok(self.data.keys().cloned().collect())
    }
}
