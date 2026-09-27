# Flujo de datos y anatomía del HUB · ATHA / F.A.S.E

> Documento de arquitectura. Responde dos preguntas:
> 1. **¿Cómo llegan los datos al CRM?** (flujo entre sitio web, app, artefactos y hub)
> 2. **¿Cómo funciona el hub?** (su anatomía interna)
>
> Última actualización: 2026-09-26 (PARTE 3 · estructura canónica y deploy seguro)

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

---

## PARTE 3 · ESTRUCTURA CANÓNICA Y DESPLIEGUE SEGURO

> Añadido 2026-09-26 tras el incidente del `server.js` mutilado (ver abajo).

### Regla cero: `server.js` es el archivo crítico

El hub es **un solo archivo**: `~/athamu_workspace/server.js`. Su tamaño canónico es
**≈4.000 líneas** (HEAD de git). Si el archivo del working tree pesa mucho menos,
**está mutilado y el deploy va a romper el ecosistema**.

**Chequeo obligatorio ANTES de cada deploy** (tarda 2 segundos):

```bash
cd ~/athamu_workspace
echo "HEAD=$(git show HEAD:server.js | wc -l)  working=$(wc -l < server.js)"
# Deben ser del mismo orden. Si difieren en cientos de líneas: PARAR.
for P in crm/radar/feed crm/radar/nodos crm/radar/perfil crm/radar/stream \
         ecosistema/artefactos companias/mias "/api/v1/crm/sesion" alcanceInventario; do
  printf "%-24s HEAD=%s working=%s\n" "$P" \
    "$(git show HEAD:server.js | grep -c "$P")" "$(grep -c "$P" server.js)"
done
```

### Inventario real de rutas (verificado en producción)

**Identidad, perfil y preferencias**

| Ruta | Método | Notas |
|---|---|---|
| `/api/auth/google` · `/register` · `/ticket` · `/exchange` | POST | login del ecosistema |
| `/api/auth/me` | GET | |
| `/api/v1/crm/sesion?email=` | GET | **la usa `fase-mobile` al abrir** |
| `/api/v1/perfil` | GET | perfil + companias + preferencias + permisos |
| `/api/users/:email/preferences` | GET/POST | tema y barra por usuario |

**Radar + red social** (lo que consume `fase-mobile`)

| Ruta | Método |
|---|---|
| `/api/v1/crm/radar/perfil` · `/perfil-publico` | GET |
| `/api/v1/crm/radar/nodos` · `/nodos/:id` | GET/POST/PATCH/DELETE |
| `/api/v1/crm/radar/descubrimientos` | POST (otorga XP) |
| `/api/v1/crm/radar/rutas` | GET/POST |
| `/api/v1/crm/radar/feed` | GET (`?node_id=` · `?limite=`) |
| `/api/v1/crm/radar/posts` · `/posts/:id/comentarios` · `/posts/:id/moderar` | POST/PATCH |
| `/api/v1/crm/radar/reacciones` | POST (toggle) |
| `/api/v1/crm/radar/badges` | GET |
| `/api/v1/crm/radar/stream` (+ `/stream/estado`) | GET (SSE) |

**Compañías, usuarios, CRM y artefactos**

| Ruta | Notas |
|---|---|
| `/api/v1/crm/companias/mias` · `/companias/:id/solicitudes` · `/companias/solicitudes[/:id/resolver]` | agrupaciones y aprobación de admin |
| `/api/v1/crm/usuarios` · `/usuarios/:id/companias` · `/companias/:id/nomina` · `/nomina/:id` | panel de usuarios y nóminas |
| `/api/v1/crm/leads` · `/lead-groups` · `/lead-groups/:id/members` | mini-CRM |
| `/api/v1/crm/chat/messages` (+ `/:id/read`) | **chat interno de compañía** (módulo que sólo vivía en el working tree) |
| `/api/v1/crm/ecosistema/artefactos` | catálogo con URL directa |
| `/api/v1/crm/solicitudes` | solicitudes de acceso |

