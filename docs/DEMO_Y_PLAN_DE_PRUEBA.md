# Plan demo de uso y prueba con usuarios nuevos

Fecha: 2026-09-27. Objetivo: que **una persona que nunca vio el ecosistema** pueda usarlo sola, y
que **cada uso deje algo que mejore el sistema** (no una impresión, un dato).

Tres piezas: **(1) los flujos del ecosistema**, **(2) la demo guiada** (guion del que presenta),
**(3) la prueba por tareas** con su circuito de mejora. Los instrumentos ya existen:
`/piloto` (inscripción), `/guia` (esta guía, para mandar por correo), el **onboarding dentro de la
app**, el botón **“Reportar algo”** y el buzón **`/reportes`** del CRM.

---

## 1 · El mapa: quién entra a qué

| Artefacto | Quién | Para qué |
|---|---|---|
| **App FASE** (radar cultural) | artistas, elenco, dirección, exploradores | agenda real, lugares cerca, descubrirlos, muro, su agrupación |
| **CRM web** | administración y producción | compañías, obras, CRM de salas, inventario, finanzas, riders, agenda, nodos, buzón |
| **Planner** | elenco y dirección | disponibilidad y ensayos (se abre desde la app o el CRM) |
| **Arquitecto / otros artefactos** | producción | proyectos y postulaciones |

Se entra por el **puente** del hub (un ticket de un solo uso): la app usa el mismo correo de
Google que el CRM, así que **una persona es una sola identidad** en todo el ecosistema. Si alguien
entra con un correo distinto al de su ficha, la app no le muestra su agrupación (es el error más
común: revisar antes de culpar a la app).

## 2 · Los flujos de la app, en orden de aprendizaje

Cada flujo es **una tarea con resultado observable** y deja una señal distinta.

| # | Flujo | Cómo se hace | Qué deja (señal) |
|---|---|---|---|
| 1 | **Entrar** | abrir la app y entrar con Google (o el link del puente) | ¿pudo entrar sin ayuda? (si no: puente/sesión) |
| 2 | **Tu perfil** | nombre, foto, comuna, disciplinas, bio | perfil completo ⇒ el Muro y las agrupaciones cobran sentido |
| 3 | **La agenda** | Inicio: qué hay estos días, con hora, lugar, distancia y **fuente** | ¿la cartelera de su ciudad está cargada? (si no: `/agenda` o cosecha) |
| 4 | **El radar** | dar permiso de ubicación → lista ordenada por cercanía, chips 1/3/10 km | ¿hay lugares reales cerca de esta persona? (si no: `/nodos`) |
| 5 | **Descubrir** | caminar hasta el lugar y desbloquear a menos de 120 m | lugares descubiertos por persona = **la métrica estrella** |
| 6 | **El Muro** | publicar con foto en el lugar que descubrió; reaccionar y comentar | publicaciones y reacciones ⇒ ¿la parte social tiene vida? |
| 7 | **Rutas** | seguir una ruta de 4-6 paradas (Centro histórico · Teatros · Museos) | rutas completadas ⇒ ¿sirven como recorrido guiado? |
| 8 | **Tu agrupación** | Perfil → “Perteneces a” → ficha con equipo y montajes; si no pertenece, **pedir entrar**; dirección puede crear | solicitudes pendientes (¿quién las aprueba?) |
| 9 | **Planner** (elenco/dirección) | marcar disponibilidad, ver ensayos | quién se engancha con la parte de trabajo, no sólo el radar |
| 10 | **Reportar algo** | botón flotante, en todas las pantallas, con captura | **el insumo de todo el plan** (llega ubicado al buzón del CRM) |

**Regla de oro de esta prueba:** no se le pide “opinión” al final. Se le pide **hacer** y, si algo
estorba, **reportarlo en el momento** (queda con pantalla, versión y captura). Un “no me funcionó”
suelto no se puede arreglar; un reporte del flujo 7 con captura, sí.

## 3 · Guion de la demo (15 minutos, quien presenta)

Para la primera sesión con alguien nuevo —o para el dry run interno—.

1. **0:00–1:00 · Qué es.** “FASE es el radar cultural de ATHAMU: te muestra qué está pasando en tu
   ciudad, qué lugares culturales tienes cerca y te deja descubrirlos caminando. El CRM es nuestra
   mesa de trabajo; vos vives en el teléfono.”
2. **1:00–3:00 · Entrar.** Se lo hace entrar **con su propio correo** (no con uno de prueba) y se le
   deja completar el perfil. *No se toca el teléfono por él.*
3. **3:00–6:00 · La agenda.** Que abra Inicio y **elija a qué iría**. Que toque la fuente:
   “esto no lo inventamos, sale de la Corporación de la Cultura”.
4. **6:00–10:00 · El momento que engancha.** Permiso de ubicación → Radar → elegir el lugar más
   cercano → **caminar hasta la puerta y desbloquearlo a menos de 120 m**. Es el único paso que no
   se puede simular: ahí se entiende el producto.
