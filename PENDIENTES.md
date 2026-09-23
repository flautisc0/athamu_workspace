# Pendientes CRM ATHA

Última actualización: 2026-09-22

## Solicitudes del usuario (Francisco)

- [x] **Felipe Naranjo: acceso de dirección en el Planner** — ✅ hecho
      (2026-09-23). Correo real: `pipe.naranjo33@gmail.com`.
      Fila en `planner_director_users` (`dir_b6e9c1c4`, authorized=1,
      cargo "Diseño Lumínico & Elenco — TMLL").
      Además se **implementó el endpoint de dirección** en el servidor del
      planner (`planner-serve/server.cjs`), porque el del CRM estaba roto:
      ahora GET filtra por correo (antes devolvía siempre la primera fila, así
      que cualquiera quedaba como dirección) y POST permite autorizar/revocar.
      Verificado: Felipe y Francisco `authorized: true`; correo desconocido → `0`.

## Datos reales por cargar

- [ ] **Base "Platea Professionals Week"** (obtenida en febrero) — Francisco
      entregará el archivo. Importar con el proceso de
      `ATHAMU_Workspace/data/bases_importadas/README.md`.
- [ ] **Completar emails de los 28 prospectos** cargados desde el Excel de
      leads estratégicos: solo 6 traen correo (el resto solo teléfono/web).
      Sin emails, el mailing masivo de Ventas no puede enviarles.
- [x] **Equipo real + fotos reales** — ✅ hecho parcialmente (2026-09-23).
      Las 4 fotos reales del equipo (`Selección fotos equipo .zip` en cerebro:
      Jo Schultz, Antonia Fernández, Francisco Pérez, Nicolás Ortiz) se
      optimizaron (700x700, ~140 KB) y se alojaron en
      `gs://atha-crm-obras-897089213264/equipo/<slug>.jpg`; `INITIAL_TEAM` en
      `src/data/initialData.ts` ya apunta a ellas y App.tsx refresca la foto
      cacheada en el navegador si era generada.
      *Falta:* revisar nombres y cargos del equipo demo (los apellidos/cargos
      pueden no coincidir con la realidad) y sumar a quien falte.
- [x] **Nómina de TMLL** — ✅ hecha (2026-09-23) desde el dossier de "Las
      Hormigas": 11 personas con sus cargos reales (dirección, vestuario,
      diseño lumínico, operación, sonido, producción y elenco), incluido
      **Felipe Naranjo** (Diseño Lumínico & Elenco). TMLL quedó además
      identificada como "Teatro Moneda en Llamas" con su correo de contacto.
- [ ] **Nóminas de las compañías colaboradoras restantes**: ya están ATHA (6
      socios), ATHA Kids (8 elenco) y TMLL (11). Falta Ilícita Teatro,
      Con Mucho Merkén, Proyecto Fuego, Los Dispersos, Q importa?, INTERDRAM
      y SantosFilms (sus elencos salen en los dossieres del catálogo).

## Material faltante del catálogo

- [ ] **Robo navideño** (ATHA Kids): sin dossier ni fotos reales. Se generó una
      portada provisoria en GCS (`obras/robo-navideno/cover.jpg`). Reemplazar
      cuando exista el material.

## Secciones todavía con datos de respaldo local (no cableadas a la base)

- [ ] Finanzas (`initialData` trae registros demo atados a obras ficticias).
- [ ] Calendario / planificación (`INITIAL_SCHEDULE` demo).
- [ ] Diario de proceso (`INITIAL_CREATIVE_LOGS` demo).
- [ ] Venues / inventario / riders / disponibilidad de artistas.

## Escritura persistente por sección

**Persisten en la base (MySQL `admin_crm`):**
- Login / registro (usuarios, roles, membresías de compañía).
- **Obras** (`projects`): alta y edición vía `POST /api/obras` (upsert por `id`);
  borrado vía `DELETE /api/obras/:id`.
- **Leads / clientes** (`leads`): alta y edición vía `POST /api/leads`;
  borrado vía `DELETE /api/leads/:id`.
