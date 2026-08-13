use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;

use crate::ops::StorageError;

const DB_NAME: &str = "hamd";
const DB_VERSION: u32 = 1;
const STORE_NAME: &str = "kv";

pub(crate) struct IdbBackend {
    db: Option<web_sys::IdbDatabase>,
}

impl IdbBackend {
    pub(crate) fn new() -> Self {
        Self { db: None }
    }

    pub(crate) fn cached_db(&self) -> Option<web_sys::IdbDatabase> {
        self.db.clone()
    }

    pub(crate) fn set_cached_db(&mut self, db: web_sys::IdbDatabase) {
        self.db = Some(db);
    }
}

pub(crate) async fn open_db() -> Result<web_sys::IdbDatabase, String> {
    let factory = web_sys::window()
        .ok_or_else(|| "no global window".to_string())?
        .indexed_db()
        .map_err(js_err)?
        .ok_or_else(|| "indexedDB unavailable".to_string())?;

    let open_req = factory.open_with_u32(DB_NAME, DB_VERSION).map_err(js_err)?;

    let upgrade = Closure::once(move |event: web_sys::Event| {
        let Some(target) = event.target() else {
            return;
        };
        let Ok(req) = target.dyn_into::<web_sys::IdbOpenDbRequest>() else {
            return;
        };
        let Ok(result) = req.result() else {
            return;
        };
        let db: web_sys::IdbDatabase = result.unchecked_into();
        if db.object_store_names().length() == 0 {
            let _ = db.create_object_store(STORE_NAME);
        }
    });
    open_req.set_onupgradeneeded(Some(upgrade.as_ref().unchecked_ref()));

    let result = JsFuture::from(request_promise(&open_req)).await;
    open_req.set_onupgradeneeded(None);
    drop(upgrade);
    Ok(result.map_err(js_err)?.unchecked_into())
}

pub(crate) async fn raw_set(
    db: &web_sys::IdbDatabase,
    key: &str,
    value: &str,
) -> Result<(), StorageError> {
    let store = store_with_mode(db, web_sys::IdbTransactionMode::Readwrite)?;
    let req = store
        .put_with_key(&JsValue::from_str(value), &JsValue::from_str(key))
        .map_err(idb_err)?;
    JsFuture::from(request_promise(&req))
        .await
        .map_err(idb_err)?;
    Ok(())
}

pub(crate) async fn raw_get(
    db: &web_sys::IdbDatabase,
    key: &str,
) -> Result<Option<String>, StorageError> {
    let store = store_with_mode(db, web_sys::IdbTransactionMode::Readonly)?;
    let req = store.get(&JsValue::from_str(key)).map_err(idb_err)?;
    let result = JsFuture::from(request_promise(&req))
        .await
        .map_err(idb_err)?;
    Ok(result.as_string())
}

pub(crate) async fn raw_remove(
    db: &web_sys::IdbDatabase,
    keys: &[String],
) -> Result<(), StorageError> {
    if keys.is_empty() {
        return Ok(());
    }
    let store = store_with_mode(db, web_sys::IdbTransactionMode::Readwrite)?;
    for key in keys {
        let req = store.delete(&JsValue::from_str(key)).map_err(idb_err)?;
        JsFuture::from(request_promise(&req))
            .await
            .map_err(idb_err)?;
    }
    Ok(())
}

pub(crate) async fn raw_keys(db: &web_sys::IdbDatabase) -> Result<Vec<String>, StorageError> {
    let store = store_with_mode(db, web_sys::IdbTransactionMode::Readonly)?;
    let req = store.get_all_keys().map_err(idb_err)?;
    let result = JsFuture::from(request_promise(&req))
        .await
        .map_err(idb_err)?;
    let array: js_sys::Array = result.unchecked_into();
    let mut keys = Vec::with_capacity(array.length() as usize);
    for i in 0..array.length() {
        if let Some(key) = array.get(i).as_string() {
            keys.push(key);
        }
    }
    Ok(keys)
}

fn store_with_mode(
    db: &web_sys::IdbDatabase,
    mode: web_sys::IdbTransactionMode,
) -> Result<web_sys::IdbObjectStore, StorageError> {
    let tx = db
        .transaction_with_str_and_mode(STORE_NAME, mode)
        .map_err(idb_err)?;
    tx.object_store(STORE_NAME).map_err(idb_err)
}

fn request_promise(req: &web_sys::IdbRequest) -> js_sys::Promise {
    type Handlers = (Closure<dyn FnMut()>, Closure<dyn FnMut()>);
    let slot: Rc<RefCell<Option<Handlers>>> = Rc::new(RefCell::new(None));

    js_sys::Promise::new(&mut |resolve, reject| {
        let req_ok = req.clone();
        let resolve = resolve.clone();
        let slot_ok = slot.clone();
        let onsuccess = Closure::once(move || {
            let result = req_ok.result().unwrap_or(JsValue::UNDEFINED);
            req_ok.set_onsuccess(None);
            req_ok.set_onerror(None);
            drop(slot_ok.borrow_mut().take());
            let _ = resolve.call1(&JsValue::UNDEFINED, &result);
        });

        let req_err = req.clone();
        let reject = reject.clone();
        let slot_err = slot.clone();
        let onerror = Closure::once(move || {
            let error = req_err
                .error()
                .ok()
                .flatten()
                .map(JsValue::from)
                .unwrap_or_else(|| JsValue::from_str("indexedDB request failed"));
            req_err.set_onsuccess(None);
            req_err.set_onerror(None);
            drop(slot_err.borrow_mut().take());
            let _ = reject.call1(&JsValue::UNDEFINED, &error);
        });

        req.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
        req.set_onerror(Some(onerror.as_ref().unchecked_ref()));
        *slot.borrow_mut() = Some((onsuccess, onerror));
    })
}

fn idb_err(e: JsValue) -> StorageError {
    if e.dyn_ref::<web_sys::DomException>()
        .is_some_and(|dom| dom.name() == "QuotaExceededError" || dom.code() == 22)
    {
        return StorageError::QuotaExceeded;
    }
    StorageError::Other(js_err(e))
}

fn js_err(e: JsValue) -> String {
    if let Some(err) = e.dyn_ref::<js_sys::Error>() {
        return err.message().into();
    }
    format!("{e:?}")
}
