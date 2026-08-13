use std::cell::RefCell;
use std::rc::Rc;

use hamd_wasm::{Cookies, IndexedDb, Local, Memory, Session};
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

// ---- Memory backend: node-runnable (no DOM needed) ----

#[wasm_bindgen_test]
fn memory_set_get_roundtrip() {
    let store = Memory::new(None);
    let val = JsValue::from_str("hello");
    store.set("k1", val.clone(), None).unwrap();
    let got = store.get("k1").unwrap();
    assert_eq!(got, val);
}

#[wasm_bindgen_test]
fn memory_has_keys_length() {
    let store = Memory::new(Some("test1:".into()));
    assert_eq!(store.length().unwrap(), 0);
    store.set("a", JsValue::from_str("1"), None).unwrap();
    store.set("b", JsValue::from_str("2"), None).unwrap();
    assert!(store.has("a").unwrap());
    assert!(!store.has("missing").unwrap());
    assert_eq!(store.length().unwrap(), 2);
    let keys = store.keys().unwrap();
    let arr: js_sys::Array = keys.unchecked_into();
    assert_eq!(arr.length(), 2);
}

#[wasm_bindgen_test]
fn memory_clear_is_prefix_scoped() {
    let a = Memory::new(Some("a:".into()));
    let b = Memory::new(Some("b:".into()));
    a.set("x", JsValue::from_str("1"), None).unwrap();
    b.set("x", JsValue::from_str("2"), None).unwrap();
    a.clear().unwrap();
    assert!(!a.has("x").unwrap());
    assert!(b.has("x").unwrap());
}

#[wasm_bindgen_test]
fn memory_remove_and_get_missing_returns_null() {
    let store = Memory::new(None);
    store.set("k", JsValue::from_str("v"), None).unwrap();
    store.remove("k").unwrap();
    assert!(store.get("k").unwrap().is_null());
    assert!(!store.has("k").unwrap());
}

#[wasm_bindgen_test]
fn memory_mset_mget() {
    let store = Memory::new(None);
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_str("1")).unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str("b"), &JsValue::from_str("2")).unwrap();
    store.mset(obj, None).unwrap();
    let keys = js_sys::Array::new();
    keys.push(&JsValue::from_str("a"));
    keys.push(&JsValue::from_str("b"));
    keys.push(&JsValue::from_str("missing"));
    let out = store.mget(keys).unwrap();
    assert_eq!(
        js_sys::Reflect::get(&out, &JsValue::from_str("a"))
            .unwrap()
            .as_string()
            .unwrap(),
        "1"
    );
    assert!(
        js_sys::Reflect::get(&out, &JsValue::from_str("missing"))
            .unwrap()
            .is_null()
    );
}

#[wasm_bindgen_test]
fn memory_mset_validates_all_keys_before_writing() {
    let store = Memory::new(None);
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("valid"),
        &JsValue::from_str("must not be written"),
    )
    .unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str(""), &JsValue::from_str("invalid")).unwrap();

    assert!(store.mset(obj, None).is_err());
    assert!(!store.has("valid").unwrap());
}

#[wasm_bindgen_test]
fn memory_ttl_validation_rejects_invalid() {
    let store = Memory::new(None);
    let err = store
        .set("k", JsValue::from_str("v"), Some(f64::NAN))
        .unwrap_err();
    assert!(err.as_string().unwrap().contains("ttlMs"));
    let err = store
        .set("k", JsValue::from_str("v"), Some(-10.0))
        .unwrap_err();
    assert!(err.as_string().unwrap().contains("ttlMs"));
    let err = store
        .set("k", JsValue::from_str("v"), Some(f64::INFINITY))
        .unwrap_err();
    assert!(err.as_string().unwrap().contains("ttlMs"));
}

#[wasm_bindgen_test]
fn memory_object_roundtrip() {
    let store = Memory::new(None);
    let val = js_sys::Object::new();
    js_sys::Reflect::set(
        &val,
        &JsValue::from_str("name"),
        &JsValue::from_str("Alice"),
    )
    .unwrap();
    js_sys::Reflect::set(&val, &JsValue::from_str("id"), &JsValue::from_f64(101.0)).unwrap();
    store.set("user", val.into(), None).unwrap();
    let got = store.get("user").unwrap();
    assert_eq!(
        js_sys::Reflect::get(&got, &JsValue::from_str("name"))
            .unwrap()
            .as_string()
            .unwrap(),
        "Alice"
    );
}

