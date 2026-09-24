# CRM · Auditoría de secciones (¿hacen lo que dicen?)

> Fecha: 2026-09-24. Hallazgo: el CRM mezcla **tres capas de datos** y la mayoría de las
> pestañas no persisten. Este documento es la base para terminar el CRM.

## Causa raíz

```
1) loadFromStorage(CLAVE, initial…)   → localStorage + datos INVENTADOS (fallback)
              ↓ (los pisa sólo si la API responde)
2) fetchAllFromSql()                   → https://crm-v1-uc-…/api/v1/crm/portfolio/projects  (OTRO servicio)
                                       → /api/v1/crm/leads                                  (el hub ✓)
3) Escrituras                          → fetch('/api/obras', POST) → ruta INEXISTENTE en el hub
                                          → catch → console.warn → NO PERSISTE (falla en silencio)
```

**Consecuencia**: la interfaz muestra el cambio, pero al recargar desaparece (o queda sólo en el
navegador de ese usuario). Hay datos reales (los que sí devuelve la API) mezclados con inventados.

## Por sección

| Sección | Lee de | Escribe en | Veredicto |
|---|---|---|---|
| `inicio` (Dashboard) | localStorage/mock | — | ✗ sin datos reales |
| `obras` (Catálogo) | `crm-v1-uc` (servicio viejo) | `/api/obras` → 404 | ~ lectura sí, **escritura muerta** |
| `crm` (Leads) | **hub ✓** | `/api/leads` → 404 | ~ lectura sí, **escritura muerta** |
| `inventario` | **hub ✓** (InventarioSection) | **hub ✓** | ✓ real |
| `companias` | **hub ✓** | **hub ✓** (2) | ✓ real |
| `ventas` | **hub ✓** | **hub ✓** (2) | ✓ real |
| `finanzas` | mock (la API no la devuelve) | `/api/finances` → 404 | ✗ |
| `venues` | mock | `/api/venues` → 404 | ✗ |
| `equipo` | mock | `/api/team`? → 404 | ✗ |
| `riders` | mock | 404 | ✗ |
| `diario` | mock | 404 | ✗ |
| `calendario-planificacion` | mock | 404 | ✗ |
| `arquitecto` | mock (`INITIAL_PROJECTS_ARCH`) | 404 | ✗ |
| `calculadora` | props del App (mock) | 404 | ✗ |
| `id` (Proyectos I+D) | mock | 404 | ✗ |
| `planner` | mock | — | ✗ |
| `perfil` | mock | — | ✗ |
| `acerca` | localStorage | — | ✗ |
| `admin` | localStorage | — | ✗ |
| `ecosistema` | **datos inventados** (`HERRAMIENTAS`) | — | ✗ |

## Qué falta para que cada pestaña haga lo que dice

1. **Un solo origen**: `apiClient.ts` debe apuntar al **hub** (`atha-crm-web-frontend`), no a
   `crm-v1-uc`. Las escrituras deben ir a `/api/v1/crm/…` (las rutas que existen).
2. **Endpoints que faltan en el hub** (hoy no existen y por eso fallan las escrituras):
   - `finances` (finanzas), `venues` (salas), `team` (equipo), `riders` (fichas técnicas),
     `events` (calendario), `process-logs` (diario), `rd-projects` (I+D),
     `about-info` (acerca), `artist-availability` (calculadora).
3. **Quitar los `initial…`**: mientras existan, las pestañas van a mostrar datos inventados
   cuando la API no responde. Mejor sección vacía con aviso, que mentira.
4. **Aviso honesto al fallar un guardado**: hoy falla en silencio (`console.warn`); debe
   mostrar el error al usuario (regla: persistencia con confirmación visible).

## Orden sugerido (por valor y esfuerzo)

1. `obras` + `crm` (leads) → **arreglar las escrituras** a las rutas reales del hub (rápido, alto valor).
2. `equipo` + `venues` + `finanzas` → crear endpoints en el hub (lectura y escritura).
3. `riders` + `diario` + `calendario` + `I+D`.
4. `calculadora` + `planner` + `arquitecto` (dependen de datos de las anteriores).
5. `acerca` + `admin` + `ecosistema` (información de marca/ecosistema).
