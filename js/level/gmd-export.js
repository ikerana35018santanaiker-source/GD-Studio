import { computeLevelStats, canvasYToGd } from "./level-model.js";
import { getTypeByKey } from "./object-registry.js";

/**
 * Exportación a .gmd (plist) y JSON nativo de GD Studio
 */

export function exportToJson(project) {
  const payload = {
    gdStudio: true,
    exportVersion: 1,
    name: project.name,
    difficulty: project.difficulty,
    newgroundsId: project.newgroundsId,
    audioBase64: project.audioBase64,
    audioMime: project.audioMime,
    level: project.level
  };
  return JSON.stringify(payload, null, 2);
}

export function exportToGmd(project) {
  const level = project.level;
  const stats = computeLevelStats(level);
  const objectString = buildGdObjectString(level.objects || []);
  const desc = project.name || level.name || "GD Studio Level";

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>k1</key>
\t<integer>${Math.round(stats.length || level.length || 0)}</integer>
\t<key>k2</key>
\t<integer>0</integer>
\t<key>k3</key>
\t<string>${escapeXml(desc)}</string>
\t<key>k4</key>
\t<string>${escapeXml(objectString)}</string>
\t<key>k5</key>
\t<string>${escapeXml(desc)}</string>
\t<key>k6</key>
\t<integer>0</integer>
\t<key>k7</key>
\t<integer>${difficultyToStars(project.difficulty)}</integer>
\t<key>k8</key>
\t<string>${escapeXml(String(project.newgroundsId || level.newgroundsId || ""))}</string>
\t<key>k9</key>
\t<integer>1</integer>
\t<key>k10</key>
\t<integer>0</integer>
\t<key>k11</key>
\t<integer>1</integer>
\t<key>k12</key>
\t<integer>0</integer>
\t<key>k13</key>
\t<integer>0</integer>
\t<key>k14</key>
\t<integer>0</integer>
\t<key>k15</key>
\t<integer>0</integer>
\t<key>k16</key>
\t<integer>0</integer>
\t<key>k17</key>
\t<string>${escapeXml(btoaUnicode(exportToJson(project)))}</string>
\t<key>k18</key>
\t<integer>0</integer>
\t<key>k19</key>
\t<integer>0</integer>
\t<key>k20</key>
\t<integer>0</integer>
\t<key>k21</key>
\t<integer>0</integer>
\t<key>k22</key>
\t<integer>0</integer>
\t<key>k23</key>
\t<integer>0</integer>
\t<key>k24</key>
\t<integer>0</integer>
\t<key>k25</key>
\t<integer>0</integer>
\t<key>k26</key>
\t<integer>0</integer>
\t<key>k27</key>
\t<real>0</real>
\t<key>k28</key>
\t<integer>0</integer>
\t<key>k29</key>
\t<integer>0</integer>
\t<key>k30</key>
\t<integer>0</integer>
\t<key>k31</key>
\t<integer>0</integer>
\t<key>k32</key>
\t<integer>0</integer>
\t<key>k33</key>
\t<integer>0</integer>
\t<key>k34</key>
\t<integer>0</integer>
</dict>
</plist>`;

  return plist;
}

function buildGdObjectString(objects) {
  const header = "kS38,1,kA2,0,kA3,0,kA4,0,kA8,0,kA9,0,kA10,0,kA11,0,kA12,0";
  const body = objects
    .filter((o) => o.width > 0 || o.height > 0)
    .map((o) => {
      const id = o.objectId ?? getTypeByKey(o.type).id ?? 1;
      const x = Math.round(o.x);
      const gdY = Math.round(canvasYToGd(o.y + (o.height || 30)));
      const rot = Math.round(o.rotation || 0);
      return `${id},${x},${gdY},0,${rot},1,1,1,0,0,0,0,0,0,0,0,0,0,0,0`;
    })
    .join(";");
  return body ? `${header};${body}` : header;
}

function difficultyToStars(diff) {
  const map = { easy: 0, normal: 1, hard: 3, harder: 5, insane: 7, demon: 10 };
  return map[diff] ?? 1;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function btoaUnicode(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

export function downloadGmd(project) {
  const name = (project.name || "level").replace(/[^\w\-]+/g, "_");
  const content = exportToGmd(project);
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.gmd`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(project) {
  const name = (project.name || "level").replace(/[^\w\-]+/g, "_");
  const content = exportToJson(project);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