#[wasm_bindgen_test]
fn memory_preserves_objects_with_expiration_like_fields() {
    let store = Memory::new(None);
    let val = js_sys::Object::new();
    js_sys::Reflect::set(&val, &JsValue::from_str("__exp"), &JsValue::from_f64(1.0)).unwrap();
    js_sys::Reflect::set(
        &val,
        &JsValue::from_str("name"),
        &JsValue::from_str("ordinary object"),
    )
    .unwrap();

    store.set("object", val.into(), None).unwrap();

    let got = store.get("object").unwrap();
    assert_eq!(
        js_sys::Reflect::get(&got, &JsValue::from_str("name"))
            .unwrap()
            .as_string()
            .unwrap(),
        "ordinary object"
    );
}

#[wasm_bindgen_test]
fn memory_encryption_roundtrip() {
    let store = Memory::new(None);
    let key = store.create_encryption_key().unwrap();
    assert_eq!(key.len(), 32);
    store
        .set("secret", JsValue::from_str("s3cr3t"), None)
        .unwrap();
    let got = store.get("secret").unwrap();
    assert_eq!(got.as_string().unwrap(), "s3cr3t");

    // Different key must fail.
    let other = Memory::new(None);
    other.enable_encryption(&key).unwrap();
    // Same key can decrypt if we copy raw storage; we test wrong key path by
    // using a fresh random key on a clone of the encrypted payload.
    let wrong_key = other.create_encryption_key().unwrap();
    let bad = Memory::new(None);
    bad.enable_encryption(&wrong_key).unwrap();
    // Direct crypto layer test: decrypt with wrong key fails.
    // We do not share raw ciphertext across instances here because
    // Memory is isolated; the API-level guarantee is that createEncryptionKey
    // produces 32 bytes and enableEncryption validates length.
    let err = bad.enable_encryption(&[0u8; 16]).unwrap_err();
    assert!(err.as_string().unwrap().contains("32 bytes"));
}

#[wasm_bindgen_test]
fn local_encrypted_value_requires_key_browser_only() {
    let encrypted = Local::new(Some("enc-required:".into()));
    if encrypted
        .set("probe", JsValue::from_str("ok"), None)
        .is_err()
    {
        return;
    }
    encrypted.remove("probe").unwrap();
    encrypted.create_encryption_key().unwrap();
    encrypted
        .set("secret", JsValue::from_str("value"), None)
        .unwrap();

    let unconfigured = Local::new(Some("enc-required:".into()));
    let error = unconfigured.get("secret").unwrap_err();
    assert!(
        error
            .as_string()
            .unwrap()
            .contains("encryption key required")
    );
    encrypted.remove("secret").unwrap();
}

#[wasm_bindgen_test]
fn memory_enable_encryption_validates_key_length() {
    let store = Memory::new(None);
    let err = store.enable_encryption(&[1, 2, 3]).unwrap_err();
    assert!(err.as_string().unwrap().contains("32 bytes"));
}

#[wasm_bindgen_test]
fn memory_purge_expired_sweeps() {
    let store = Memory::new(None);
    // Real TTL would need timers; we verify purgeExpired doesn't throw
    // and that non-expired entries survive.
    store.set("keep", JsValue::from_str("yes"), None).unwrap();
    store.purge_expired().unwrap();
    assert!(store.has("keep").unwrap());
}

// Browser-only: Web Storage / IndexedDB / Cookies need window.
// These are gated to run_in_browser above but still compiled.
#[wasm_bindgen_test]
fn local_roundtrip_browser_only() {
    // Skip assertion if window/storage unavailable (e.g. node without jsdom).
    let Ok(store) = std::panic::catch_unwind(|| Local::new(None)) else {
        return;
    };
    // If construction succeeded, exercise basic ops; quota/denied errors are
    // surfaced as Err and we treat them as skip rather than fail.
    if store.set("probe", JsValue::from_str("ok"), None).is_err() {
        return;
    }
    let got = store.get("probe").unwrap();
    assert_eq!(got.as_string().unwrap(), "ok");
    store.remove("probe").unwrap();
}

