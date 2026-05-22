/**
 * Descifrado de cadenas de nivel GD (Windows: XOR 11 → Base64 → GZIP)
 */

export function xorString(str, key = 11) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key);
  }
  return out;
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Intenta descifrar una cadena de nivel GD
 */
export function decryptGdLevelString(encrypted) {
  if (!encrypted || typeof encrypted !== "string") return encrypted;

  const trimmed = encrypted.trim();

  // Ya es texto de nivel legible (objetos con comas o cabecera kS)
  if (/^\d+,\s*-?\d+/.test(trimmed) || trimmed.includes("kS") || trimmed.startsWith("1,")) {
    return trimmed;
  }

  try {
    const xored = xorString(trimmed, 11);
    const bytes = base64UrlDecode(xored);
    if (typeof pako !== "undefined") {
      const inflated = pako.inflate(bytes, { to: "string" });
      if (inflated && inflated.length > 4) return inflated;
    }
  } catch (_) { /* siguiente intento */ }

  try {
    const decoded = atob(trimmed.replace(/-/g, "+").replace(/_/g, "/"));
    if (typeof pako !== "undefined") {
      const bytes = new Uint8Array([...decoded].map((c) => c.charCodeAt(0)));
      return pako.inflate(bytes, { to: "string" });
    }
  } catch (_) { /* ignore */ }

  return trimmed;
}
