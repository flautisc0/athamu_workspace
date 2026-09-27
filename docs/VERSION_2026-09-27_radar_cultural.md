# Versión registrada · Radar Cultural (2026-09-27)

Registro LOCAL de la versión que quedó aprobada como prototipo y desplegada en web.
Sirve para volver exactamente acá si algo se rompe más adelante.

## Qué quedó desplegado

| Pieza | Commit | Revisión Cloud Run | URL |
|---|---|---|---|
| App FASE Mobile | `087b2ef` (repo `fase-mobile`) | `fase-mobile-00029-4x8` | https://fase-mobile-897089213264.us-central1.run.app |
| Hub / CRM | `53861db` (repo `athamu_workspace`) | `atha-crm-web-frontend-00089-buv` | https://atha-crm-web-frontend-897089213264.us-central1.run.app |

Tags locales (sin publicar): `radar-cultural-2026-09-27` (app) y
`hub-radar-cultural-2026-09-27` (hub).

Este commit del doc es **local**: no se publicó a GitHub a propósito.

## Qué incluye esta versión

### App
- **Navegación**: Inicio · Radar · Rutas · Muro · Perfil. Se quitaron **CRM** y **Chat**.
- **Inicio** (`InicioView.tsx`): tarjeta de perfil (foto, descripción, disciplinas, nivel) +
  agenda cultural (próximos eventos con hora/lugar/distancia) + cartelera de obras públicas.
- **Radar** (`RadarCercania.tsx`): lista "Todo cerca" por distancia real, filtros por grupo
  de categoría, horario del lugar si está cargado, "Cómo llegar" (navegación del teléfono) y
  "Ver agenda"; el mapa real (Google Maps) en el mismo toggle Lista/Mapa.
  Los lugares NO descubiertos siguen sin revelar su nombre.
- **Tercer modo de apariencia "Papel"** (Perfil → Apariencia y Colores): paleta del mock de
  Claude Design, títulos en Fraunces, texto en Instrument Sans (fuentes OFL en
  `public/assets/fonts/`), acento terracota automático. Se aplica remapeando la paleta
  neutra bajo `.tema-papel` en `src/index.css`.
- **Distintivo FASE** siempre visible (símbolo terracota fijo, arriba de la barra).
- **Perfil**: el nombre persiste de verdad (se mandaba sólo al teléfono), con confirmación
  visible; organización y disciplinas también se guardan.
- **Agrupaciones**: dirección/producción puede crear una agrupación desde el mismo selector
  (creador queda `owner`).
- La app abre en **Inicio**.

### Hub
- `PATCH /radar/perfil`: nombre y foto van a `users` (cuenta); `org_name` y `disciplines`
  a `radar_profiles` (columnas agregadas idempotente). `exploradorId` dejó de sobrescribir
  el nombre con cada llamada, y el login de Google respeta el nombre elegido.
- `puedeCrearAgrupacion` + `POST /companias/nueva`; `/companias/mias` devuelve `puede_crear`.
- `GET /radar/eventos`: eventos reales (`events`) + cartelera (`projects`), con `distance_m`
  cuando se manda la ubicación; ordena por cercanía.
- `POST /radar/eventos`: publicar funciones (producción de la agrupación o administración);
  guarda `source`/`source_url` para lo externo.
- Columnas nuevas: `events.venue_id, city, lat, lng, is_public, image_url, ticket_url,
  source, source_url`; `radar_nodes.hours`.

## Cómo volver atrás

```bash
# App (web: no toca el APK)
gcloud run services update-traffic fase-mobile \
  --project=athamubot --region=us-central1 \
  --to-revisions=fase-mobile-00029-4x8=100

# Hub
gcloud run services update-traffic atha-crm-web-frontend \
  --project=athamubot --region=us-central1 \
  --to-revisions=atha-crm-web-frontend-00089-buv=100
```

Redeploy del código de esta versión: `git checkout <tag>` y
`bash deploy/deploy.sh` (app) / `bash /tmp/hub_deploy_yaml.sh` (hub).

## Pendientes de esta versión

1. **La tabla `events` está vacía**: el inicio muestra su estado vacío hasta que se cargue la
   primera función (por `POST /radar/eventos` o desde el calendario del CRM).
2. **Horarios de los 15 lugares** sin cargar (`radar_nodes.hours`).
3. **Ingestor de cartelera externa**: falta decidir las fuentes (agendas municipales,
   Chile Cultura, salas) y si se acepta scraping/API.
4. **Formulario "publicar función"** dentro de la app para productores (hoy sólo endpoint).
5. **`.github/workflows/ios-build.yml`** sin publicar (el token de git no tiene scope
   `workflow`).
6. **Push notifications**: diferidas a propósito (exigen recompilar el APK).
