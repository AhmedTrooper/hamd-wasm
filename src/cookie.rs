use wasm_bindgen::JsCast;

use crate::ops::{StorageError, StorageOps};

pub(crate) struct CookieBackend;

impl CookieBackend {
    pub(crate) fn new() -> Self {
        Self
    }

    fn html_document() -> Result<web_sys::HtmlDocument, StorageError> {
        web_sys::window()
            .and_then(|w| w.document())
            .and_then(|d| d.dyn_into::<web_sys::HtmlDocument>().ok())
            .ok_or_else(|| StorageError::Other("no HtmlDocument".into()))
    }

    fn parse_cookies() -> Result<Vec<(String, String)>, StorageError> {
        let doc = Self::html_document()?;
        let cookie_str = doc
            .cookie()
            .map_err(|_| StorageError::Other("cookie read denied".into()))?;
        Ok(cookie_str
            .split(';')
            .filter_map(|pair| {
                let pair = pair.trim();
                let mut parts = pair.splitn(2, '=');
                let key = parts.next()?.to_string();
                let val = parts.next().unwrap_or("").to_string();
                if key.is_empty() {
                    None
                } else {
                    Some((key, val))
                }
            })
            .collect())
    }
}

impl StorageOps for CookieBackend {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), StorageError> {
        let doc = Self::html_document()?;
        let cookie = format!("{}={}; path=/; max-age=31536000; SameSite=Lax", key, value);
        doc.set_cookie(&cookie)
            .map_err(|_| StorageError::Other("cookie write denied".into()))
    }

    fn raw_get(&self, key: &str) -> Result<Option<String>, StorageError> {
        let cookies = Self::parse_cookies()?;
        Ok(cookies.into_iter().find(|(k, _)| k == key).map(|(_, v)| v))
    }

    fn raw_remove(&mut self, key: &str) -> Result<(), StorageError> {
        let doc = Self::html_document()?;
        let cookie = format!("{}=; path=/; max-age=0", key);
        doc.set_cookie(&cookie)
            .map_err(|_| StorageError::Other("cookie delete denied".into()))
    }

    fn raw_keys(&self) -> Result<Vec<String>, StorageError> {
        let cookies = Self::parse_cookies()?;
        Ok(cookies.into_iter().map(|(k, _)| k).collect())
    }
}