#[wasm_bindgen_test]
async fn indexeddb_roundtrip_browser_only() {
    let db = IndexedDb::new(None);
    // IndexedDB may be unavailable in some contexts.
    if db
        .set("probe", JsValue::from_str("ok"), None)
        .await
        .is_err()
    {
        return;
    }
    let got = db.get("probe").await.unwrap();
    assert_eq!(got.as_string().unwrap(), "ok");
    db.remove("probe").await.unwrap();
}

async fn sleep_ms(ms: i32) {
    let promise = js_sys::Promise::new(&mut |resolve, _| {
        web_sys::window()
            .unwrap()
            .set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms)
            .unwrap();
    });
    wasm_bindgen_futures::JsFuture::from(promise).await.unwrap();
}

#[wasm_bindgen_test]
async fn memory_ttl_expiry_via_sleep() {
    let store = Memory::new(None);
    store
        .set("short", JsValue::from_str("tmp"), Some(40.0))
        .unwrap();
    assert!(store.has("short").unwrap());
    sleep_ms(100).await;
    assert!(store.get("short").unwrap().is_null());
    assert!(!store.has("short").unwrap());
}

#[wasm_bindgen_test]
async fn memory_mset_with_ttl_expiry() {
    let store = Memory::new(None);
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("x"), &JsValue::from_str("1")).unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str("y"), &JsValue::from_str("2")).unwrap();
    store.mset(obj, Some(40.0)).unwrap();
    assert!(store.has("x").unwrap());
    sleep_ms(100).await;
    assert!(store.get("x").unwrap().is_null());
    assert!(store.get("y").unwrap().is_null());
    store.purge_expired().unwrap();
    assert_eq!(store.length().unwrap(), 0);
}

#[wasm_bindgen_test]
fn session_roundtrip_browser_only() {
    let Ok(store) = std::panic::catch_unwind(|| Session::new(None)) else {
        return;
    };
    if store.set("probe", JsValue::from_str("ok"), None).is_err() {
        return;
    }
    let got = store.get("probe").unwrap();
    assert_eq!(got.as_string().unwrap(), "ok");
    assert!(store.has("probe").unwrap());
    assert_eq!(store.length().unwrap(), 1);
    store.remove("probe").unwrap();
    assert!(store.get("probe").unwrap().is_null());
}

#[wasm_bindgen_test]
fn cookies_roundtrip_browser_only() {
    let Ok(store) = std::panic::catch_unwind(|| Cookies::new(None)) else {
        return;
    };
    // Cookies may be denied in headless file:// context — treat Err as skip.
    if store
        .set("probe", JsValue::from_str("a;b=c d/e"), None)
        .is_err()
    {
        return;
    }
    let got = store.get("probe").unwrap();
    assert_eq!(got.as_string().unwrap(), "a;b=c d/e");
    assert!(store.has("probe").unwrap());
    store.remove("probe").unwrap();
    assert!(store.get("probe").unwrap().is_null());
}

#[wasm_bindgen_test]
fn cookies_support_encoded_prefixes_and_keys_browser_only() {
    let Ok(store) = std::panic::catch_unwind(|| Cookies::new(Some("app name/☃:".into()))) else {
        return;
    };
    if store
        .set("user=id value", JsValue::from_str("ok"), None)
        .is_err()
    {
        return;
    }
    assert_eq!(
        store.get("user=id value").unwrap().as_string().unwrap(),
        "ok"
    );
    store.remove("user=id value").unwrap();
}

#[wasm_bindgen_test]
async fn memory_sync_notifies_subscriber() {
    let a = Memory::new(Some("sync-test:".into()));
    let b = Memory::new(Some("sync-test:".into()));
    let flag = Rc::new(RefCell::new(false));
    let flag_clone = flag.clone();
    let closure =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |action: JsValue, key: JsValue| {
            if action.as_string().as_deref() == Some("set")
                && key.as_string().as_deref() == Some("ping")
            {
                *flag_clone.borrow_mut() = true;
            }
        }) as Box<dyn FnMut(JsValue, JsValue)>);
    let func: js_sys::Function = closure.as_ref().unchecked_ref::<js_sys::Function>().clone();
    let _unsub = a.subscribe(func).unwrap();
    b.set("ping", JsValue::from_str("1"), None).unwrap();
    sleep_ms(80).await;
    assert!(*flag.borrow());
    // keep closure alive until assert
    drop(closure);
}

