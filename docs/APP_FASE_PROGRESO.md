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
| Hub | https://atha-crm-web-frontend-897089213264.us-central1.run.app |
| APK | `/home/flautisc0/athamu_workspace/FASE-Mobile-v2-login.apk` (5,14 MB, package `cc.fase.mobile`) |
| Código fuente | `github.com/flautisc0/fase-mobile` (rama `main`) · Android: se genera con `npx cap add android` |

## Login NATIVO (2026-09-25) — el navegador ya no se abre

**Bug reportado**: al tocar "Entrar con mi cuenta ATHA" se abría el navegador.

**Causa raíz**: el login hacía `window.location.href = <CRM>/puente?destino=app-movil`.
Eso **saca el WebView de la app** y lo lleva al dominio del CRM, donde el login es
Google **web**, que Google rechaza dentro de un WebView (y además sale del contenedor
nativo). No era Capacitor: era el flujo de login.

**Solución**: Google Sign-In **nativo** con `@capawesome/capacitor-google-sign-in`
(Credential Manager de Android → selector de cuentas del propio teléfono).

- `src/components/LoginCinematico.tsx`: `GoogleSignIn.initialize({ clientId })` +
  `signIn()` → `idToken / email / displayName / imageUrl`. Se conserva el look
  cinematográfico y los errores del plugin se traducen a mensajes útiles.
- `mobile/services/api.ts`: `guardarSesion()` / `cerrarSesion()` / `haySesion()`
  sobre la clave compartida `atha_user_session` (la misma del CRM).
- `capacitor.config.ts`: **appId `cc.fase.mobile`**, que DEBE coincidir con el
  `package name` del cliente OAuth Android. Si no: `UNREGISTERED_ON_API_CONSOLE`
  justo al elegir la cuenta (el plugin lo reporta como `SIGN_IN_CANCELED`).
- `.env`: `VITE_GOOGLE_CLIENT_ID` (SIEMPRE el client ID **web**, también en Android:
  se pasa como `serverClientId`) y `VITE_CRM_API`.

Cliente OAuth Android registrado: package `cc.fase.mobile` +
SHA-1 debug `EA:13:F0:D1:85:8A:45:2E...` (verificar con
`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey`).

## Datos sembrados

`radar_nodes`: 6 nodos culturales reales de Santiago (NAVE Yungay, Galería
Metropolitana, Mural Yungay, MAC Parque Forestal, Taller Espacio O, Cineteca
Nacional). Script reproducible: `scripts/seed-nodos.py` (idempotente, requiere
correo admin). **Sin fotos todavía** (`cover_url` vacío): subirlas desde el CRM.

Crear nodos **desde la app** ya funciona: `FaseApi.createNode()` +
el panel de administración.

## Estado de las dos líneas de trabajo (consolidadas)

Estaban divergentes y una vivía **solo en `/tmp` sin commitear** (se perdía al
reiniciar). Ya están unidas en `main`:
- Línea A (23-24 sep): conexión al hub, `LoginCinematico`, SSE en vivo, sin capa mock.
- Línea B (25 sep): sistema de tema claro/oscuro + 6 acentos (`src/theme.ts`).

Se eliminó el header de desarrollo con selector de rol: el rol ahora lo determina
la identidad real del hub, y un selector falso lo contradecía.

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
