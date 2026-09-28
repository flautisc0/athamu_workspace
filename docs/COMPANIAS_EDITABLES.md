# Compañías: editar de verdad + sacar los textos de "SQL"

Fecha: 2026-09-27. Pedido de Francisco al empezar la revisión de pestañas del CRM: *"lo primero es
que hay que eliminar los textos que digan SQL, no es necesario; lo que debería ocurrir es que uno
pueda editar todos los datos de la compañía, por ejemplo la descripción, el elenco, los montajes
deberían linkearse con la obra del catálogo real"*.

## 1 · Textos de "SQL": fuera (en el FUENTE, no en el bundle)

**El fuente del CRM es el proyecto raíz** (`~/athamu_workspace/src`, vite + React) — no
`athamu_app_new/frontend`, que es una copia vieja (todavía usa `/api/v1/crm/entities` y `/seed`).
Se comprueba en un minuto: `grep -oE "/api/v1/crm/[a-z0-9/_-]+"` sobre el bundle servido y sobre
`src/`; si coinciden, es el fuente bueno.

**Trampa que costó dos deploys**: hay **dos formas de desplegar el hub** y no son equivalentes.
- `hub_deploy_tag.sh` construye la imagen **desde la imagen ya desplegada** y **sólo copia
  `server.js`**: es rápido y seguro para cambios del backend, pero **el SPA (`src/`, `dist/`) queda
  congelado** en lo que traía la imagen base. Con ese script, los cambios de SPA **no llegan** —
  se ve el bundle viejo aunque el deploy diga "Done".
- `hub_deploy_source_tag.sh` (nuevo) hace `gcloud run deploy --source`: Cloud Build corre el
  `Dockerfile`, que **recompila la SPA** (`vite build`) y arma la imagen completa. **Todo cambio en
  `src/` requiere este camino.**
- Ese deploy necesita **`.gcloudignore`** en la raíz: el workspace pesa 5,3 GB (con
  `athamu_app_new/`, APKs, zips y `.venv/`) y sin el archivo se intentaría subir todo. Con el
  ignore queda en ~60 MB (src + public + configs).

Textos quitados en `src/components/sections/CompaniasSection.tsx` (visibles): "vinculada en SQL"
del alta → "¡Agrupación creada con éxito!", "SQL Tags Vinculados" → "Agrupaciones",
"…miembros asignados por etiqueta SQL…" → "…el elenco, los montajes del catálogo…",
"Tag SQL: …" → "ID interno: …", "Tag SQL (Identificador de Base de Datos)" → "ID interno (opcional)".
Los `console.warn` internos se dejan (no se ven) y el panel de diseño / estudio SQL son otra
pantalla.

> Nota: queda en el repo `scripts/parchear_textos_sql.py` (cirugía del bundle con anclajes
> verificados + `node --check` + backup) por si alguna vez hay que tocar un bundle **sin** fuente.
> Con el fuente a mano, no hace falta.

## 2 · Editar todos los datos de la compañía (`/companias`)

La pestaña Compañías del SPA trabaja sobre una **lista local** (`initialCompaniesData` +
`onUpdateCompanies`): no guarda en la base. Como el fuente no está, la edición real se hizo como
**página del hub** — igual que `/nodos`, `/agenda`, `/reportes` y `/tablero`:

**🔗 `https://atha-crm-web-frontend-897089213264.us-central1.run.app/companias`**

Qué se puede hacer:
- **Datos**: nombre, razón social, disciplina, tipo (propia / colaboradora), ciudad, correo de
  contacto, estado y **descripción** → *Guardar cambios* con confirmación explícita
  ("Guardado ✓") y botón *Descartar*.
- **Montajes**: se listan las obras que la agrupación tiene en el **catálogo real** y se pueden
  **vincular obras del catálogo** o **quitar** el vínculo (la obra sigue en el catálogo). Se
  guarda al instante.
- **Elenco y equipo**: se agregan, editan (rol y tipo: elenco / equipo / socio / colaborador) y
  quitan personas de la agrupación.

### Endpoints nuevos (hub)
| Método y ruta | Qué hace |
|---|---|
| `PUT /api/v1/crm/companies/:id` | Edita los datos de la agrupación (nombre vacío y "nada que actualizar" se rechazan con mensaje) |
| `POST /api/v1/crm/companies/:id/projects` | Vincula una obra **del catálogo** (`projects.company_id`); si ya es de otra agrupación responde **409 con el nombre de esa agrupación** |
| `DELETE /api/v1/crm/companies/:id/projects/:projectId` | Desvincula el montaje (la obra queda en el catálogo, sin agrupación) |
| `PUT /api/v1/crm/companies/:id/people/:personId` | Edita una persona del elenco |
| `GET /api/v1/crm/portfolio/projects` **(enriquecido)** | El catálogo se sirve desde `crm-v1` (misma base: se verificó que los 13 ids coinciden) y **no decía de quién era cada obra**; ahora el hub lo enriquece con `company_id` + `company_name` |

**Verificación** (batería de 30 comprobaciones con una agrupación y una obra de prueba, borradas al
final): página y datos ✓ · `PUT` guarda y valida ✓ · elenco alta/edición ✓ · montajes
vincular/desvincular ✓ · no se puede robar una obra de otra agrupación (409) ✓ · obra inexistente
404 ✓ · la obra desvinculada **sigue en el catálogo** ✓.

## 3 · Integrantes: sin "cargo • personaje" y editables

Pedido: *"en ATHA Kids salen cargos y personajes por cada integrante, eso no debería ser así,
quizás sólo sería bueno que pudiera editarse"*.

El problema era de datos + de vista: cada integrante de ATHA Kids tenía un `character_name` fijo
("Estrella de Belén", "Duende Relojero", "Santa Claus / Narrador"…) que en realidad son **papeles de
un montaje**, no datos de la persona. La nómina los mostraba pegados al cargo
(`{roleTitle} • {characterName}`), así que parecía que cada integrante "era" ese personaje.

Qué se hizo:
- La **nómina muestra persona + cargo** (y su tipo: elenco / equipo / socio / colaborador). El
  personaje **ya no aparece en la lista**.
- Cada integrante tiene **Editar** (en la pestaña del SPA y en `/companias`): nombre, cargo, tipo,
  correo y —**opcional**— el personaje, con la aclaración *"sólo si es un papel de un montaje; se
  puede dejar vacío"*. Guarda con `PUT /api/v1/crm/companies/:id/people/:personId` y confirma
  ("Integrante actualizado ✓").
- **No se borraron datos**: los personajes que ya estaban siguen en la base. Francisco (o quien
  administre) los puede vaciar o corregir integrante por integrante con el botón Editar.

Verificación: en el bundle servido el patrón viejo (`characterName ?`) quedó en **0** y aparece la
edición de integrante; la batería de endpoints sigue TODO OK.

## Pendientes que dejó esta tanda
1. **El SPA se compila para desplegarlo** (ver arriba): todo cambio de `src/` va por
   `hub_deploy_source_tag.sh`, no por el script que sólo reemplaza `server.js`.
2. Las secciones del SPA que siguen con **datos locales** (no guardan): varias usan
   `initialXData` en `App.tsx`. La auditoría de a una por pestaña sigue pendiente.
3. Los endpoints de compañías **no validan permisos** (heredado): cualquiera con la URL puede
   escribir. Conviene exigir sesión de administración/producción.
