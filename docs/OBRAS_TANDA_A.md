# Tanda A · Catálogo de obras: ficha, fotos y archivos

Fecha: 2026-09-28. Pedido de Francisco: *"necesitamos mejorar la interacción con las obras,
deberíamos poder subir archivos por obra y el botón dice dossier PDF y eso no es lo que hace
realmente"*, más portada/carrusel, formato de música, logo de la compañía y los cruces a
Ventas / Planner / Arquitecto (ver `docs/CONTRATO_CATALOGO_ARCHIVOS.md`).

## 1 · El bug del "Dossier PDF" (por qué el botón mentía)
Los dossieres **existían** (`…/obras/radojka/dossier.pdf` responde 200) pero el botón nunca los
mostraba: los archivos vivían como **texto** dentro de `projects.dossier_highlights` y la interfaz
buscaba el dossier con la regla *"algún texto que empiece con `/obras/`"*, que **no coincidía** con
las URLs guardadas (`https://storage.googleapis.com/…`). Resultado: `dossierPdf` siempre vacío.

**Arreglado en los dos lados**: los archivos ahora son filas en `project_files` y el CRM lee
`dossier_url` del catálogo enriquecido. Se verificó: **12 de 13 obras ya muestran su dossier real**.

## 2 · Lo que quedó construido

**Base de datos** (`scripts/migrar_obras_archivos.cjs`, idempotente — se puede correr N veces):
- `companies.logo_url` (logo de quien presenta) y `projects.ficha` (bloques por disciplina, JSON).
- Tabla **`project_files`** (id, project_id, tipo, nombre, url, mime, bytes, es_portada, subido_por, created_at).
- **Migración**: cada URL de `dossier_highlights` pasó a `project_files` con su tipo (dossier/PDF,
  video si es YouTube/Vimeo, otro). No se borró nada de `dossier_highlights`.

**Endpoints nuevos del hub:**
| Ruta | Qué hace |
|---|---|
| `POST /api/v1/crm/archivo` | Sube **cualquier archivo** (PDF, Word, planilla, imagen) al bucket del ecosistema. **Tope 15 MB** (ver pitfall abajo). Admin/producción. |
| `GET/POST /api/v1/crm/portfolio/projects/:id/files` | Lista y registra archivos o enlaces de la obra |
| `DELETE /api/v1/crm/files/:fileId` | Quita un archivo de la obra |
| `PUT /api/v1/crm/portfolio/projects/:id/ficha` | Edita la ficha (parcial: lo que no viene no se pisa) + bloque `ficha` (música) |
| `GET /api/v1/crm/portfolio/projects` **(enriquecido)** | Cada obra suma `logo_url` de su compañía, `ficha`, `files` y `dossier_url` |
| `PUT /api/v1/crm/companies/:id` **(ampliado)** | Acepta `logoUrl` |

**SPA** (`src/components/DossierModal.tsx`, `CatalogoObrasSection.tsx`, `apiClient.ts`, `App.tsx`):
- La ficha de la obra tiene dos pestañas: **Ficha & archivos** y **Dossier imprimible** (el dossier
  imprimible se mantuvo intacto).
- **Portada + carrusel de fotos**: se sube portada (6 MB) y fotos (cualquier cantidad, tipo `foto`);
  un clic en una foto la hace portada. Esto llena el espacio vacío que Francisco vio.
- **Logo de la compañía** en la tarjeta del catálogo y en la cabecera de la ficha; se sube desde
  *Compañías → Editar ficha → Subir logo*.
- **Bloque "Música en la obra"**: formato **envasada / en vivo / mixta** + músicos + instrumentos
  (sirve también para teatro con música en vivo).
- **Panel de archivos**: subir archivo, agregar enlace (YouTube/Drive), listar con tipo, peso, autor
  y fecha, abrir y borrar.
- **Botón honesto**: "Ficha y dossier" cuando hay dossier; **"Ficha (sin dossier)"** cuando no, y en
  la ficha "Sin dossier — subir".
- **Cruces**: *Agendar ensayos* (Planner) y *Abrir en Arquitecto* abren las apps del ecosistema con
  la sesión **y la obra** (`urlConSesion(..., { obra })`); *Llevar a Ventas* navega a
  `/?ir=ventas&obra=<id>`.

## 3 · Verificación
- Batería `scripts/probar_catalogo_archivos.py` (**33 comprobaciones**, crea su propia obra de prueba
  y la borra): ficha parcial + validaciones, archivos (alta/listado/borrado/404), subida genérica
  (mime no permitido, exceso de tamaño), permisos (403 para quien no es admin/producción) y logo de
  compañía.
- En el tag: páginas 200 · catálogo con **12/13 dossieres reales** · bundle con las cadenas nuevas y
  **0** rastros de la regla rota · batería **32 ok / 1 fallo** (el fallo era el límite de 15 MB →
  corregido, ver abajo).

## Pitfalls aprendidos (van a la skill)
1. **La plataforma corta los requests en 32 MB** (Cloud Run/GFE). Como el archivo viaja en base64
   (+33%), el tope real de subida es **15 MB**, no 25. Con 25 MB el usuario recibía un **413 en HTML**
   en vez de un aviso. El body parser del hub subió de 12 MB a 40 MB para acompañar.
2. **`companies` no tenía logo** y el `GET /companies` no lo devolvía: hay que agregar el campo **y**
   el mapeo (el `PUT` guardaba pero la lectura no lo mostraba — lo cazó la batería).
3. El **fuente real del CRM es el proyecto raíz** (`src/`) y la imagen lo recompila: los cambios de
   SPA requieren `hub_deploy_source_tag.sh`, no el script que sólo reemplaza `server.js`.

## Pendientes que deja la Tanda A
- La página del hub `/companias` todavía no tiene el campo de logo (el SPA sí).
- **Generar el dossier PDF desde la ficha** (paso siguiente: el dossier deja de ser un archivo que se
  desactualiza).
- **Tanda B**: elenco con cuentas de la plataforma, roles por obra (dirección/elenco/equipo),
  invitación por correo, invitados de otra compañía y permisos por ámbito.
- **Tanda C**: que el Planner lea `obra` y arme los ensayos con la ficha, el elenco y las fechas.
- Bloque "Anfitrión" de `streaming`/"planner" en la ficha: el planner hoy no conoce `crm_project_id`
  (la columna existe en `planner_projects`, sin usar).
