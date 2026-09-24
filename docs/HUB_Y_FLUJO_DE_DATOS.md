# Flujo de datos y anatomía del HUB · ATHA / F.A.S.E

> Documento de arquitectura. Responde dos preguntas:
> 1. **¿Cómo llegan los datos al CRM?** (flujo entre sitio web, app, artefactos y hub)
> 2. **¿Cómo funciona el hub?** (su anatomía interna)
>
> Última actualización: 2026-09-23

---

## PARTE 1 · FLUJO DE DATOS

### La regla

**Una sola base de datos compartida** (Cloud SQL MySQL `admin_crm`) y **una sola puerta
de entrada**: el hub del CRM. Los productos **no tienen base propia** y el CRM **no les va a
buscar** datos: los productos **escriben y leen en el hub**.

> **Nadie salvo el hub toca la base.** Ni el navegador, ni la app móvil, ni los artefactos.

### Diagrama

```
   SITIO WEB (SPA)          APP MÓVIL            ARTEFACTOS
   atha-crm-web          fase-mobile        planner · arquitecto · buscador · ticketer
        │                      │                        │
        └────────── REST/JSON (HTTPS) ─────────────────┘
                           │
                    ┌──────▼───────┐
                    │    EL HUB     │  ← única puerta: valida identidad, aplica
                    │  (server.js)  │    permisos, escribe/lee y notifica en vivo
                    └──────┬───────┘
                           │ mysql2 (credenciales SÓLO en el servidor)
                    ┌──────▼──────────┐        ┌────────────────┐
                    │ Cloud SQL MySQL │        │  GCS (bucket)  │
                    │   admin_crm     │        │ fotos / PDF    │
                    │  UNA sola base  │        └────────────────┘
                    └─────────────────┘
```

### Camino de ESCRITURA (ejemplo real: publicar en la app)

1. La app hace `POST /api/v1/crm/radar/posts` enviando **su identidad** (correo de la sesión
   compartida) + el contenido.
2. El hub **valida quién es** (`GET /api/v1/crm/sesion?email=`) y **qué puede hacer**
   (rol y pertenencia a la compañía).
3. El hub escribe en **MySQL**. Si hay imagen, la sube a **GCS** (guarda sólo la URL).
4. El hub **empuja el evento** por el canal en vivo (SSE): CRM, web y demás apps lo ven
   **al instante**, sin recargar.

### Camino de LECTURA

`GET /api/v1/crm/...` → el hub consulta MySQL, arma el JSON (con autor, nodo, contadores…) y
lo devuelve. Nunca se expone SQL ni credenciales al cliente.

### Identidad (cómo sabe el hub quién sos)

- **Clave única de sesión**: `atha_user_session` (la comparten todos los productos).
- Se entra **una vez** por Google en el CRM; desde ahí, `/puente?destino=...` abre cualquier
  artefacto **con la sesión puesta** (mismo origen, sin pedir login de nuevo).
- Roles y permisos se resuelven **en un solo lugar**: el hub.
- Google bloquea el login dentro de navegadores embebidos (Telegram/IG/FB): abrir en Safari/Chrome.

### Archivos y medios

Binarios **no** van a la base: viven en GCS (`gs://atha-crm-obras-897089213264`) y en las
tablas queda la URL. La subida la hace el hub con las credenciales del servicio (no hay
API keys en el navegador).

### Tiempo real

Canal SSE del hub (`/api/v1/crm/radar/stream`) que empuja: `post_nuevo`, `comentario`,
`reaccion`, `descubrimiento`. Los clientes se suscriben y actualizan su estado sin recargar;
si el canal se corta, reconectan y hay *poll* de respaldo.

### Por qué base compartida y no una por producto

Fue exactamente el problema que se corrigió: el radar tenía **3 esquemas distintos**
(2 PostgreSQL sin uso + una copia a medias en el CRM) y cada producto con su propia versión
de la verdad. Con base compartida:

