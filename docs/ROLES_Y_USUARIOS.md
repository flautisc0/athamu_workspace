# Roles, usuarios y nóminas · CRM ATHA

> Definido con Francisco el 2026-09-24. Este documento es la fuente de verdad del
> modelo de permisos del ecosistema.

## Los 5 roles (uno por usuario)

| Rol | Quién es | Alcance |
|---|---|---|
| **admin** | Owner (Francisco) — **único e irrepetible** | Todo el ecosistema + panel de usuarios |
| **director** | Dirección | Dirige compañías, obras y espectáculos; **administra el panel** |
| **productor** | Producción | Administra obras, compañías y elementos técnicos **de las suyas** |
| **tecnico** | Técnica / equipo técnico | Elementos técnicos e **inventario** de su compañía |
| **artist** | Artista / elenco | Su perfil, disponibilidad (Planner) y fondos. **Sin** acceso a gestión |

El **artista** lleva además una **disciplina** (`artist_kind`):
`musico` · `actor` · `bailarin` · `otro`.

### Solapamientos (son intencionales: es jerarquía de alcance)

- `tecnico ⊂ productor`: el técnico hace lo técnico; el productor hace lo técnico **+ obras,
  compañías y leads**. Se separan porque un técnico **no debe ver leads ni finanzas**.
- `director ≠ admin`: el director administra el panel **pero no puede tocar al owner** ni
  quitarse el suyo si es el último admin.

## Matriz de permisos

| Módulo | admin | director | productor | tecnico | artist |
|---|---|---|---|---|---|
| Panel usuarios/roles | ✅ owner | ✅ | ❌ | ❌ | ❌ |
| Compañías y nóminas | ✅ | ✅ | ✅ sus comp. | ❌ | ❌ |
| Obras | ✅ | ✅ | ✅ | ❌ | ❌ |
| Leads / CRM | ✅ | ✅ | ✅ | ❌ | ❌ |
| Inventario / Riders | ✅ | ✅ | ✅ | ✅ | ❌ |
| Finanzas | ✅ | ✅ | ✅ sus comp. | ❌ | ❌ |
| Planner (disponibilidad) | ✅ | ✅ | ver | ver | ✅ declara |
| Buscador de fondos | ✅ | ✅ | ✅ | ❌ | ✅ |
| Su perfil | ✅ | ✅ | ✅ | ✅ | ✅ |

## Dónde vive cada dato

| Dato | Tabla / columna |
|---|---|
| Rol del usuario | `users.role` (enum lógico: admin · director · productor · tecnico · artist) |
| Cargo (texto libre) | `users.role_title` |
| Disciplina del artista | `users.artist_kind` |
| Perfil público | `users.public_profile` |
| Pertenencia a compañía | `company_members` (`role_in_company`: owner · coordinator · director · artist · viewer) |
| Nómina de una compañía | `company_people` (`kind`: socio · elenco · equipo · colaborador) |

## El panel (CRM → Administración)

Dos vistas, portadas y reescritas desde `fase-user-pannel` (el panel de Francisco), ahora
conectadas al hub y con la sesión del ecosistema:

1. **Usuarios**: buscar/filtrar, cambiar **rol**, **cargo**, **disciplina** (si es artista) y
   **compañías** del usuario. Cada cambio se confirma visiblemente ✓
2. **Nóminas**: elegir compañía y revisar/corregir su gente (nombre, cargo, personaje, email,
   tipo) + aviso de **personas sin cargo** (datos incompletos).

Acceso: sólo `admin` y `director` (validado en el hub, no sólo en la pantalla).

## Endpoints

| Método y ruta | Para qué |
|---|---|
| `GET /api/v1/crm/usuarios` | Usuarios + roles + disciplinas + compañías |
| `PATCH /api/v1/crm/usuarios/:id` | Rol, cargo, disciplina, perfil público |
| `POST /api/v1/crm/usuarios/:id/companias` | Asignar/cambiar pertenencia |
| `DELETE /api/v1/crm/usuarios/:id/companias/:companyId` | Quitar pertenencia |
| `GET /api/v1/crm/companias/:id/nomina` | Nómina + miembros + incompletos |
| `POST /api/v1/crm/companias/:id/nomina` | Agregar persona |
| `PATCH /api/v1/crm/nomina/:id` | Corregir datos de una persona |
| `DELETE /api/v1/crm/nomina/:id` | Quitar persona |

## Cómo probar el flujo con un colaborador

1. El colaborador entra **una vez** al CRM con su cuenta Google → queda registrado con rol
   `artist` (rol mínimo, sin acceso a gestión).
2. En **Administración → Usuarios y roles**, el owner/director le asigna su **rol**, su
   **cargo** y su **compañía** (con el rol dentro de ella).
3. El colaborador vuelve a entrar: ahora ve **sólo lo suyo** según la matriz.
4. Verificación de persistencia: todo lo que haga queda en MySQL (misma base para el CRM, la
   app y los artefactos), así que se ve al recargar y desde cualquier dispositivo.

## Notas de seguridad

- El rol **no** se puede falsificar desde el navegador: cada endpoint resuelve el alcance con
  el correo de la sesión y responde 403 si no corresponde.
- No se puede quitar el **último owner** del sistema (evita perder el acceso total).
- Sólo un `admin` puede modificar a un `admin` o nombrar otro `admin`.
