use wasm_bindgen::prelude::*;

pub(crate) enum Unwrapped {
    Value(JsValue),
    Expired,
}

pub(crate) fn wrap(json: &str, ttl_ms: f64) -> String {
    let expires_at = js_sys::Date::now() + ttl_ms;
    // Build envelope via JS object to avoid string interpolation fragility
    // and to correctly handle any JSON value (including primitives).
    let parsed = js_sys::JSON::parse(json).unwrap_or(JsValue::UNDEFINED);
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("__val"), &parsed).unwrap();
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("__exp"),
        &JsValue::from_f64(expires_at),
    )
    .unwrap();
    js_sys::JSON::stringify(&obj).unwrap().into()
}

pub(crate) fn unwrap(parsed: JsValue) -> Result<Unwrapped, JsValue> {
    if !parsed.is_object() {
        return Ok(Unwrapped::Value(parsed));
    }
    let exp = js_sys::Reflect::get(&parsed, &JsValue::from_str("__exp"))?;
    let Some(expires_at) = exp.as_f64() else {
        return Ok(Unwrapped::Value(parsed));
    };
    if js_sys::Date::now() > expires_at {
        return Ok(Unwrapped::Expired);
    }
    let value = js_sys::Reflect::get(&parsed, &JsValue::from_str("__val"))?;
    Ok(Unwrapped::Value(value))
}