- **Un dato, un lugar** → sin sincronizaciones ni conflictos.
- **Una sola configuración de auth** → menos tokens que mantener.
- **Permisos y auditoría centralizados**.

### Excepciones actuales (a resolver)

| Situación | Estado |
|---|---|
| `fase-mobile` traía **servidor propio + esquema PostgreSQL + datos semilla** | 🔧 se elimina en la Etapa 2 |
| `crm-v1-uc` (backend del Planner) se conecta a la misma base para `planner_*` | ⚠️ comparte base, pero es una **segunda API**: conviene plegarla al hub o dejarla explícita |
| `buscador` guardaba en `localStorage` | ✅ ya sincroniza con el hub |

---

## PARTE 2 · EL HUB

### Qué es

**Un solo servicio** (Express/Node, ESM) desplegado en Cloud Run
(`atha-crm-web-frontend`, proyecto `athamubot`, región `us-central1`).
Cumple **cuatro roles a la vez**:

1. **Sirve la SPA** del CRM (los archivos compilados de Vite).
2. **Es la API** del ecosistema (`/api/v1/crm/*`).
3. **Es el proveedor de identidad y permisos**.
4. **Es el distribuidor de tiempo real** (SSE).

Que sirva la SPA y la API **en el mismo origen** es deliberado: el CRM no tiene CORS
consigo mismo y las llamadas son a rutas relativas.

### Anatomía del código (`server.js`)

| Bloque | Qué contiene |
|---|---|
| **Arranque** | Express, parser JSON (límite 5 MB), proxy PHP (panel admin), `listen` |
| **Base** | Pool `mysql2/promise` con credenciales por variables de entorno |
| **Estático** | `dist/`: HTML siempre `no-store`, assets con hash `immutable` |
| **Identidad** | Login Google (`/api/auth/google`), JWT, `GET /api/v1/crm/sesion?email=`, `/puente?destino=` |
| **Permisos** | `alcanceInventario(email)`: admin/dirección → todo; productor/técnico → **sólo su compañía**; artista/elenco → sin acceso. `permisoEscritura()` en altas, ediciones, borrados y fotos |
| **Catálogo / equipo** | `/api/v1/crm/portfolio/projects` (GET/POST/PATCH), `/portfolio/team` |
| **Convocatorias** | `/api/v1/crm/convocatorias` (GET + `sync` desde el Buscador) |
| **Inventario** | `/api/v1/crm/inventario` + `cajas`, `items`, `foto` (subida a GCS) |
| **Preferencias de interfaz** | `/api/users/:id/preferences` (tema y configuración de la barra por usuario) |
| **Radar + social** | `/api/v1/crm/radar/*`: nodos, descubrimientos (XP), rutas, perfiles, feed, publicaciones, comentarios, reacciones, insignias, moderación |
| **Tiempo real** | `/api/v1/crm/radar/stream` (SSE) + `/stream/estado` |

### Permisos en una frase

El hub decide **quién sos** y **qué podés hacer** con una sola política, y esa política se
aplica **también en el servidor** (no se confía en que el frontend oculte botones).

### Despliegue

```
gcloud run deploy atha-crm-web-frontend --source . --project athamubot \
  --region us-central1 --platform managed --allow-unauthenticated
```
- `--allow-unauthenticated`: la SPA es pública; **la protección real es por endpoint**
  (permisos y sesión), no por la puerta de Cloud Run.
- Variables: credenciales de DB, client ID de Google, secreto JWT, URL base del backend.
- Cada despliegue crea una **revisión** → si algo sale mal, se vuelve a la anterior al toque.

### Reglas de oro del hub

1. **Nadie más toca la base**: todo pasa por el hub.
2. **Un dato, un lugar** (sin copias por producto).
3. **Permisos en el servidor**, además de en la interfaz.
4. **Medios en GCS**, en la base sólo la URL.
5. **Los cambios se prueban en un servicio aparte** antes de promover al vivo.
6. **Todo endpoint se documenta acá** (y en `docs/ARTEFACTOS_API.md`).
