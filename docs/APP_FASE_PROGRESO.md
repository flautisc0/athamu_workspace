# App FASE (capa 3) · Progreso

> Estado al cerrar la etapa de la app. Guardado para no re-descubrir nada.

## Qué es

La **app FASE es el contenedor de la capa 3**: Inicio · Radar · Rutas · Muro · CRM · Perfil.
El **radar vive DENTRO de la app** como módulo (es la capa que entrega información), no
es un producto aparte. **No tiene base de datos propia**: lee y escribe en el HUB del CRM.

```
APP FASE (contenedor, 6 pestañas)
   └── consume REST + canal en vivo (SSE)
        └── HUB del CRM (identidad + única puerta a MySQL)
```

## Dónde está

| Pieza | Dónde |
|---|---|
| App (web) | https://fase-mobile-897089213264.us-central1.run.app — revisión `fase-mobile-00007-dvt` |
| Hub | https://atha-crm-web-frontend-897089213264.us-central1.run.app — revisión `00040-kp4` |
| APK | `/home/flautisc0/FASE.apk` · https://storage.googleapis.com/atha-crm-obras-897089213264/app/FASE.apk |
| Código fuente | `/tmp/mobile-rev` (clon de `fase-mobile`) · Android: `/tmp/mobile-rev/android` |

## Cómo se construye

**Web:**
```bash
cd /tmp/mobile-rev && node build-app.mjs      # API JS de Vite
cp -r dist /tmp/deploy-app/dist              # contenedor nginx
cd /tmp/deploy-app && gcloud run deploy fase-mobile --source . --port 8080 ...
```

**APK (Capacitor):**
```bash
export ANDROID_HOME=/home/flautisc0/Android
G=/home/flautisc0/.gradle/wrapper/dists/gradle-8.14.3-all/10utluxaxniiv4wxiphsi49nj/gradle-8.14.3/bin/gradle
cd /tmp/mobile-rev && node build-app.mjs && npx cap sync android
cd android && $G assembleDebug --no-daemon --console=plain   # 8m27s, BUILD SUCCESSFUL
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```
- ⚠️ **PITFALL**: los builds en **segundo plano se mueren solos** en este shell. Correr Gradle
  **en primer plano** (funciona; 8m27s). No hace falta la Mac.
- ⚠️ **PITFALL**: no encadenar `… | tail` después del build: el pipe oculta el error y se
  despliega un bundle viejo (pasó y se detectó porque el hash no cambiaba).
- Capacitor: `appId cl.atha.fase`, `webDir dist`, `androidScheme https`.
- Permisos del manifest: INTERNET + ACCESS_FINE/COARSE_LOCATION + CAMERA.

## Qué quedó conectado al hub

| Función | Endpoint |
|---|---|
| Identidad | sesión del ecosistema (`atha_user_session`) o `?email=` que pasa el puente |
| Radar | `/api/v1/crm/radar/nodos` (con distancia GPS), `/descubrimientos` (XP + insignias), `/rutas`, `/perfil` |
| Capa social | `/radar/feed`, `/radar/posts` (foto → GCS), `/radar/posts/:id/comentarios`, `/radar/reacciones` |
| Tiempo real | SSE `/radar/stream` (`post_nuevo`, `comentario`, `reaccion`, `descubrimiento`) + sondeo cada 20 s |
| Pestaña CRM | 37 leads reales del hub + accesos reales a Obras / Planner / Arquitecto |
| Lanzador | `/api/v1/crm/ecosistema/artefactos` (6 artefactos) |

**Arranque**: abre en **Perfil** (no en Inicio) y con **pantalla cinematográfica**:
logo con color → botón "Entrar con mi cuenta ATHA" → efecto de revelado → perfil.

## Qué se eliminó (capa duplicada)

- `server.ts` (1.111 líneas con 25 endpoints propios), `schema.sql`, `seed.sql` y los datos semilla.
- Las imágenes de ejemplo (Unsplash) y las obras inventadas del perfil.
- La app **dejó de tener PostgreSQL propio**: el radar tiene UN solo esquema (el del hub).

## Ajustes pendientes (los reporta Francisco en la próxima ronda)

- (por definir) — hay varios ajustes de interfaz/flujo anotados por Francisco.