> La app FASE usa como base `https://atha-crm-web-frontend-…/api/v1/crm`, por eso **todas**
> las rutas del radar llevan el prefijo `/crm/`. Un 404 sistemático ahí = hub mutilado.

### Despliegue seguro (obligatorio)

```bash
cd ~/athamu_workspace
# 1) chequeo de estructura (arriba) — si falla, PARAR
# 2) desplegar SIN tráfico y con tag
gcloud run deploy atha-crm-web-frontend --source . --region us-central1 \
  --project athamubot --allow-unauthenticated --no-traffic --tag=candidato
# 3) validar en la URL del tag (no toca a los usuarios)
U=https://candidato---atha-crm-web-frontend-o4pqpocl5q-uc.a.run.app
for P in /api/v1/perfil /api/v1/crm/radar/perfil /api/v1/crm/radar/feed \
         /api/v1/crm/radar/nodos /api/v1/crm/sesion; do
  printf "%-34s -> " "$P"
  curl -s -o /dev/null -w "%{http_code}\n" -H "x-atha-email: panxo.sms@gmail.com" "$U$P"
done
# 4) sólo si TODO da 200, mover el tráfico
gcloud run services update-traffic atha-crm-web-frontend --to-latest \
  --region us-central1 --project athamubot
```

### Incidente 2026-09-26 · `server.js` mutilado

- **Síntoma**: la app FASE mostraba sólo nombre y foto (lo que trae el login de Google),
  sin XP, nivel, muro ni chat; el CRM parecía vacío. Se atribuyó a la sesión y no lo era.
- **Causa**: el `server.js` del working tree había sido **sobrescrito** y pasó de ~4.000 a
  **1.721 líneas**: desaparecieron `radar/*`, `ecosistema/artefactos`, `companias/*`,
  `alcanceInventario` y `/api/v1/crm/sesion`. Como el deploy usa `--source .`, publicaba
  ese archivo incompleto.
- **Diagnóstico**: comparar `git show HEAD:server.js | wc -l` vs `wc -l server.js` y contar
  familias de rutas. En producción `/api/v1/perfil` daba 200 y `/api/v1/crm/radar/*` daba 404
  → el backend funcionaba; la API del radar **no existía**.
- **Arreglo**: restaurar desde git (`git show HEAD:server.js > server.js`) y **reinsertar el
  módulo de chat**, que existía *sólo* en el archivo mutilado (3 rutas). Quedó en 4.074 líneas.
  Backup del archivo roto: `/tmp/server.js.working-1721.bak`.
- **Lección**: el working tree **no** es fuente de verdad — git sí. Restaurar a ciegas borra
  módulos que sólo viven ahí: **revisar el diff antes**.
- **Revisión que quedó en vivo**: `atha-crm-web-frontend-00071-xig`.

---

# PARTE 4 · Prueba piloto con colaboradores (flujo, datos y pendientes)

## Lo que ya está en vivo

| Pieza | Dónde | Qué hace |
|---|---|---|
| Formulario de inscripción | `<hub>/piloto` | Público, sin sesión. Guarda en `piloto_inscripciones` (upsert por correo: no duplica). |
| Listado de anotados | `GET /api/v1/crm/piloto/inscripciones` | Sólo administración (403 al resto). |
| Botón "Reportar algo" | app FASE (todas las pestañas) | Reporta en el momento con contexto: pantalla, cuenta, versión, plataforma y **captura opcional**. |
| Reportes | `GET /api/v1/crm/piloto/reportes` | Sólo administración. `piloto_reportes` guarda `imagen_url` (bucket, carpeta `piloto/reportes`). |

Ninguna de las dos tablas toca datos de producción.

## Herramientas del repo (correr con `python3 scripts/correr_en_hub.py <script.cjs>`)

