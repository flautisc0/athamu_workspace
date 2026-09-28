# Tandas B y C · Elenco con cuentas de la plataforma + puente al Planner

Fecha: 2026-09-28 (trabajo nocturno, con Francisco durmiendo; se dejó todo verificado antes de
promover). Contrato: `docs/CONTRATO_TANDAS_B_C.md`.

## Tanda B · Elenco de la obra con cuentas y roles

**La regla que pidió Francisco**: todo integrante inscrito en una obra **pertenece a una compañía
registrada**; nunca se escriben nombres sueltos. El rol en la obra lo designa dirección o producción
de la compañía que presenta; si el correo ya tiene cuenta en la plataforma, la fila se vincula sola;
si no, se le invita por correo.

**Se usó la tabla que ya existía** (`project_members`, estaba vacía) con este mapeo:
`role` = rol en la obra (`direccion` | `elenco` | `equipo` | `produccion`) · `title` = personaje ·
`user_id` = cuenta de `users` · `notes` = `viene de <compañía>` cuando es invitado de otra compañía.

| Endpoint | Qué hace |
|---|---|
| `GET /api/v1/crm/portfolio/projects/:id/cast` | Elenco de la obra con su cuenta vinculada |
| `POST …/cast` | Inscribe (exige que la persona exista en la nómina de una compañía) |
| `PUT …/cast/:castId` | Cambia rol y/o personaje |
| `DELETE …/cast/:castId` | Quita de la obra |
| `POST …/cast/:castId/invitar` | Manda la invitación (emisor del ecosistema), **sólo al llamarlo** |

**Permisos**: inscribe dirección/producción de la compañía que presenta la obra (o administración);
leer puede también quien esté en el elenco. Verificado: `403` para quien no corresponde, `400` si la
persona no está en ninguna compañía o el rol es inválido, `401` sin sesión.

**Interfaz (SPA, en la ficha de la obra)**: sección *Elenco de la obra (N)* con el listado (nombre,
personaje, rol, si tiene cuenta, si viene de otra compañía) y el panel **Inscribir del elenco**:
se elige la compañía (por defecto la que presenta), se marca la nómina, a cada uno se le pone rol y
personaje, y se inscribe. Botón *Invitar* en quien no tiene cuenta, selector para cambiar el rol y
botón para quitar. Los mensajes del servidor se muestran tal cual.

> Detalle fino: la identidad se manda en la **cabecera** (`x-atha-email` + token), no en el body —
> el `email` del body es el del **integrante** (sirve para vincular su cuenta). Si se mandara la
> sesión en el body, el endpoint tomaría ese correo como el de la persona.

## Tanda C · Puente al Planner

Hoy el CRM ya abría el Planner con la sesión; lo que faltaba era **la obra**.

1. **Hub**: `GET /api/v1/crm/planner/montaje/:id` devuelve ficha + compañía (con logo) + música
   (formato/músicos) + técnico + **elenco** + **funciones** (`events WHERE obra_id`). Autorizado con
   token o administración/producción; `404` si la obra no existe.
2. **CRM**: el botón *Agendar ensayos* abre el Planner con `urlConSesion('planner', URL, { obra })`,
   que agrega `&obra=<crm_project_id>` a la identidad que ya viajaba.
3. **Planner** (`athamu_app_new/planner-src`): al cargar con `?obra=<id>` pide el montaje al hub,
   **abre o crea** el montaje vinculado por `crm_project_id` (la columna existía sin usar), deja el
   **elenco cargado** para citar a ensayo y muestra una franja verde de confirmación
   (*"Montaje del CRM abierto: «…» · compañía · N integrante(s) para citar a ensayo"*). Si el hub no
   responde, sale una franja ámbar y el Planner sigue funcionando igual.

**CORS**: verificado que el hub responde al preflight del dominio del Planner
(`access-control-allow-origin` con el origen del Planner, métodos y cabeceras ok) — sin eso, el
navegador habría bloqueado la llamada aunque la API estuviera perfecta.

**Deploy del Planner**: script nuevo `deploy_planner_tag.sh` (tag + `--no-traffic`) — mismo patrón
que el hub, porque es otro servicio (`planner-frontend`).

## Verificación (todo contra los tags, antes de promover)
| Prueba | Resultado |
|---|---|
| Batería nueva `scripts/probar_elenco_planner.py` | **17 ok · 0 fallos** (elenco, permisos, vinculación de cuenta, montaje) — también en producción |
| Batería del catálogo (Tanda A) | **33 ok · 0 fallos** |
| Baterías de compañías / reportes+agenda / nodos | OK las tres (la de compañías ahora **se limpia sola**) |
| CORS desde el dominio del Planner | cabeceras correctas en preflight y en el GET |
| Invitación por correo | enviada **al buzón del agente** (nunca a un tercero) |
| Bundle del CRM | cadenas del elenco presentes tras recompilar (`index-CWEgMyEA.js`) |
| Bundle del Planner | lógica de `?obra=` presente |
| **Borrado de agrupación** (endpoint nuevo) | 403 sin permiso · 200 admin · 404 al repetir · **409 si presenta obras** |

