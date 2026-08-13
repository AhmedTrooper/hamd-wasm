use wasm_bindgen::JsCast;

use crate::ops::StorageOps;

pub(crate) struct CookieBackend;

impl CookieBackend {
    pub(crate) fn new() -> Self {
        Self
    }

    fn html_document() -> Result<web_sys::HtmlDocument, String> {
        web_sys::window()
            .and_then(|w| w.document())
            .and_then(|d| d.dyn_into::<web_sys::HtmlDocument>().ok())
            .ok_or_else(|| "no HtmlDocument".to_string())
    }

    fn parse_cookies() -> Result<Vec<(String, String)>, String> {
        let doc = Self::html_document()?;
        let cookie_str = doc.cookie().map_err(|_| "cookie read denied".to_string())?;
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
    fn raw_set(&mut self, key: &str, value: &str) -> Result<(), String> {
        let doc = Self::html_document()?;
        let cookie = format!("{}={}; path=/; max-age=31536000; SameSite=Lax", key, value);
        doc.set_cookie(&cookie)
            .map_err(|_| "cookie write denied".to_string())
    }

    fn raw_get(&self, key: &str) -> Result<Option<String>, String> {
        let cookies = Self::parse_cookies()?;
        Ok(cookies.into_iter().find(|(k, _)| k == key).map(|(_, v)| v))
    }

    fn raw_remove(&mut self, key: &str) -> Result<(), String> {
        let doc = Self::html_document()?;
        let cookie = format!("{}=; path=/; max-age=0", key);
        doc.set_cookie(&cookie)
            .map_err(|_| "cookie delete denied".to_string())
    }

    fn raw_keys(&self) -> Result<Vec<String>, String> {
        let cookies = Self::parse_cookies()?;
        Ok(cookies.into_iter().map(|(k, _)| k).collect())
    }
}
