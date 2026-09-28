# BETA 1 · ecosistema FASE / ATHA

Fecha: 2026-09-27. Es el cierre del prototipo para empezar la **prueba real de las dos capas**:

- **Capa 1 · la app (FASE Mobile)** — el "de pie": lo que entra al ecosistema desde la calle.
- **Capa 2 · el CRM (hub + paneles)** — la "mesa de trabajo": donde se administra y se corrige.

## Qué contiene Beta 1

### Capa 1 · la app
- **Inicio**: agenda cultural real (23 funciones de Rancagua, 19 geolocalizadas) como **5 tarjetas
  abribles** con foto, descripción, fuente y entradas; anillos de cercanía (a pie ≤2 km / ≤10 km /
  resto detrás de "Ver N funciones más"); cartelera de obras.
- **Radar**: lista por cercanía con filtros y mapa (Google Maps con estilo oscuro propio), con la
  piel `piel-radar` que sigue al tema (claro / papel / oscuro).
- **Rutas**: 3 rutas reales (14 paradas).
- **Muro, Perfil, Agrupaciones, Planner** y el **botón "Reportar algo"** en todas las pantallas.
- **Onboarding de 4 pasos** en el primer ingreso de cada cuenta + reabrible desde Inicio.
- Idioma: **español neutro** en toda la app, las páginas del CRM y los correos.

### Capa 2 · el CRM (hub)
- **Paneles de administración** (páginas del hub, sin recompilar la SPA): `/nodos` (263 lugares),
  `/agenda` (funciones, incluidas las externas con rango de fechas), `/reportes` (buzón del piloto
  con respuesta por correo), `/tablero` (métricas de la prueba) y `/guia` (pública, para nuevos
  usuarios).
- **Fotos del radar**: 101 de 263 nodos con foto real (Wikipedia/Commons verificadas). Para el
  resto: **subir una foto propia desde el panel** (se achica a 1600 px y va al bucket del
  ecosistema) o elegir entre candidatas libres de Commons con su licencia.
- **Avisos por Telegram** de reportes y de funciones publicadas.
- **Finanzas**: endpoint real (`/api/v1/crm/finances`) implementado en esta versión.
- **Rutas de API inexistentes → 404 en JSON** (antes devolvían el HTML de la SPA con 200 y las
  fallas eran invisibles).

### Datos de la prueba
| | |
|---|---|
| Lugares en el radar | **263** publicados (0 sin coordenada) |
| Con foto | **101** (antes 60) |
| Funciones en la agenda | **23** (20 funciones + 3 muestras con rango), todas con fuente |
| Obras en cartelera | **13** |
| Rutas | **3** · 14 paradas |
| Cuentas / membresías / fichas | 18 / 19 / 28 |
| Descubrimientos | 7 (de 2 personas) |

## Revisiones desplegadas
| Servicio | Revisión | Tag |
|---|---|---|
| Hub (CRM web) | `00119-non` con tag **`beta-1`** (validada antes de mover tráfico) | `beta-1` |
| App | `fase-mobile-00041-8jx` | — |

Rollback: la revisión anterior a `beta-1` quedó guardada por el script de deploy
(`hub_deploy_tag.sh` imprime la que sirve tráfico antes de tocar nada); para volver:
`gcloud run services update-traffic atha-crm-web-frontend --to-revisions=<revisión anterior>=100`.

## Qué falta (para después de la prueba)
1. **Perfil con foto de portada** y más campos de artista.
2. **Insignias interactivas** (ficha por insignia) y el diseño de *crests*.
3. **Rutas en modo lista**: revisar con captura (puede ser el modo "papel" elegido en Perfil).
4. **Menos texto, más diseño** en Muro y Perfil.
5. **Push** (exige recompilar el APK) y **cerrar sesión visible** en la app.
6. **`/api/sql/*` y `/api/import`** (estudio SQL e importación): hoy no existen en el hub y ahora
   responden 404 — si esas pantallas se usan, hay que implementarlas.
7. **Dueño de las aprobaciones** de ingreso a agrupaciones, con aviso.

## Cómo se corre la prueba de las dos capas
1. **Equipo (capa 2)**: entrar al CRM con la cuenta de administración; los paneles están en
   `/nodos`, `/agenda`, `/reportes` y `/tablero`.
2. **Invitación (capa 1)**: mandar la guía `/guia` + el correo de bienvenida
   (`scripts/enviar_bienvenida_piloto.py`) y anotar a la persona en `/piloto`.
3. **Durante**: la persona usa la app; si algo estorba, usa **"Reportar algo"** → suena en Telegram
   → se atiende en `/reportes` y se le responde por correo.
4. **Al cerrar la semana**: mirar `/tablero` (descubrimientos por persona, uso de 7 días, reportes
   por pantalla) y elegir **dos arreglos** — el resto queda anotado para la próxima.
