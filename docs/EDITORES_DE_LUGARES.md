# Editores de lugares del radar (`radar_editores`)

Fecha: 2026-09-29. Pedido de Francisco: *"necesitamos crear un rol para Felipe para que pueda
agregar y modificar lugares, desde la aplicación, sin recompilar, cambiando sólo lo necesario"*.

## El problema (una línea)

El radar pedía prestado el permiso del CRM:

```js
// antes, en guardarNodoRadar y en el DELETE de nodos
const alcance = await alcanceInventario(email);
if (!alcance.total) return res.status(403)...
```

`alcance.total` significa **"administración del CRM"** (rol `admin` o `director`). Para que alguien
cargue lugares había que ascenderlo a `director`, y eso le abre **todo** el CRM (compañías,
finanzas, usuarios). Es el mismo patrón de escalada de privilegios que ya se corrigió una vez
(el registro público que daba sesión).

Felipe (`pipe.naranjo33@gmail.com`) estaba como `explorador` → recibía **403** y sólo podía usar la
página `/nodos` si era administración.

## La solución

**Un permiso propio, acotado a los lugares.** No cambia el rol de nadie:

| Pieza | Qué hace |
|---|---|
| Tabla `radar_editores` | Lista de correos autorizados (email, nombre, nota, quién lo autorizó, fecha) |
| `esEditorRadar(email)` | ¿Está en la lista? |
| `puedeEditarRadar(email)` | Administración del CRM **o** editor del radar |
| `scripts/radar_editores.cjs` | Da, quita y lista editores sin desplegar (sólo escribe la tabla) |

Se aplica en: **crear** (POST), **editar** (PATCH), **borrar** (DELETE) y **ver borradores**
(`?incluir_borradores=1`). El hub sigue siendo el que decide: aunque la app oculte botones, el
servidor rechaza con 403 a quien no tenga el permiso.

### Cómo se otorga (sin deploy)

```bash
cd ~/athamu_workspace
python3 scripts/correr_en_hub.py scripts/radar_editores.cjs                        # ver la lista
python3 scripts/correr_en_hub.py scripts/radar_editores.cjs --agregar=correo@dominio.cl
python3 scripts/correr_en_hub.py scripts/radar_editores.cjs --quitar=correo@dominio.cl
```

Es idempotente. **Felipe quedó autorizado con sus dos cuentas** (`pipe.naranjo33@gmail.com` y
`pipenaranjo33@gmail.com`): en el CRM existen las dos y no depende de cuál use.

## Dónde lo usa

1. **La app FASE** · Perfil → botón **"Administrar lugares del radar"** (aparece sólo si el hub dice
   que puede). El panel permite:
   - **Nuevo lugar** y **editar** cualquiera (nombre, categoría, descripciones, dirección, comuna,
     horario, radio de desbloqueo, foto, QR).
   - **Usar mi ubicación**: toma el GPS del teléfono y completa latitud/longitud, avisando la
     precisión (es la vía rápida en terreno, parado en el lugar).
   - **Publicar / ocultar** con un toque, y **eliminar** con confirmación.
   - Ver también los **borradores** (lo que quedó a medio cargar).
   - Moderar el muro comunitario (pestaña Moderación).
2. **La web del hub** · `https://atha-crm-web-frontend-897089213264.us-central1.run.app/nodos`
   (la mesa de trabajo grande, con mapa): ahora también entra quien tenga el permiso.

## Nada de esto necesita recompilar el APK

La app Android carga la **web del hub** (`server.url` en `capacitor.config.ts`), así que se
actualiza al abrirla: `bash fase-mobile/deploy/deploy.sh` (o el `gcloud run deploy` con
`--clear-base-image`) publica la SPA y **todos los teléfonos la reciben sin reinstalar nada**.

## Pruebas

`scripts/probar_editores_radar.py` (13 comprobaciones, limpia lo que crea):

```bash
python3 scripts/probar_editores_radar.py --base=http://localhost:8099
```

- Felipe: crear, editar, publicar y borrar → **200**; el cambio queda guardado; tras borrar, 404.
- Cuenta común (`flautisco.contacto@gmail.com`): **403** en crear, editar y borrar.
- Sin sesión: **403**.
- El feed informa `puede_editar_radar` según la cuenta.
- `/api/v1/perfil` devuelve `permisos.puede_editar_radar` (Felipe `true` con
  `administracion: false` — puede la cartelera, **no** el CRM).

## Trampas (pagadas)

- **No usar `role` para esto.** Poner `director` a Felipe le abre todo el CRM, y la app traduce
  `admin`/`director` a "director" en el puente de sesión: el daño no queda acotado al radar.
- **El panel de la app estaba roto de antes**: `getAdminModeration` devolvía un **array** de
  publicaciones, pero el panel leía `moderationData.allPosts` (inexistente) → la pestaña de
  moderación salía vacía. Ahora devuelve `{ posts, puedeEditarRadar }`.
- **Coordenadas a medias**: si se manda sólo una de las dos, el lugar queda mal ubicado. La app
  manda las dos o ninguna (y el panel marca en amarillo "sin coordenada").
- **`guardarNodoRadar` trataba el PATCH como reemplazo total**: publicar/ocultar con un toque
  vaciaba el resto de la ficha. Ya era parcial (se corrigió el 2026-09-27) y el botón nuevo se
  apoya en eso: manda sólo `is_published`.
