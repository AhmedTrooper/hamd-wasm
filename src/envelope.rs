use wasm_bindgen::prelude::*;

pub(crate) enum Unwrapped {
    Value(JsValue),
    Expired,
}

const ENVELOPE_MARKER: &str = "hamd:ttl:v1";

pub(crate) fn wrap(json: &str, ttl_ms: f64) -> Result<String, JsValue> {
    let expires_at = js_sys::Date::now() + ttl_ms;
    // Build envelope via JS object to avoid string interpolation fragility
    // and to correctly handle any JSON value (including primitives).
    let parsed = js_sys::JSON::parse(json)?;
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("__hamd"),
        &JsValue::from_str(ENVELOPE_MARKER),
    )?;
    js_sys::Reflect::set(&obj, &JsValue::from_str("__val"), &parsed)?;
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("__exp"),
        &JsValue::from_f64(expires_at),
    )?;
    Ok(js_sys::JSON::stringify(&obj)?.into())
}

pub(crate) fn unwrap(parsed: JsValue) -> Result<Unwrapped, JsValue> {
    if !parsed.is_object() {
        return Ok(Unwrapped::Value(parsed));
    }
    let exp = js_sys::Reflect::get(&parsed, &JsValue::from_str("__exp"))?;
    let Some(expires_at) = exp.as_f64() else {
        return Ok(Unwrapped::Value(parsed));
    };
    let marker = js_sys::Reflect::get(&parsed, &JsValue::from_str("__hamd"))?;
    if marker.as_string().as_deref() != Some(ENVELOPE_MARKER) {
        return Ok(Unwrapped::Value(parsed));
    }
    if js_sys::Date::now() > expires_at {
        return Ok(Unwrapped::Expired);
    }
    let value = js_sys::Reflect::get(&parsed, &JsValue::from_str("__val"))?;
    Ok(Unwrapped::Value(value))
}
