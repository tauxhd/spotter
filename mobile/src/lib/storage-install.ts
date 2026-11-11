// On the phone, give the app a `localStorage` (backed by SQLite) for the Supabase session and the in-progress workout.
import 'expo-sqlite/localStorage/install';

// three.js's glTF loader decodes the model's JSON header with TextDecoder; add a UTF-8 one if the engine lacks it.
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as unknown as { TextDecoder: unknown }).TextDecoder = class {
    decode(input?: ArrayBufferView | ArrayBuffer) {
      if (!input) return '';
      const b = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      let out = '';
      for (let i = 0; i < b.length;) {
        const c = b[i++];
        const cp = c < 0x80 ? c : c < 0xe0 ? ((c & 0x1f) << 6) | (b[i++] & 0x3f) : c < 0xf0 ? ((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f)
          : ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
        out += String.fromCodePoint(cp);
      }
      return out;
    }
  };
}
