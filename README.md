# GD Studio

Editor web para crear niveles de Geometry Dash, guardarlos en Firebase Realtime Database y exportarlos a `.gmd`.

## Características

- **Autenticación**: correo/contraseña, Google, recuperación por enlace, reCAPTCHA v2
- **Proyectos**: miniatura, título, objetos y duración en el menú principal
- **Crear nivel**: modo Manual o con IA (procedural según dificultad)
- **Importar**: archivos `.gmd` (plist) o `.json` (formato nativo GD Studio)
- **Editor**: paleta de objetos, propiedades, zoom, guardado automático
- **Probar nivel**: cubo 2D con gravedad, pinchos, orbes, pads y portales
- **Exportar**: descarga `.gmd` compatible con estructura plist de GD
- **Responsive**: PC y móvil

## Estructura de archivos

```
index.html
css/
  variables.css, base.css, auth.css, dashboard.css, editor.css, modals.css, responsive.css
js/
  app.js
  config/firebase-config.js
  auth/          auth-service.js, auth-ui.js, recaptcha.js
  db/            database-service.js
  dashboard/     dashboard.js
  editor/        editor.js, editor-canvas.js, test-runner.js, thumbnail-renderer.js
  level/         level-model.js, object-registry.js, gmd-parser.js, gmd-export.js
  physics/       physics-engine.js
  ai/            level-generator.js
  ui/            modals.js
  utils/         helpers.js, toast.js
```

## Configuración Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Activa **Authentication** → Email/Password y Google.
3. Crea una base de datos **Realtime Database** (modo de prueba o reglas propias).
4. Copia la configuración web en `js/config/firebase-config.js`.
5. En Authentication → Settings → **Authorized domains**, añade tu dominio local (`localhost`).
6. Para reCAPTCHA: registra el dominio en [Google reCAPTCHA](https://www.google.com/recaptcha/admin) con la clave de sitio ya incluida en el proyecto.

### Reglas RTDB de ejemplo (desarrollo)

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## Ejecutar en local

Sirve la carpeta con cualquier servidor estático (los módulos ES requieren HTTP):

```bash
npx serve .
# o
python -m http.server 8080
```

Abre `http://localhost:3000` (o el puerto que uses).

## Formato JSON interno

Los niveles se guardan en `users/{uid}/projects/{id}` con:

- `level.objects[]` — objetos con `type`, `x`, `y`, `width`, `height`
- `audioBase64` — música en data URL base64
- `thumbnail` — miniatura JPEG en base64
- `objectCount`, `duration` — metadatos calculados

## Notas sobre .gmd

Geometry Dash usa plist XML; GD Studio exporta `k1`–`k34` y una cadena de objetos simplificada en `k4`, más el JSON completo en `k17` (base64) para reimportar en GD Studio.