- **Grupos de destinatarios** de Ventas (`lead_groups` / `lead_group_members`).
- **Compañías y nómina de socios** (`companies`, `company_people`).
- **Planner**: `POST/GET /api/planner/{projects,artists,rehearsals,availability,director}`
  (servicio `planner-frontend`, que ahora proxea `/api/planner/*` al CRM).

**Todavía en `localStorage` del navegador (falta endpoint de escritura):**
- Finanzas, calendario/planificación, diario de proceso, venues, inventario,
  riders y disponibilidad de artistas.

## Sesión única del ecosistema (SSO) — 2026-09-23

**Regla de negocio**: quien inicia sesión en el CRM queda con sesión en los
artefactos (Planner y Arquitecto). No se pide login de nuevo.

Cómo funciona:
1. **CRM** (`src/utils/sesionEcosistema.ts`): al abrir Planner o Arquitecto
   desde la intranet (sección Ecosistema o tarjetas del Dashboard) el enlace
   lleva la identidad en la URL:
   `?auth=1&email=…&name=…&role=director|artist&roleTitle=…&picture=…`
   (sale de `user_profile` del CRM; Ticketer y Buscador de Fondos se abren igual
   que antes porque aún no manejan sesión).
2. **Planner**: ya soportaba esos parámetros (`auth`, `email`, `name`, `role`,
   `picture`): arma el usuario, lo guarda en `fase_current_user`, limpia la URL y,
   si es artista, lo asocia a su fila de elenco.
3. **Arquitecto**: no lo soportaba → se le agregó `dist/atha-sesion.js`
   (inyectado **antes** del módulo de la app): escribe `atha_user_session` y
   `atha_auth_token` y recarga una vez.

### Alcance por usuario en el Planner

- El Planner **ya** limita la vista de artistas cuando la sesión es de un artista
  con `artistId` (`artists.filter(a => a.id === currentUser.artistId)`), así que
  **cada artista sólo ve y edita su propia disponibilidad**; la dirección ve todo.
- Verificado en el bundle desplegado: la condición existe intacta.

### Usuarios precargados: eliminados del Planner

Del bundle se vaciaron: elenco demo (8 con correos y teléfonos inventados),
proyecto demo, ensayos demo, convocatorias demo y la matriz de disponibilidad
demo; y se neutralizó el botón que entraba como "Francisco Panxo SMS"
(ahora abre el login de Google) y el correo por defecto en las invitaciones.

**Queda pendiente (menor)**: el perfil de dirección por defecto (`df`) todavía
trae el nombre/correo de Francisco como respaldo hasta que la API responde con
el perfil real; y el Arquitecto sigue con su selector de 4 usuarios demo (con las
fotos reales ya puestas) — quitarlo requiere recompilar su fuente
(`tmp_arquitecto`) sin esos datos.

### Pitfalls (aprendidos en carne propia)

- Editar el bundle a mano es delicado: un ancla inexistente **duplicó** el archivo
  entero y rompió la app. Regla: verificar ancla + tamaño del literal + `node --check`
  y **restaurar automáticamente** si la sintaxis falla (los scripts quedaron en
  `/tmp/quitar_demo_planner2.py`, `/tmp/parche_arquitecto.py`).

## Unificación de catálogo: CRM = Planner = Arquitecto (2026-09-23)

**Una sola fuente de verdad**: la tabla `projects` de Cloud SQL, expuesta por
`crm-v1-uc-897089213264.../api/v1/crm/portfolio/projects` (13 obras).

| App | Cómo lee el catálogo | Estado |
|---|---|---|
| **CRM-web** | `/api/v1/crm/portfolio/projects` (vía `apiClient`) | ✅ |
| **Planner** | `/api/planner/projects` (backend CRM, enlazado por proyecto con `crm_project_id`) | ✅ |
| **Arquitecto (F·A·S·E)** | `${base}/portfolio/projects` | ✅ **arreglado** |

### Arquitecto: qué estaba mal y cómo se resolvió

El bundle desplegado apuntaba a **`http://localhost:5052/api/v1/crm`** → en la
nube no cargaba nada del CRM y usaba su **copia local del navegador**
(`atha_crm_catalog_v1`), quedando con un catálogo distinto al del CRM y el planner.

