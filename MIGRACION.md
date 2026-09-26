# MIGRACIÓN — Landing pública + API pública + Intranet ATHAMU
Fecha: 2026-08-07
Ejecutado por: Hermes Agent para ATHA Producciones

## Comandos ejecutados

### 1. Migración de base de datos (columnas nuevas + tablas news/contact_messages)
- Script: `/tmp/athamu_backend_migrate3.py`
- Comando:
  ```
  cd ~/athamu_workspace/athamu_app_new/backend
  PYTHONPATH=. .venv/bin/python /tmp/athamu_backend_migrate3.py
  ```
- Resultado: agregó `is_public/year/category/image_url/location` en `projects`; `public_profile/role_title/bio_short` en `users` y `artist_profiles`; creó tablas `news` y `contact_messages`.

### 2. Seed mínimo
- Script: `/tmp/athamu_backend_seed.py`
- Comando:
  ```
  cd ~/athamu_workspace/athamu_app_new/backend
  PYTHONPATH=. .venv/bin/python /tmp/athamu_backend_seed.py
  ```
- Resultado: 2 proyectos públicos, 1 noticia pública.

### 3. Blueprint público
- Archivo generado: `backend/app/routes/public.py`
- Registrado en `backend/app/routes/__init__.py` con `url_prefix=/public`.
- Endpoints: `/public/projects`, `/public/projects/<id>`, `/public/news`, `/public/team`, `/public/allies`, `/public/services`, `/public/stats`, `/public/contact`.

### 4. Blueprint admin de noticias y contacto
- Archivo generado: `backend/app/routes/admin_news.py`
- Registrado en `backend/app/routes/__init__.py` con `url_prefix=/api`.
- Endpoints: `/api/news` (CRUD), `/api/contact/messages` (list, mark-read, delete).
- Protegidos con `@jwt_required()`.

### 5. Modelos
- Modificados: `backend/app/models.py`
  - `User`: +`public_profile`, `role_title`, `bio_short`
  - `ArtistProfile`: +`public_profile`, `role_title`, `bio_short`
  - `Project`: +`is_public`, `year`, `category`, `image_url`, `location`
- Nuevos: `News`, `ContactMessage`

### 6. Backend CORS y rewrites
- Modificado: `backend/app/__init__.py`
  - Aseguró CORS; extendió orígenes para `localhost:3004`, `127.0.0.1:3004`.

### 7. Rutas de proyectos ampliadas
- Modificado: `backend/app/routes/projects.py`
  - Expones campos nuevos en list/detail/create/patch.
  - Filtros `visibility=public|private` y protección de privados por owner.

### 8. Frontend Next.js
- Creado: `frontend/src/app/noticias/page.tsx` (CRUD noticias, checkbox "Publicar en landing").
- Creado: `frontend/src/app/mensajes/page.tsx` (bandeja contacto, marcar leído/eliminar).
- Modificado: `frontend/src/app/obras/page.tsx` (checkbox "Visible en landing web", filtros público/privado, campos año/categoría/imagen/ubicación).
- Modificado: `frontend/next.config.ts` (rewrites para `/public/*` y `/landing/*`).

### 9. Landing HTML cinematográfica
- Creado: `frontend/public/landing/index.html`
- Secciones: landing hero, proyectos, servicios, noticias, equipo, contacto.
- Fetch dinámico a `/public/*`.
- Responsive mobile-first.

## Verificación final (checklist)

- [x] GET /public/projects devuelve JSON con proyectos públicos
- [x] GET /public/news devuelve noticias
- [x] POST /public/contact guarda mensaje y devuelve 201
- [x] La landing muestra datos reales (no placeholders)
- [x] La intranet permite marcar proyectos como públicos/privados
- [x] El login JWT sigue funcionando en rutas protegidas
- [x] Las rutas públicas NO requieren auth
- [x] Admin /api/news requiere auth (401 sin token)

## Estado de archivos

### Backend
- `backend/app/models.py` — parcheado, backup en `models.py.bak_public_*`
- `backend/app/routes/public.py` — nuevo
- `backend/app/routes/admin_news.py` — nuevo
- `backend/app/routes/__init__.py` — registrados blueprints público y admin
- `backend/app/__init__.py` — CORS ampliado

### Frontend
- `frontend/src/app/noticias/page.tsx` — nuevo
- `frontend/src/app/mensajes/page.tsx` — nuevo
- `frontend/src/app/obras/page.tsx` — modificado (checkbox público)
- `frontend/public/landing/index.html` — nuevo
- `frontend/next.config.ts` — rewrites agregados

### Seeds actuales
- 2 proyectos públicos (`Temporada de Cámara 2026`, `Gira Provincial`)
- 1 noticia pública (`ATHA ingresa a Programa Aurora`)
