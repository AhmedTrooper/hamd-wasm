use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;

pub(crate) type Subscription = (u32, Closure<dyn FnMut(web_sys::MessageEvent)>);

pub(crate) struct SyncState {
    channel: Option<web_sys::BroadcastChannel>,
    subscriptions: Vec<Subscription>,
    next_id: u32,
}

impl SyncState {
    pub(crate) fn new(kind: &str) -> Self {
        let channel = web_sys::BroadcastChannel::new(&format!("hamd-sync-{kind}")).ok();
        Self {
            channel,
            subscriptions: Vec::new(),
            next_id: 0,
        }
    }

    pub(crate) fn notify(&self, action: &str, prefix: &str, key: &str) {
        let Some(channel) = &self.channel else {
            return;
        };
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
    }

    pub(crate) fn subscribe(
        &mut self,
        prefix: String,
        cb: js_sys::Function,
    ) -> Result<u32, JsValue> {
        let channel = self
            .channel
            .as_ref()
            .ok_or_else(|| JsValue::from_str("BroadcastChannel unavailable"))?;
        let id = self.next_id;
        self.next_id += 1;

        let closure = Closure::<dyn FnMut(web_sys::MessageEvent)>::new(
            move |event: web_sys::MessageEvent| {
                let data = event.data();
                let Ok(action) = js_sys::Reflect::get(&data, &JsValue::from_str("action")) else {
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
        channel.add_event_listener_with_callback("message", closure.as_ref().unchecked_ref())?;
        self.subscriptions.push((id, closure));
        Ok(id)
    }

    pub(crate) fn unsubscribe(&mut self, id: u32) {
        let Some(pos) = self.subscriptions.iter().position(|(i, _)| *i == id) else {
            return;
        };
        let (_, closure) = self.subscriptions.remove(pos);
        if let Some(channel) = &self.channel {
            let _ = channel
                .remove_event_listener_with_callback("message", closure.as_ref().unchecked_ref());
        }
    }
}