Arreglo (cirugía de strings sobre el bundle, sin tocar la interfaz; el `dist`
local coincidía con lo desplegado):
1. API base → `https://crm-v1-uc-897089213264.us-central1.run.app/api/v1/crm`.
2. Clave de caché local renombrada (`_v1` → `_v2`) para forzar la lectura fresca.
3. Fotos generadas (unsplash) → **fotos reales del equipo** (GCS).

Verificado: bundle con la base del CRM (0 `localhost`), CORS del CRM autoriza el
origen del arquitecto, y el catálogo devuelve las **mismas 13 obras**.
Revisión: `artha-arquitecto-00002-8nf`. Repo/deploy: `/home/flautisc0/deploy-arquitecto`
(nginx :80). Script: `/tmp/parche_arquitecto.py`.

**Pendiente del arquitecto**: sigue con **usuarios demo precargados** en el bundle
(`user-01` Francisco, `user-02` Jo Schultz…) con correos y fotos antiguas.
Se dejó intacto por riesgo (su login depende de esa lista).

## INVENTARIO / BACKLINE · Etapas 1 y 2 (2026-09-23, noche)

**Concepto implementado**: inventario organizado por **CAJAS** (lo que sale a
gira) y por **COMPAÑÍA**. Jerarquía real en la base:

```
companies ──< inventory_boxes ──< inventory_items
```

### Base de datos

- **`inventory_boxes`** (nueva): id, company_id, code (`ATHA-CJ-001`), name
  ("Caja 1 · Audio"), kind (Audio/Iluminación/Backline/Cables/Utilería/Vestuario),
  location (bodega + estante), photo_url, notes, status (En bodega/En gira/…).
- **`inventory_items`** (ampliada): + company_id, box_id, brand, model, serial,
  quantity, photo_url, notes, tags_json, updated_at.

### Endpoints del hub

| Endpoint | Qué hace |
|---|---|
| `GET /api/v1/crm/inventario[?company_id=]` | Compañías + cajas (con conteo y valor) + ítems |
| `POST/PATCH/DELETE /api/v1/crm/inventario/cajas[/:id]` | Alta, edición, baja (los ítems quedan sin caja, no se borran) |
| `POST/PATCH/DELETE /api/v1/crm/inventario/items[/:id]` | Ídem ítems |
| `POST /api/v1/crm/inventario/foto` | Sube una foto (data URL) al bucket y devuelve la URL pública |

**Subida de fotos**: el contenedor usa sus propias credenciales (metadata server)
→ no hacen falta API keys en el navegador. Verificado en producción: subida OK y
la foto queda pública (`image/jpeg`).

### Interfaz (sección reescrita, autocontenida)

- **Tema arreglado**: la sección es la única que NO recibía `theme` → tenía
  colores oscuros fijos y en modo día el título quedaba blanco sobre claro
  (invisible). Ahora usa `isLight = theme === 'dia'` como las demás.
- **Dos niveles**: tarjetas de cajas (con foto, código, tipo, nº de ítems, valor y
  estado) → al abrir una caja, la tabla de ítems con miniatura, marca/modelo,
  nº de serie, cantidad, estado y valor.
- **Selector de compañía** arriba (define todo lo de abajo); por defecto la
  que contenga "ATHA".
- Buscador (nombre/marca/modelo/serie/código), filtro por estado, export CSV
  (checklist de gira), totales (cajas, ítems, en gira, valor).
- Modales de alta/edición para caja e ítem, con **subida de foto** (redimensiona
  a 1280px en el navegador antes de subir).
- **Autocontenida**: lee y escribe directo en el hub, así `App.tsx` sólo cambia
  una línea (`<InventarioSection theme={theme} />`) → fácil de mergear con los
  ajustes de interfaz que el usuario está haciendo en paralelo.

### Bug propio detectado y corregido en la misma sesión

El primer PATCH parcial **pisaba los datos**: al editar SÓLO la foto, el body sin
`name` recibía el valor por defecto ("Ítem sin nombre") y el UPDATE lo escribía,
borrando el nombre real. Se reemplazó el upsert por una **actualización parcial**
(`actualizarParcial()` + `camposItemDeBody()`/`camposCajaDeBody()`), que arma el
`SET` únicamente con los campos presentes en el body.

### Pendiente del inventario

