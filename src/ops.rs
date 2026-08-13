pub(crate) trait StorageOps {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), String>;
    fn raw_get(&self, key: &str) -> Result<Option<String>, String>;
    fn raw_remove(&mut self, key: &str) -> Result<(), String>;
    fn raw_keys(&self) -> Result<Vec<String>, String>;
}