5. **10:00–13:00 · Publicar.** Foto del lugar en el Muro. Después reaccionar a algo de otro.
6. **13:00–15:00 · Su lugar de trabajo.** Perfil → su agrupación (equipo + montajes) o **pedir
   entrar**. Cierre con dos preguntas: *¿qué harías con esto el viernes a las 20:00?* y *¿qué te
   faltó?* — y la invitación: **“si algo te estorba, usa Reportar algo ahí mismo”**.

Lo que **no** hace el que presenta: explicar pantalla por pantalla, pedir “abre y mira”, ni
defender el producto cuando algo falla. Si algo falla, **se anota en el reporte**, no se justifica.

## 4 · Instrumentos (todos en el ecosistema)

| Instrumento | Dónde | Para qué |
|---|---|---|
| **Onboarding de 4 pasos** | dentro de la app, **primer ingreso de cada cuenta** (se vuelve a abrir desde Inicio → “¿Cómo funciona FASE?”) | que la persona sepa qué hacer **sin nadie al lado** |
| **Guía de uso** | `…/guia` (página pública, se manda por correo) | el “manual” en lenguaje de usuario, con las preguntas frecuentes |
| **Correo de bienvenida** | `scripts/enviar_bienvenida_piloto.py` (sale del emisor del ecosistema) | los flujos y los 5 pasos, con el enlace a la guía |
| **Inscripción** | `…/piloto` (y el mensaje de confirmación ya enlaza la guía) | convocar, con compañía y rol declarados |
| **Reportar algo** | app, todas las pantallas, con captura | el insumo ubicado |
| **Buzón del piloto** | CRM `…/reportes` + **aviso por Telegram** | atender y responder, con estado y nota |
| **Panel de nodos / agenda** | CRM `…/nodos`, `…/agenda` | corregir el mapa y la cartelera que la gente está mirando |

**Ruta de una persona nueva, de punta a punta:** se anota en `/piloto` → le llega el correo de
bienvenida con los 5 pasos → abre la app y ve el onboarding → usa la agenda y descubre un lugar →
si algo estorba, reporta → el reporte suena en Telegram → se atiende en `/reportes` y se le
responde por correo.

## 5 · Etapas de la prueba

- **Etapa 0 · datos (hecha el 27/09):** auditoría de consistencia y reparación; la persona que
  entra **debe ver su agrupación**. Un piloto sobre datos inconsistentes mide bugs de datos.
- **Etapa 1 · dry run interno (2 personas, 20 min):** correr el guion completo y sacar los bloqueos
  obvios. Objetivo: que un tercero lo haga sin ayuda.
- **Etapa 2 · prueba moderada por tareas (5-8 personas, dos perfiles: artista/elenco y
  dirección/producción):** se observa **dónde duda**, no se ayuda hasta que se traba de verdad.
- **Etapa 3 · uso libre (2-3 días, sin moderar):** uso real en terreno. Aquí importan los reportes
  espontáneos y los descubrimientos.

## 6 · Qué aprende el sistema de cada flujo (el circuito de mejora)

El punto no es “juntar feedback”: es que **cada señal tiene un responsable y un lugar donde se
arregla**.

| Señal | Se lee en | Se arregla en |
|---|---|---|
| No entró / sesión rara | reporte (flujo 1) | hub: puente y sesión |
| Su ciudad no tiene nada | Inicio vacío o Radar corto | `/nodos` (cosecha OSM) y `/agenda` |
| No encuentra el lugar al llegar | reporte (flujo 5) | `/nodos`: mover el pin (mapa del panel) |
| Descubre pero no publica | Muro sin publicaciones | producto: motivo/estímulo en el Muro |
| Pide entrar y queda esperando | `/piloto` y solicitudes | CRM: **dueño de la aprobación** (alguien asignado) |
| Confusión repetida en una pantalla | reportes agrupados por pantalla | app: arreglo + onboarding |
| Nadie completa las rutas | rutas sin progreso | producto: rutas más cortas o con más sentido |

**Ritual semanal (30 min):** abrir `/reportes` (estados `nuevo`), mirar los reportes por pantalla,
cerrar cada uno con nota y respuesta por correo, y elegir **máximo dos arreglos** para la semana.
Sin este ritual el buzón se llena y volvemos al problema original.

## 7 · Qué falta para que esto funcione (dicho, no escondido)

1. ~~Tablero del piloto~~ **HECHO** (`/tablero`): descubrimientos por persona, uso de los últimos
   7 días, reportes por pantalla, agenda, muro, rutas, datos y correos. El ritual semanal del
   punto 6 se hace mirando esa pantalla.
2. **Push**: hoy el usuario recibe correo; el push exige recompilar el APK (va al final, decisión de Francisco).
3. **Cerrar sesión visible** en la app: hace falta para probar dos cuentas en un mismo teléfono.
4. **Dueño de la aprobación de solicitudes**: quién aprueba pedir-entrar a una agrupación, con aviso.
5. **Dry run interno (etapa 1)**: el guion de la sección 3 está listo; falta correrlo con dos
   personas del equipo antes de invitar a más gente.