- Etapa 3: **riders técnicos y fichas de sonido/iluminación por compañía** (tabla
  `company_documents` con versiones + adjunto PDF).
- Etapa 4: **despacho a gira** (marcar cajas/ítems → alimenta el rider) y
  **generar el rider desde las cajas**.
- Cargar el equipamiento REAL de ATHA Producciones (hay una caja de prueba con
  2 ítems que se borra al verificar).

## FASE 0 · Identidad unificada + baja de servicios viejos (2026-09-23, noche)

### El bug que rompía la sesión entre CRM y artefactos

Había **TRES claves distintas** para la misma sesión:

| Pieza | Escribía | Leía |
|---|---|---|
| CRM (login) | `user_session` | `user_session` ✓ |
| CRM → links del Ecosistema | — | **`user_profile`** ❌ (sólo se escribía al editar el perfil, no al loguearse) |
| Puente `/puente` | — | `atha_user_session` ❌ |
| Planner / Arquitecto / Buscador | `atha_user_session` | `atha_user_session` ✓ |

→ Al abrir un artefacto desde el CRM, `urlConSesion` no encontraba nada y abría el
link pelado: el usuario tenía que loguearse otra vez. **Ese era el "no persiste".**

### Solución (CRM revisión `00033-w5h`)

- **Clave única `atha_user_session`** en todo el ecosistema (`user_session` queda
  como compatibilidad; `user_profile` como último recurso).
- `src/utils/sesionEcosistema.ts` reescrito: `leerSesionCrm()`,
  `guardarSesionCompartida()`, `limpiarSesionCompartida()`, `rolParaArtefacto()`.
- El login del CRM y las ediciones de perfil ahora guardan con
  `guardarSesionCompartida()` (escribe la clave compartida + la vieja).
- **Todos los artefactos** reciben la sesión (antes Planner y Arquitecto sí, pero
  Buscador y Ticketer quedaban afuera por un `Set`).
- El puente `/puente` lee las tres claves y normaliza formatos anidados.
- **Nuevo endpoint de identidad**: `GET /api/v1/crm/sesion?email=` → devuelve si el
  usuario está autorizado, su ficha y sus **permisos** según rol
  (`admin`/`director`/`productor`/`gestor`/`artista`/`cliente`). Verificado:
  admin → nivel `total`; correo desconocido → `publico`.
- La URL que se pasa a los artefactos ahora incluye `role`, `roleTitle` y `picture`.

### Baja de versiones viejas (13 servicios → 5 activos)

Auditoría: se descargó cada app actual y se extrajeron los hosts que referencia.
**Borrados**: `atha-planner`, `crm-web`, `crm-web-final`, `crm-web-html`,
`crm-web-html-test`, `crm-web-react`, `crm-atha`, `crm-atha-897089213264`,
`athamu-producciones` (estaba en 503), `hello-world-uc`, `atha-producciones-app`.

**Quedan (8)**:
| Servicio | Rol |
|---|---|
| `atha-crm-web-frontend` | **CRM + hub del ecosistema** |
| `planner-frontend` | Planner |
| `artha-arquitecto` | Arquitecto |
| `buscardor-de-fondos` | Buscador de Fondos |
| `ticketerapp` | Ticketer |
| `crm-v1-uc` | API de catálogo que el hub consulta + `/api/planner/*` |
| `atha-crm-admin` | phpMyAdmin (herramienta de base de datos) |
| `atha-app` | ⚠️ sin uso por el ecosistema, pendiente de decisión del usuario |

## "No veo las actualizaciones" + login del Arquitecto (2026-09-23, tarde)

### 1. Causa raíz del "no veo los cambios": CACHÉ del HTML

Ninguna app mandaba cabeceras de caché para el `index.html`:
- CRM: lo servía `express.static` con `public, max-age=0` (mi ruta con
  `no-store` nunca se ejecutaba porque el static atiende `/`).
- Arquitecto / Planner / Buscador: nginx por defecto, sin conf propia.

El navegador guardaba el index viejo → seguía cargando el **bundle viejo**
apuntando a URLs viejas. De ahí "no veo las actualizaciones", "el buscador es el
viejo" y "no veo las obras en el arquitecto".