**Revisiones promovidas**: hub `atha-crm-web-frontend-00134-sus` · planner `planner-frontend-00025-…`
(los tags se borran solos al promover; no quedaron tags sueltos).

## Extras que aparecieron en el camino (y se arreglaron)
- **El botón «Eliminar compañía» del CRM no borraba nada**: sólo quitaba la fila de la pantalla y la
  agrupación volvía al recargar, porque **no existía el endpoint**. Se agregó
  `DELETE /api/v1/crm/companies/:id` (sólo administración) y **no deja borrar una agrupación que
  presenta obras** (responde 409 con el motivo). El botón ahora llama al servidor y muestra el error
  tal cual.
- **La batería de compañías no era repetible**: `companies.name` es único y una corrida anterior
  dejó una agrupación de prueba, así que la siguiente cortaba con `Duplicate entry`. Ahora usa un
  nombre con marca de tiempo y **borra lo que crea** (más la limpieza del resto que había quedado).

## Dos bugs REALES que aparecieron al verificar (y quedaron arreglados)
1. **El Planner estaba caído con `X is not defined`.** Siete componentes usan `<X />` (el icono de
   cerrar) y **ninguno lo importaba**; como el build del Planner (`vite build`) **no corre `tsc`**, el
   bundle se armaba igual y la app reventaba en cuanto se mostraba un modal (el de acceso, apenas
   entra alguien). Se agregó el import en los 6 archivos afectados y se chequeó con
   `tsc --noEmit | grep "Cannot find name"` (limpio). **El build promovido durante unos minutos
   quedó roto**: se detectó al verificar el render con Chrome headless (pantalla «¡Ups! Algo falló en
   FASE»), se arregló y se volvió a promover. Lección: **un deploy verificado sólo por API no está
   verificado** — hay que mirar que la app pinte.
2. **La obra se perdía por una carrera con la limpieza de la URL.** El efecto que adopta la sesión
   (`?auth=…`) termina con `window.history.replaceState(..., window.location.pathname)` y **borra la
   query**; como está declarado antes, el efecto del montaje ya no encontraba `?obra=`. Ahora el
   parámetro se lee **al cargar el módulo** (fuera de cualquier efecto).

## Lo que NO quedó verificado con los ojos
- La **franja verde** del Planner (*«Montaje del CRM abierto: …»*) no se pudo capturar: tanto el
  navegador de Hermes como Chrome headless abortan el `fetch` del montaje (el `AbortSignal.timeout`
  del servicio se dispara con el tiempo virtual, y la página mantiene conexión abierta, así que el
  navegador nunca reporta «carga terminada»). Lo que **sí** está verificado: el endpoint responde
  **200** con los mismos parámetros y cabeceras que usa el servicio, el **CORS** está abierto para el
  dominio del Planner, y la lista de bases candidatas apunta al hub correcto. Si al abrirlo sale la
  franja **ámbar**, es que el fetch falló y hay que mirar la consola del navegador.

## Pendiente honesto de la Tanda C
- **«Llevar a Ventas» navega con la obra** (`/?ir=ventas&obra=<id>`) **pero la pestaña Ventas todavía
  no lee ese parámetro**: abre Ventas sin la obra elegida. Es lo próximo a completar ahí.
1. **El `dist` local y el de la imagen no comparten hash** (la imagen hace su propio `npm install`):
   comparar hashes entre local y desplegado **no** sirve para verificar; hay que **contar cadenas**.
2. Un `grep -c` de varias palabras juntas da **falsos positivos** (encontró `castTeam` y lo tomé como
   "interfaz hecha"): verificar con cadenas exactas de la UI, no con fragmentos genéricos.
3. Cuando una delegación en paralelo muere sin reporte, **lo que vale es lo que quedó en disco**:
   revisar archivo por archivo antes de creer que algo está hecho.
4. La identidad de sesión va en **cabecera**; el `email` del body suele ser el dato del tercero.

## Pendientes
- Que el **elenco del CRM aparezca en el dossier imprimible** (hoy sólo en la pestaña de ficha).
- Los permisos por ámbito quedaron **a nivel de endpoints** (inscribir/quitar/leer). Falta la regla
  fina de qué ve cada rol dentro del CRM (p. ej. un elenco no debería ver Finanzas).
- Generar el **dossier PDF desde la ficha**.
- En el Planner: proponer **ensayos automáticos** hacia la fecha de estreno (hoy abre el montaje y
  deja el elenco listo, pero el cálculo de ensayos sigue siendo manual).
