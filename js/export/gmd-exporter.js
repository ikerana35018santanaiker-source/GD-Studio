// js/export/gmd-exporter.js
export class GMDExporter {
  static exportToGMD(projectData) {
    const gmdData = {
      format: "GDStudio GMD v1.0",
      level: {
        name: projectData.title,
        difficulty: projectData.difficulty,
        song: {
          newgroundsId: projectData.newgroundsId,
          base64: projectData.audioBase64
        },
        objects: projectData.objects.map(obj => ({
          type: obj.type,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          rotation: obj.rotation || 0,
          properties: obj.properties || {}
        })),
        metadata: {
          version: "1.0",
          exportDate: new Date().toISOString(),
          objectCount: projectData.objects.length
        }
      }
    };

    return JSON.stringify(gmdData);
  }

  static downloadGMD(projectData, filename) {
    const gmdContent = this.exportToGMD(projectData);
    const blob = new Blob([gmdContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${projectData.title}.gmd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
