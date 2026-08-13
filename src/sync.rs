use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;

pub(crate) type Subscription = (u32, Closure<dyn FnMut(web_sys::MessageEvent)>);

#[allow(clippy::type_complexity)]
pub(crate) struct SyncState {
    channel: Option<web_sys::BroadcastChannel>,
    kind: String,
    subscriptions: Vec<Subscription>,
    storage_subscriptions: Vec<(u32, Closure<dyn FnMut(web_sys::Event)>)>,
    next_id: u32,
}

impl SyncState {
    pub(crate) fn new(kind: &str) -> Self {
        let channel = web_sys::BroadcastChannel::new(&format!("hamd-sync-{kind}")).ok();
        Self {
            channel,
            kind: kind.to_string(),
            subscriptions: Vec::new(),
            storage_subscriptions: Vec::new(),
            next_id: 0,
        }
    }

    pub(crate) fn notify(&self, action: &str, prefix: &str, key: &str) {
        if let Some(channel) = &self.channel {
            let msg = js_sys::Object::new();
            let _ = js_sys::Reflect::set(
                &msg,
                &JsValue::from_str("action"),
                &JsValue::from_str(action),
            );
            let _ = js_sys::Reflect::set(
                &msg,
                &JsValue::from_str("prefix"),
                &JsValue::from_str(prefix),
            );
            let _ = js_sys::Reflect::set(&msg, &JsValue::from_str("key"), &JsValue::from_str(key));
            let _ = channel.post_message(&msg);
            return;
        }
        // Fallback for environments without BroadcastChannel (e.g. older Safari)
        // Use storage event on localStorage for local/session kinds.
        if (self.kind == "local" || self.kind == "session")
            && let Some(window) = web_sys::window()
            && let Ok(Some(storage)) = window.local_storage()
        {
            let payload = format!(
                "{{\"action\":\"{action}\",\"prefix\":\"{prefix}\",\"key\":\"{key}\",\"ts\":{}}}",
                js_sys::Date::now()
            );
            let sync_key = format!("__hamd_sync_{}", self.kind);
            let _ = storage.set_item(&sync_key, &payload);
        }
    }

    pub(crate) fn subscribe(
        &mut self,
        prefix: String,
        cb: js_sys::Function,
    ) -> Result<u32, JsValue> {
        let id = self.next_id;
        self.next_id += 1;
        if let Some(channel) = &self.channel {
            let closure = Closure::<dyn FnMut(web_sys::MessageEvent)>::new(
                move |event: web_sys::MessageEvent| {
                    let data = event.data();
                    let Ok(action) = js_sys::Reflect::get(&data, &JsValue::from_str("action"))
                    else {
                        return;
                    };
                    let Ok(msg_prefix) = js_sys::Reflect::get(&data, &JsValue::from_str("prefix"))
                    else {
                        return;
                    };
                    let Ok(key) = js_sys::Reflect::get(&data, &JsValue::from_str("key")) else {
                        return;
                    };
                    let Some(action) = action.as_string() else {
                        return;
                    };
                    let Some(msg_prefix) = msg_prefix.as_string() else {
                        return;
                    };
                    if msg_prefix != prefix {
                        return;
                    }
                    let key = key.as_string().unwrap_or_default();
                    let _ = cb.call2(
                        &JsValue::UNDEFINED,
                        &JsValue::from_str(&action),
                        &JsValue::from_str(&key),
                    );
                },
            );
            channel
                .add_event_listener_with_callback("message", closure.as_ref().unchecked_ref())?;
            self.subscriptions.push((id, closure));
            return Ok(id);
        }
        // Fallback via storage event for local/session when BroadcastChannel unavailable
        if (self.kind == "local" || self.kind == "session")
            && let Some(window) = web_sys::window()
        {
            let sync_key = format!("__hamd_sync_{}", self.kind);
            let cb_clone = cb.clone();
            let prefix_clone = prefix.clone();
            let closure =
                Closure::<dyn FnMut(web_sys::Event)>::new(move |event: web_sys::Event| {
                    let storage_event: web_sys::StorageEvent = event.unchecked_into();
                    if storage_event.key().as_deref() != Some(&sync_key) {
                        return;
                    }
                    let Some(new_val) = storage_event.new_value() else {
                        return;
                    };
                    let Ok(parsed) = js_sys::JSON::parse(&new_val) else {
                        return;
                    };
                    let Ok(action) = js_sys::Reflect::get(&parsed, &JsValue::from_str("action"))
                    else {
                        return;
                    };
                    let Ok(msg_prefix) =
                        js_sys::Reflect::get(&parsed, &JsValue::from_str("prefix"))
                    else {
                        return;
                    };
                    let Ok(key) = js_sys::Reflect::get(&parsed, &JsValue::from_str("key")) else {
                        return;
                    };
                    let Some(action) = action.as_string() else {
                        return;
                    };
                    let Some(msg_prefix) = msg_prefix.as_string() else {
                        return;
                    };
                    if msg_prefix != prefix_clone {
                        return;
                    }
                    let key = key.as_string().unwrap_or_default();
                    let _ = cb_clone.call2(
                        &JsValue::UNDEFINED,
                        &JsValue::from_str(&action),
                        &JsValue::from_str(&key),
                    );
                });
            window.add_event_listener_with_callback("storage", closure.as_ref().unchecked_ref())?;
            self.storage_subscriptions.push((id, closure));
            return Ok(id);
        }
        Err(JsValue::from_str("BroadcastChannel unavailable"))
    }

    pub(crate) fn unsubscribe(&mut self, id: u32) {
        if let Some(pos) = self.subscriptions.iter().position(|(i, _)| *i == id) {
            let (_, closure) = self.subscriptions.remove(pos);
            if let Some(channel) = &self.channel {
                let _ = channel.remove_event_listener_with_callback(
                    "message",
                    closure.as_ref().unchecked_ref(),
                );
            }
            return;
        }
        if let Some(pos) = self
            .storage_subscriptions
            .iter()
            .position(|(i, _)| *i == id)
        {
            let (_, closure) = self.storage_subscriptions.remove(pos);
            if let Some(window) = web_sys::window() {
                let _ = window.remove_event_listener_with_callback(
                    "storage",
                    closure.as_ref().unchecked_ref(),
                );
            }
        }
    }
}