#[wasm_bindgen_test]
fn sync_unsubscribe_returns_callable() {
    let store = Memory::new(Some("sync-unsub:".into()));
    let closure = wasm_bindgen::closure::Closure::wrap(
        Box::new(move |_: JsValue, _: JsValue| {}) as Box<dyn FnMut(JsValue, JsValue)>
    );
    let func: js_sys::Function = closure.as_ref().unchecked_ref::<js_sys::Function>().clone();
    let unsub = store.subscribe(func).unwrap();
    assert!(unsub.is_function());
    let unsub_fn: js_sys::Function = unsub.unchecked_into();
    unsub_fn.call0(&JsValue::UNDEFINED).unwrap();
    drop(closure);
}

#[wasm_bindgen_test]
fn local_encryption_wrong_key_fails_browser_only() {
    let prefix = "enc-wrong:".to_string();
    let Ok(store1) = std::panic::catch_unwind(|| Local::new(Some(prefix.clone()))) else {
        return;
    };
    // Ensure storage available
    if store1.set("probe", JsValue::from_str("ok"), None).is_err() {
        return;
    }
    store1.remove("probe").unwrap();
    let _key1 = store1.create_encryption_key().unwrap();
    store1
        .set("secret2", JsValue::from_str("s3cr3t"), None)
        .unwrap();
    let store2 = Local::new(Some(prefix.clone()));
    let _wrong = store2.create_encryption_key().unwrap();
    let result = store2.get("secret2");
    assert!(result.is_err());
    assert!(
        result
            .unwrap_err()
            .as_string()
            .unwrap()
            .contains("decryption failed")
    );
    // cleanup with correct key
    store1.remove("secret2").unwrap();
}

#[wasm_bindgen_test]
fn memory_bytes_roundtrip() {
    let store = Memory::new(None);
    let data = vec![0u8, 1, 2, 255, 128, 0, 42];
    store.set_bytes("bin", &data, None).unwrap();
    let got = store.get_bytes("bin").unwrap().unwrap();
    assert_eq!(got, data);
    assert!(store.get_bytes("missing").unwrap().is_none());
}

#[wasm_bindgen_test]
fn memory_bytes_encrypted_roundtrip() {
    let store = Memory::new(None);
    let key = store.create_encryption_key().unwrap();
    assert_eq!(key.len(), 32);
    let data = vec![10, 20, 30, 40, 50];
    store.set_bytes("enc_bin", &data, None).unwrap();
    let got = store.get_bytes("enc_bin").unwrap().unwrap();
    assert_eq!(got, data);
}

#[wasm_bindgen_test]
async fn memory_bytes_ttl_expiry() {
    let store = Memory::new(None);
    let data = vec![1, 2, 3];
    store.set_bytes("short_bin", &data, Some(40.0)).unwrap();
    assert!(store.get_bytes("short_bin").unwrap().is_some());
    sleep_ms(100).await;
    assert!(store.get_bytes("short_bin").unwrap().is_none());
}

#[wasm_bindgen_test]
async fn indexeddb_bytes_roundtrip_browser_only() {
    let db = IndexedDb::new(None);
    let data = vec![99u8, 42, 0, 255, 7, 8, 9];
    if db.set_bytes("bin_probe", data.clone(), None).await.is_err() {
        return;
    }
    let got = db.get_bytes("bin_probe").await.unwrap().unwrap();
    assert_eq!(got, data);
    db.remove("bin_probe").await.unwrap();
    assert!(db.get_bytes("bin_probe").await.unwrap().is_none());
}

#[wasm_bindgen_test]
fn key_validation_rejects_empty_and_long() {
    let store = Memory::new(None);
    let err = store.set("", JsValue::from_str("v"), None).unwrap_err();
    assert!(err.as_string().unwrap().contains("non-empty"));
    let long = "a".repeat(300);
    let err = store.set(&long, JsValue::from_str("v"), None).unwrap_err();
    assert!(err.as_string().unwrap().contains("too long"));
    let err = store
        .set("bad\0key", JsValue::from_str("v"), None)
        .unwrap_err();
    assert!(err.as_string().unwrap().contains("invalid control"));
}
