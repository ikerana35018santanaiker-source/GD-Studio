import { normalizeImportedLevel } from "./level-model.js";
import { decryptGdLevelString } from "./gd-crypto.js";
import { buildLevelFromGdString } from "./gd-level-parser.js";

export async function parseLevelFile(file) {
  const text = await readFileText(file);
  const name = file.name.replace(/\.(gmd|json)$/i, "");

  if (file.name.toLowerCase().endsWith(".json") || text.trim().startsWith("{")) {
    return parseJsonLevel(text, name);
  }
  return parseGmdPlist(text, name);
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}

export function parseJsonLevel(text, fallbackName) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON inválido.");
  }
  if (data.level) {
    data = { ...data.level, name: data.name || data.level.name };
  }
  return normalizeImportedLevel(data, fallbackName);
}

export function parseGmdPlist(xmlText, fallbackName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Archivo .gmd XML no válido.");
  }

  const dict = doc.querySelector("plist dict");
  if (!dict) throw new Error("No se encontró estructura plist en el .gmd.");

  const map = plistDictToMap(dict);
  const meta = {
    name: decodeLevelName(map),
    difficulty: gdDifficultyFromStars(map.k7 ?? map.k23),
    newgroundsId: String(map.k8 ?? map.k45 ?? "")
  };

  // k4 = cadena de nivel (a veces cifrada)
  if (map.k4 && typeof map.k4 === "string" && map.k4.length > 8) {
    try {
      return buildLevelFromGdString(map.k4, meta);
    } catch (e) {
      console.warn("k4 parse:", e);
    }
  }

  // k17 embebido (GD Studio / exportaciones)
  if (map.k17 && typeof map.k17 === "string") {
    try {
      const inner = decodeBase64Utf8(map.k17);
      const json = JSON.parse(inner);
      return normalizeImportedLevel(json.level || json, meta.name || fallbackName);
    } catch (_) { /* ignore */ }
  }

  // Objetos en texto plano legacy
  if (typeof map.k4 === "string") {
    return normalizeImportedLevel({ ...meta, k4: map.k4 }, meta.name || fallbackName);
  }

  throw new Error("No se encontraron datos de nivel en el .gmd (k4/k17).");
}

function decodeLevelName(map) {
  if (map.k2 && typeof map.k2 === "string") return map.k2;
  if (map.k3 && typeof map.k3 === "string") {
    try {
      return decodeBase64Utf8(map.k3);
    } catch {
      return map.k3;
    }
  }
  return "Importado";
}

function decodeBase64Utf8(b64) {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function plistDictToMap(dictEl) {
  const result = {};
  const children = [...dictEl.children];
  for (let i = 0; i < children.length - 1; i += 2) {
    const keyEl = children[i];
    const valEl = children[i + 1];
    if (keyEl?.tagName !== "key") continue;
    result[keyEl.textContent.trim()] = readPlistValue(valEl);
  }
  return result;
}

function readPlistValue(el) {
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "string":
      return el.textContent;
    case "integer":
      return parseInt(el.textContent, 10);
    case "real":
      return parseFloat(el.textContent);
    case "true":
      return true;
    case "false":
      return false;
    case "dict":
      return plistDictToMap(el);
    case "array":
      return [...el.children].map(readPlistValue);
    default:
      return el.textContent;
  }
}

function gdDifficultyFromStars(k7) {
  const stars = parseInt(k7, 10) || 0;
  if (stars >= 10) return "demon";
  if (stars >= 7) return "insane";
  if (stars >= 5) return "harder";
  if (stars >= 3) return "hard";
  if (stars >= 1) return "normal";
  return "easy";
}
