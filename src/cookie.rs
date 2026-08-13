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
                if pair.is_empty() {
                    return None;
                }
                let mut parts = pair.splitn(2, '=');
                let raw_key = parts.next()?.trim();
                let raw_val = parts.next().unwrap_or("").trim();
                if raw_key.is_empty() {
                    return None;
                }
                // Keys and values are stored encoded; decode value on read.
                let val = js_sys::decode_uri_component(raw_val)
                    .ok()
                    .and_then(|v| v.as_string())
                    .unwrap_or_else(|| raw_val.to_string());
                Some((raw_key.to_string(), val))
            })
            .collect())
    }
}

impl StorageOps for CookieBackend {
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), StorageError> {
        let doc = Self::html_document()?;
        let encoded = js_sys::encode_uri_component(value);
        let encoded_str: String = encoded.as_string().unwrap_or_else(|| value.to_string());
        let secure = web_sys::window()
            .and_then(|w| w.location().protocol().ok())
            .is_some_and(|p| p == "https:");
        let mut cookie = format!(
            "{}={}; path=/; max-age=31536000; SameSite=Lax",
            key, encoded_str
        );
        if secure {
            cookie.push_str("; Secure");
        }
        // Browsers enforce the cookie limit on the serialized cookie, after encoding and
        // including attributes. Keep a small margin below the usual 4096-byte limit.
        if cookie.len() > 4_000 {
            return Err(StorageError::QuotaExceeded);
        }
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