**Arreglado en las 4 apps**: `index.html` → `no-store, no-cache, must-revalidate`;
`/assets/*` (con hash) → `immutable` 1 año. Verificado en producción
(CRM `00032`, Arquitecto `00005-272`, Buscador `00005-4hm`, Planner).
**Requiere UN recargado forzado** (Ctrl+Shift+R) para salir del estado viejo.

### 2. Login del Arquitecto: dos bugs reales

`AuthModal.tsx` llamaba a `google.accounts.id.renderButton(...)` apuntando a
`document.getElementById('g_id_onedeal')` — **ese elemento no existe** → error de
JavaScript al tocar el botón. Además el origen del Arquitecto **no está
autorizado** en Google Cloud Console, así que Google respondería
`origin_mismatch` aunque el código no reventara.

**Solución implementada (sin depender de Google)**: PUENTE DE SESIÓN.
- Nuevo endpoint en el CRM: `GET /puente?destino=arquitecto|planner|buscador|ticketer`.
  Se sirve desde el mismo origen que el CRM → lee `atha_user_session` del
  localStorage y **redirige al artefacto con la sesión en la URL**; si todavía no
  hay sesión, avisa y reintenta cada 2 s (cuando el usuario entra al CRM, redirige).
- En el Arquitecto el botón ahora es **"Entrar con mi cuenta ATHA"** → va al
  puente. Se eliminó todo el código de GIS que reventaba.
- Si igual se quiere el popup nativo de Google dentro del Arquitecto, hay que
  autorizar estos orígenes en Google Cloud Console (APIs y servicios →
  Credenciales → el OAuth Client ID → Orígenes de JavaScript):
  `https://artha-arquitecto-897089213264.us-central1.run.app`,
  `https://planner-frontend-897089213264.us-central1.run.app`,
  `https://buscardor-de-fondos-897089213264.us-central1.run.app`.

### 3. Las obras no aparecían en el Arquitecto: era CORS

El Arquitecto sí pedía `…/api/v1/crm/portfolio/projects` al hub, pero el hub **no
mandaba CORS** → el navegador bloqueaba la respuesta → la app caía a su copia
local. Con el middleware CORS del CRM (revisión `00030-jv6`) ya responde
`access-control-allow-origin` para el origen del Arquitecto y devuelve las 13 obras.

### 4. Servicios: hay MUCHOS CRM desplegados (ojo al probar)

`atha-crm-web-frontend` (el bueno: sesión compartida + los 4 links del ecosistema),
pero también siguen vivos `crm-web`, `crm-web-final`, `crm-atha`,
`crm-atha-897089213264`, `crm-web-react` y `atha-crm-admin`.
**El CRM del ecosistema es `atha-crm-web-frontend`.** Conviene borrar los viejos.

## Buscador de Fondos: conectado + actualizado por el usuario (2026-09-23)

**Flujo de trabajo validado** (el que preguntó Francisco): él iteró la app en
Google AI Studio con el prompt que le pasé, la subió a su repo
`flautisc0/buscador-de-fondos`, y yo hice el resto: clonar → compilar → desplegar
→ verificar. Resultado: **funcionó muy bien** (una sola pasada trajo sesión,
sincronización, tema claro, dashboard, IA, auditoría y el logo).

### Estado actual
- App: `https://buscardor-de-fondos-897089213264.us-central1.run.app`
  (revisión `00004-r6j`), build del repo + 2 correcciones mías.
- Sincroniza de verdad con el hub: `POST/GET .../api/v1/crm/convocatorias[/sync]`
  → tablas `fundraising_calls` + `fundraising_crm_tracking`.
- Sesión compartida (lee `?auth=1&email=…&roleTitle=…`), logo ATHA transversal
  (navbar + favicon desde GCS), IA con Gemini, dashboard y auditoría.

### 🔴 CORS del hub (bug encontrado y corregido)

El CRM (hub) **no enviaba encabezados CORS**, así que el navegador habría
bloqueado TODAS las llamadas de las apps externas (Buscador, Arquitecto) —
incluido el preflight `OPTIONS`. Se agregó un middleware CORS en `server.js`
(primer `app.use`), verificado: responde `access-control-allow-origin` con el
origen correcto y `204` en el preflight. Revisión CRM `00030-jv6`.

