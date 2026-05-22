import { normalizeImportedLevel } from "./level-model.js";

/**
 * Importación de archivos .gmd (plist XML) y JSON de GD Studio
 */

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
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Archivo .gmd XML no válido.");
  }

  const dict = doc.querySelector("plist dict");
  if (!dict) throw new Error("No se encontró estructura plist en el .gmd.");

  const map = plistDictToMap(dict);
  const payload = {
    name: map.k3 || fallbackName,
    description: map.k4 ? "" : map.k5,
    length: parseInt(map.k1, 10) || 0,
    difficulty: gdDifficultyFromStars(map.k7),
    newgroundsId: String(map.k8 || ""),
    objects: []
  };

  if (map.k4 && typeof map.k4 === "string") {
    payload.objects = map.k4;
    if (map.k4.includes(",") && !map.k4.startsWith("{")) {
      return normalizeImportedLevel({ ...payload, k4: map.k4 }, fallbackName);
    }
    try {
      const decoded = atob(map.k4);
      if (decoded.startsWith("{")) {
        return normalizeImportedLevel(JSON.parse(decoded), fallbackName);
      }
    } catch (_) {
      return normalizeImportedLevel({ ...payload, k4: map.k4 }, fallbackName);
    }
  }

  if (map.objects) {
    return normalizeImportedLevel(map, fallbackName);
  }

  return normalizeImportedLevel(payload, fallbackName);
}

function plistDictToMap(dictEl) {
  const result = {};
  const children = [...dictEl.children];
  for (let i = 0; i < children.length - 1; i += 2) {
    const keyEl = children[i];
    const valEl = children[i + 1];
    if (keyEl?.tagName !== "key") continue;
    const key = keyEl.textContent.trim();
    result[key] = readPlistValue(valEl);
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