- `scripts/auditoria_consistencia.py` — 27 chequeos de datos cruzados CRM / radar-app / Planner. **Correr antes y después de la prueba.**
- `scripts/reparar_consistencia_20260926.py` + `.cjs` — reparaciones de identidad y compañías (paso 1).
- `scripts/reparar_consistencia_paso2.cjs` — cruce Planner → CRM (correos y personajes del elenco).
- `scripts/reparar_consistencia_paso3.cjs` — identidades de la prueba (contacto, roles artista/admin) y Pipe Naranjo.
- `scripts/socios_atha.cjs` — representantes legales de la entidad.
- `scripts/renombrar_persona.cjs` — renombra a una persona en CRM + cuenta + Planner de una vez (simula sin `--aplicar`).
- `scripts/vincular_correo_real.cjs` — cuando alguien da su correo real: actualiza su ficha, lo deja como miembro y borra la cuenta placeholder.
- `scripts/ver_inscripciones_piloto.py` / `scripts/ver_reportes_piloto.py` — leer anotados y reportes.

## Dato importante: correos sin casilla

Los `@athaproducciones.cl` de la nómina **no tienen casilla real** (confirmado por Francisco). Esas
personas figuran bien como ficha de nómina, pero **no pueden iniciar sesión**. Se resuelven con el
correo real que captura el formulario del piloto + `vincular_correo_real.cjs`.

## Pendiente para el final: notificaciones PUSH

Lo que hay hoy: campanita **interna** de la app (funciona con la app abierta, vía SSE). No hay push
cuando la app está cerrada. Estado real verificado:

- La app **no tiene** plugin de push (`@capacitor/push-notifications` no está instalado).
- El hub **no tiene** dónde guardar tokens de dispositivo ni envío (FCM/APNs).
- `POST_NOTIFICATIONS` **sí** está declarado en el AndroidManifest, pero nadie lo pide en runtime.

Para que funcione hay que: (1) proyecto Firebase + `google-services.json`, (2) plugin de push +
permiso en runtime, (3) tabla de dispositivos + envío desde el hub en los eventos (publicación nueva
en tu compañía, solicitud resuelta, reporte nuevo), (4) APK nuevo — y en iOS, APNs + Xcode 16.
**Requiere recompilar**, así que queda para el final (decisión de Francisco).

## Pendiente de decisión: nombre de la entidad

Los 5 representantes legales están en la ficha que hoy se llama **"Compañía Teatral ATHA"**. Falta
definir si esa ficha pasa a llamarse **"ATHA Producciones"** y si las demás agrupaciones (ATHA Kids,
Tenoia Musicalis, TMLL) llevan la etiqueta de **grupo / proyecto** de ATHA Producciones.

## Pendiente: importar el Drive de ATHA Producciones

Conectar el Drive para importar datos y archivos de cada actor (ficha, fans, etc.). Diferido por
decisión de Francisco. Los documentos oficiales de la compañía viven en la máquina "cerebro".

## Rumbo acordado (2026-09-26)

1. **Probar en vivo** los datos que se vayan ingresando → después de cada carga, correr
   `scripts/auditoria_consistencia.py` (27 chequeos) para detectar cruces rotos al instante.
2. **Poblar las rutas culturales** (nodos y rutas del radar). Pendiente de armar: importador
   masivo CSV/JSON → `radar_nodes` / `radar_rutas`, con validación de coordenadas, portada y QR,
   para no cargar de a uno.
3. **Mejorar la interacción app ↔ CRM.** Regla vigente: **el CRM es la fuente de verdad**; la app
   lee por endpoints y el teléfono es caché offline. La auditoría es la brújula.
4. **Sitio web oficial de ATHA Producciones / F.A.S.E**, a diseñar en conjunto con Zowen. Debe
   consumir el MISMO catálogo (compañías, artistas, nodos, montajes) para no divergir de la app
   y el CRM.

La página `/piloto` ya hace las dos cosas: descargar el APK (paso 1) y anotarse (paso 2), con la
salida para iPhone (web).
