# Contrato · Tandas B y C (elenco con cuentas · puente al Planner)

Fecha: 2026-09-28. Continúa `docs/CONTRATO_CATALOGO_ARCHIVOS.md` (Tanda A, ya desplegada).
Reglas generales: español neutro (tuteo, nunca voseo) · no borrar datos existentes · cambios
parciales que no pisen lo que no viene · verificar antes de dar algo por bueno · **no mandar correos
a personas reales en las pruebas** (usar el buzón del agente `fase.athamu@gmail.com`).

## Reparto de archivos (para trabajar en paralelo sin pisarse)
| Quién | Toca SOLO | No toca |
|---|---|---|
| Subagente HUB | `server.js` | `src/**`, `planner-src/**` |
| Subagente SPA | `src/**` | `server.js`, `planner-src/**` |
| Subagente PLANNER | `athamu_app_new/planner-src/**` | `server.js`, `src/**` |

## Tanda B · Elenco con cuentas de la plataforma y roles por obra

La tabla **`project_members` ya existe y está vacía**:
`id, project_id, user_id, role, display_name, phone, notes, is_active, joined_at, created_at, title,
bio, image_url, email, location, active_projects, discipline`.

Mapeo acordado:
- `role` = rol **en la obra**: `direccion` | `elenco` | `equipo` | `produccion`.
- `title` = **personaje** en esta obra (puede ir vacío).
- `user_id` = cuenta de `users.id` (nullable). Se vincula sola si `email` coincide con `users.email`.
- `notes` = origen, p. ej. `viene de TMLL` cuando es invitado de otra compañía.
- `is_active` = 1. Al quitar, se borra la fila (no se marca inactivo).

**Regla de oro**: todo integrante debe pertenecer a una **compañía registrada**. Al inscribir, el
nombre debe existir en `company_people` de alguna compañía; si no, se responde **400** con un mensaje
que ofrezca agregarla a su compañía (nunca se crean personas sueltas desde la obra).

### Endpoints (escritura: sólo administración/producción vía `alcanceInventario`)
| Ruta | Qué hace |
|---|---|
| `GET /api/v1/crm/portfolio/projects/:id/cast` | Lista el elenco de la obra con su cuenta vinculada: `{ok, cast:[{id, displayName, email, role, personaje, compania, cuenta:{id,email,name,picture,role}|null, esInvitadoDeOtraCompania}]}` |
| `POST /api/v1/crm/portfolio/projects/:id/cast` | `{displayName, email?, role, personaje?, desdeCompaniaId?}` → crea. Vincula `user_id` si el correo existe en `users`; si `desdeCompaniaId` ≠ compañía que presenta → `notes='viene de <compañía>'` |
| `PUT /api/v1/crm/portfolio/projects/:id/cast/:castId` | Edita rol, personaje, correo (parcial) |
| `DELETE /api/v1/crm/portfolio/projects/:id/cast/:castId` | Quita del elenco de la obra |
| `POST /api/v1/crm/portfolio/projects/:id/cast/:castId/invitar` | Manda **un** correo de invitación (emisor del ecosistema) con el nombre de la obra y su rol, usando `enviarCorreo({para, asunto, html})`. Sólo cuando se llama; jamás automático |

**Lectura**: administración/producción, o alguien cuyo correo esté en el elenco de esa obra.

## Tanda C · Puente al Planner

Hoy el CRM ya abre el Planner con la sesión puesta (`urlConSesion('planner', URL, { obra })` agrega
`&obra=<id>`), pero el Planner **no lee** ese parámetro ni conoce `crm_project_id`.

1. **Hub**: `GET /api/v1/crm/planner/montaje/:id` → devuelve todo lo que el Planner necesita para
   armar los ensayos:
   ```json
   { "ok": true, "montaje": {
       "id": "…", "title": "…", "synopsis": "…", "discipline": "…", "category": "…",
       "duration": "…", "targetAudience": "…", "format": "…", "status": "…", "premiereDate": "…",
       "image": "…",
       "compania": { "id": "…", "nombre": "…", "logo": "…" },
       "musica": { "formato": "envasada|vivo|mixta", "musicos": "…", "instrumentos": "…" },
       "tecnico": { "anchoMin": "…", "fondoMin": "…", "altoMin": "…", "carga": "…", "personal": "…" },
       "elenco": [ { "nombre": "…", "rol": "direccion|elenco|equipo|produccion", "personaje": "…", "email": "…", "cuenta": true|false } ],
       "funciones": [ { "id": "…", "fecha": "YYYY-MM-DD", "hora": "…", "lugar": "…" } ]
   } }
   ```
   `funciones` sale de `events WHERE obra_id = :id` (la columna ya existe). Autorización: sesión con
   token del hub o administración/producción.
2. **Planner** (`athamu_app_new/planner-src`): al cargar con `?obra=<id>` en la URL, pedir ese montaje
   al hub y **abrir/crear el montaje** en `planner_projects` vinculándolo por `crm_project_id`
   (la columna existe y hoy nadie la usa), con la ficha, el elenco y las fechas. Si el montaje ya
   existe (mismo `crm_project_id`), se abre sin duplicar. El login actual se mantiene intacto.
   - Deploy propio del Planner (servicio Cloud Run `planner-frontend`), **con tag y sin tráfico**:
     `gcloud run deploy planner-frontend --source athamu_app_new/planner-src --project=athamubot
      --region=us-central1 --tag=<tag> --no-traffic --allow-unauthenticated`

## Verificación (obligatoria, antes de promover)
- `node --check server.js`, `python3 -m py_compile` de los scripts, `npm run build` del CRM y build
  del Planner.
- Baterías: `scripts/probar_catalogo_archivos.py` (no debe romperse) y una nueva
  `scripts/probar_elenco_planner.py`: elenco (alta/edición/borrado, 400 si la persona no está en
  ninguna compañía, 403 sin permiso, vinculación automática por correo existente) y montaje del
  Planner (200 con elenco y funciones, 403/401 sin permiso, 404 si la obra no existe).
  Todo con datos de prueba propios, borrados al final. La invitación se prueba **al buzón del
  agente**, nunca a un tercero.