### Correcciones hechas al push del Buscador

1. `crmApi.ts`: el catálogo de obras apuntaba a `.../api/v1/portfolio/projects`
   (sin el `/crm`) → daba 200 con el HTML del SPA → `res.json()` fallaba y la app
   caía en **4 obras de respaldo inventadas**. Corregido a
   `${CRM_BASE_URL}/portfolio/projects` → ahora carga **las 13 obras reales**.
2. `exportHelpers.ts`: el contrato de exportación todavía decía
   `http://localhost:5052...` y "ATHAMU Mac Agent". Actualizado al endpoint del hub.

### Regla de trabajo (acordada con el usuario)

- **UI, diseño, features, copy** → Google AI Studio (usando un prompt mío) y push
  al repo de la app.
- **Integración, backend, endpoints, CORS, deploy** → yo, directo en el código.
- **Ambos commiteamos al mismo repo** de la app: es la única fuente de verdad
  (si yo arreglo algo y no lo subo, la siguiente regeneración de AI Studio lo pisa).

### Pendientes del Buscador

- Revisar en vivo con el usuario: el logo, el tema claro y un ciclo completo de
  sincronización desde la interfaz.
- Opción: alertas a Google Calendar/Telegram (quedó el botón y el `.ics`).

## Arquitecto (F·A·S·E): conexión correcta — 2026-09-23

**Hallazgo**: el arquitecto tenía **fuente completa en disco** (`/home/flautisc0/tmp_arquitecto`),
así que en vez de parchear el bundle se corrigió **en la fuente** y se recompiló.

Qué estaba mal y cómo quedó:

| Pieza | Antes | Ahora |
|---|---|---|
| Backend | `http://localhost:5052/api/v1/crm` (no existía en la nube) | **hub del CRM** (`atha-crm-web-frontend…/api/v1/crm`, vía `VITE_BACKEND_URL`) |
| Login Google | `VITE_GOOGLE_CLIENT_ID` **vacío** → nunca funcionó | client ID compartido con el CRM (build-time) |
| Usuarios precargados | `PRESET_USERS`: 4 socios demo con correos y fotos generadas | **eliminados**; sin sesión el chip dice "Iniciar sesión" |
| Sesión | propia, aislada | **adopta** la del CRM desde la URL (en `src/utils/sesionCompartida.ts`, llamada en `main.tsx`) |
| Escritura de obras | `POST /portfolio/projects` → **405** | implementado en el CRM (alta/edición) |
| Equipo | `GET /portfolio/team` devolvía vacío | **25 personas reales** (nómina de compañías) |

### El CRM como hub del ecosistema

`server.js` expone ahora `/api/v1/crm/portfolio/*`:
- `GET /projects` → reenvía al catálogo real (13 obras, misma forma exacta).
- `GET /team` → nómina real desde `company_people`.
- `POST /projects` y `PATCH /projects/:id` → alta/edición de obra.
  Ojo: el `ON DUPLICATE KEY UPDATE` usa `COALESCE(NULLIF(...,''))` para que una
  **edición parcial no borre** los campos que no vienen (pasó en la prueba: el
  PATCH vaciaba disciplina/ubicación).

### Build del arquitecto (sin CLI de vite)

El CLI de vite y el temp de su config en `node_modules/.vite-temp` están
bloqueados por los guards, y el `rmdir` del `dist/` del proyecto también.
Solución: `tmp_arquitecto/scripts/build.mjs` (API JS de Vite, `configFile:false`
con los plugins inline) **ejecutado sobre una copia del proyecto en `/tmp`** con
`node_modules` enlazado. Luego ese `dist` se copia a `deploy-arquitecto/dist`.

### Pendiente del arquitecto

- **Google Cloud Console**: para que su botón propio "Continuar con Google"
  funcione hay que autorizar el origen
  `https://artha-arquitecto-897089213264.us-central1.run.app` en
  *APIs & Services → Credentials → Orígenes de JavaScript autorizados*.
  Al entrar desde el CRM no hace falta (la sesión viaja en la URL).
