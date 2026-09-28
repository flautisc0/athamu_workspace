# Contrato · Catálogo de obras con archivos y ficha por disciplina (Tanda A)

Fecha: 2026-09-28. Define lo que se construye en la Tanda A para que hub, base de datos y SPA
encajen sin retrabajo. El hub es `~/athamu_workspace/server.js`; la SPA es `~/athamu_workspace/src`.

## 1 · Base de datos (todo idempotente)

```sql
-- Logo de la compañía que presenta la obra
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) NULL;   -- (MySQL 8 no soporta IF NOT EXISTS acá: se chequea information_schema)

-- Columna flexible para los bloques por disciplina (música, teatro, técnico…)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ficha JSON NULL;

-- Archivos y fotos de una obra
CREATE TABLE IF NOT EXISTS project_files (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  project_id   VARCHAR(64)  NOT NULL,
  tipo         VARCHAR(24)  NOT NULL DEFAULT 'otro',   -- dossier | rider | prensa | foto | video | otro
  nombre       VARCHAR(255) NOT NULL,
  url          VARCHAR(900) NOT NULL,
  mime         VARCHAR(120) NULL,
  bytes        BIGINT       NULL,
  es_portada   TINYINT(1)   NOT NULL DEFAULT 0,
  subido_por   VARCHAR(190) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pf_project (project_id),
  KEY idx_pf_tipo (tipo)
);
```

**Migración**: cada entrada de `projects.dossier_highlights` que sea una URL se copia a
`project_files` (tipo `dossier` si termina en `.pdf`, `video` si es youtube/vimeo, si no `otro`) y no
se vuelve a migrar (clave: `project_id + url`). Los textos sin URL («Trailer: …») se dejan como
están. **No se borra nada de `dossier_highlights`.**

## 2 · Endpoints del hub

| Método y ruta | Body / respuesta |
|---|---|
| `POST /api/v1/crm/archivo` | `{nombre, dataUrl, carpeta?}` → `{ok, url, bytes, mime}`. Cualquier mime, **máx 25 MB**; carpeta por defecto `obras`. Sólo administración/producción. |
| `POST /api/v1/crm/portfolio/projects/:id/files` | `{tipo, nombre, url, mime?, bytes?}` → `{ok, file}`. Registra un archivo ya subido o un enlace. |
| `GET /api/v1/crm/portfolio/projects/:id/files` | → `{ok, files:[…]}` |
| `DELETE /api/v1/crm/files/:fileId` | → `{ok}` |
| `PUT /api/v1/crm/portfolio/projects/:id/ficha` | `{title, synopsis, description, discipline, category, duration, targetAudience, format, premiereDate, status, isPublic, companyId, imageUrl, ficha:{…}}` → `{ok, project}`. Actualización parcial: lo que no venga no se pisa. |

**Enriquecido del catálogo** (`GET /api/v1/crm/portfolio/projects`, que proxea a crm-v1 y hoy ya
agrega `company_id`/`company_name`): cada obra suma `logo_url` (de su compañía), `ficha` (objeto
JSON), `files` (array de `project_files`) y `dossier_url` (primer archivo tipo `dossier`).

## 3 · SPA (fuente real: `src/`, se compila con `npm run build`)

- **Portada y carrusel** en la ficha de la obra: portada = `image_url`; carrusel = archivos tipo
  `foto`. Botones *Cambiar portada* y *+ Fotos* (suben por `POST /api/v1/crm/archivo` y registran).
- **Logo de la compañía** visible en la tarjeta y en la cabecera de la ficha (campo nuevo en
  Compañías: `logoUrl` aceptado por `PUT /api/v1/crm/companies/:id`).
- **Bloque «Música en la obra»**: `ficha.musica = {formato: 'envasada'|'vivo'|'mixta', musicos, instrumentos}`.
  Aparece también cuando la disciplina es Teatro.
- **Ficha editable** con el endpoint nuevo (guardado explícito + confirmación visible).
- **Panel de anexos**: subir archivo (25 MB), agregar enlace, listar con tipo/peso/autor/fecha,
  abrir y borrar.
- **Botón honesto**: si la obra no tiene archivo tipo `dossier`, se muestra *«Sin dossier — subir»*;
  nunca un botón que no haga nada.
- **Cruces**: `🧱 Arquitecto` y `📅 Planner` (apps aparte) usan `urlConSesion(id, url, {obra})`
  agregando `&obra=<crm_project_id>`; `🎟 Ventas` navega dentro del CRM con `?ir=ventas&obra=<id>`.

## 4 · Reglas

- Idioma: español neutro (tuteo), nunca voseo.
- No borrar datos existentes; la migración sólo copia.
- Subir archivos: administración y producción. El catálogo lo ve quien entra al CRM.
- Verificación obligatoria antes de promover: batería de endpoints + conteo de cadenas en el bundle.