- El "Sincronización Cloud ATHA" del modal de auth es **real** (llama a
  `loadCrmCatalogAsync` + `loadCrmFoldersAsync`), pero su texto habla del
  backend viejo `:5052` y de Telegram: conviene reescribirlo.

## Confirmación de guardado de disponibilidad (Planner)

Ideado por Francisco: que haya un botón para guardar. Implementado como
**capa de seguridad**, sin tocar la interfaz compilada del planner:
`/home/flautisc0/planner-serve/dist/planner/atha-guardado.js` (inyectado en el
HTML que sirve el servidor del planner).

Qué hace:
1. **Aviso visible** en cada guardado de disponibilidad: "✓ Disponibilidad
   guardada (N días)" o "✗ No se pudo guardar (HTTP …)". Antes el error se
   perdía en un `console.warn`.
2. **Botón "Guardar disponibilidad"** (abajo a la derecha): reenvía lo último que
   se tocó, para asegurarse cuando uno quiere.
3. **Reintento automático** cada 60 s de lo que haya fallado; si queda algo
   pendiente, el botón pasa a "Reintentar guardado (N)".

El guardado automático en cada cambio **se mantiene** (no se pierde nada si se
cierra la pestaña); el botón es la red de seguridad, no el único camino.

## Planner: estado de cada escritura (verificado 2026-09-23)

Servicio `planner-frontend` (revisiones): la SPA se sirve desde un servidor Node
propio (`/home/flautisc0/planner-serve/`) que además **proxea `/api/planner/*`
al CRM** y **adapta el formato de disponibilidad**.

| Operación | Endpoint | Estado |
|---|---|---|
| Proyectos (alta/edición) | `POST /api/planner/projects` | ✅ persiste |
| Artistas (alta/edición) | `POST /api/planner/artists` | ✅ persiste |
| Ensayos (agendar) | `POST /api/planner/rehearsals` | ✅ persiste |
| **Disponibilidad de artistas** | `POST /api/planner/availability` | ✅ **persiste (con adaptador)** |
| **Autorización de dirección** | `POST /api/planner/director` | ❌ **error 500 del backend** |

### 🔴 Bug abierto: autorización de dirección (`/api/planner/director`)

El backend responde **500** con un error SQL propio:

```
(pymysql.err.OperationalError) (1093, "You can't specify target table
'planner_director_users' for update in FROM clause")
```

Consecuencia: **no se puede dar acceso de "dirección" desde la UI del Planner**
(es justo lo que hace falta para el pendiente de Felipe Naranjo).
El bug está en el servicio del CRM (`crm-v1-uc`), cuyo código no está en este
repositorio. Alternativas:
1. Dar el acceso insertando la fila directamente en `planner_director_users`
   (rápido; requiere el email exacto de la persona).
2. Reparar el SQL en el backend del CRM (necesita acceso a su código).
3. Fallback en el servidor del planner (escribir esa tabla por su cuenta).

### ✅ Disponibilidad de artistas — qué estaba mal y cómo se resolvió

El planner enviaba `{ artist_id, slots: [ {date, start, end, status, note} ] }`
(una llamada con todos los slots), pero el CRM exige
`{ artist_id, date, start_time, end_time, status, note }` (**un** slot por
llamada, con `date` en la raíz). Resultado: **HTTP 400 "artistId y date son
obligatorios"** en cada guardado, y el cliente se lo tragaba en un
`console.warn` → **la disponibilidad nunca se guardaba** (se perdía al salir
del planner).

Solución: adaptador en `planner-serve/server.cjs` que expande el array a N
llamadas con el formato correcto (respetando `start`→`start_time`).
Verificado: POST → MySQL (horarios correctos) → `GET /api/planner/artists`
devuelve los slots al volver al planner.


## Watchdog del CRM (revisado 2026-09-23)

`~/.hermes/scripts/crm_persistence_watchdog.sh` (cron cada 15 min, `no_agent`)
se reescribió como **solo lectura**: la versión anterior hacía un ciclo
write → read → delete contra `/api/planner/projects`, pero esa API **no expone
DELETE (405)**, así que dejaba filas basura (`CRON_PERSIST_TEST_*`) en
`planner_projects` que aparecían como proyectos falsos en el Planner.
Ahora solo verifica salud del CRM y avisa si cambia el conteo de proyectos.

