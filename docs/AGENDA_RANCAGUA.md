# Agenda cultural externa · Rancagua (cartelera REAL en el Inicio de la app)

Estado: **cargada (2026-09-27)**. 20 funciones reales de Rancagua viven en el CRM y se ven
en el Inicio de FASE Mobile. Nada de esto se inventó: cada fila tiene su fuente.

## De dónde salen los datos

**Fuente: `rancaguacultura.cl`** — Corporación de la Cultura y las Artes de la Ilustre
Municipalidad de Rancagua (el sitio de la cartelera oficial de la ciudad). Su calendario
(WordPress + *The Events Calendar*) publica un **feed iCal por evento**:

```
https://rancaguacultura.cl/event-directory/<slug-del-evento>/?ical=1
```

Ese iCal trae **fecha y hora exactas con zona horaria** (`TZID=America/Santiago`), el lugar
con dirección, la imagen y la URL del evento. Es la fuente buena: no hay que interpretar
texto en español ni adivinar horas.

> La REST API (`/wp-json/tribe/events/v1/events`) está **cerrada** (403
> `nfw_rest_api_access_restricted`) y el iCal global (`/events/?ical=1`) devuelve **sólo 5
> eventos** (ventana corta). Por eso se recorren las vistas HTML (`/event-directory/mes/AAAA-MM/`
> y `/event-directory/list/?tribe-bar-date=...`) para sacar las URLs y de ahí el iCal de cada una.

## Los dos scripts (re-ejecutables)

```bash
cd ~/athamu_workspace

# 1) COSECHAR (web → JSON). Sin API key ni dependencias.
python3 scripts/recolectar_agenda_rancagua.py --salida=/tmp/agenda_rancagua.json

# 2) CARGAR al CRM. Primero el informe (no escribe), después --insertar.
python3 scripts/correr_en_hub.py scripts/agenda_externa.cjs --archivo=/tmp/agenda_rancagua.json
python3 scripts/correr_en_hub.py scripts/agenda_externa.cjs --archivo=/tmp/agenda_rancagua.json --insertar
```

- El paso 2 es **idempotente**: el `id` es el hash de `fuente_url + fecha + hora`
  (`ext-…`), así que re-ejecutarlo **actualiza** y nunca duplica (verificado: 2ª corrida =
  20 actualizados, 20 filas).
- `owner_id` = la cuenta admin del CRM; `source='externo'` y `source_url` = la URL del evento
  en el sitio de la Corporación. `is_public=1` (la app filtra `is_public IS NULL OR 1`).
- Rollback total de una fuente:
  `DELETE FROM events WHERE source='externo' AND source_url LIKE 'https://rancaguacultura.cl/%';`

## Reglas con las que se cargó (para no ensuciar el Inicio)

1. **Sólo funciones con fecha y hora concretas.** Las **muestras de varios días**
   (exposiciones) no se cargan: `events` guarda **una fecha suelta** (`date`, `time_start`) y
   mostrarlas como un solo día sería mentir. Quedan listadas abajo como pendiente de diseño.
2. **Coordenadas de fuente real**, en este orden: recinto ya revisado a mano contra
   OpenStreetMap → nodo del radar con ≥2 palabras en común (mismo OSM) → Nominatim con la
   dirección textual. Si no hay coordenada se carga **sin** ella (la app muestra el evento
   sin distancia) — nunca se inventa una ubicación: con `unlock_radius_m` de 120 m un dato
   inventado haría desbloquear un lugar donde no está.
3. **Título legible**: la fuente grita en mayúsculas y repite el lugar y la condición de
   entrada ("… - ENTRADA LIBERADA - CASA DE LA CULTURA"). Se corta la cola administrativa, se
   cierra la comilla que queda colgando y se limita a ~110 caracteres. El **título original
   completo va en `notes`**, junto al nombre de la fuente (trazabilidad).
4. `type` (lo que la app muestra al lado de la hora) se deduce de palabras del título:
   Exposición · Danza · Taller · Stand up · Música · Teatro · Convocatoria · Evento.
5. `status = 'Entrada liberada'` **sólo** si la fuente lo dice (entrada liberada / invitaciones
   gratuitas). No se promete gratuidad que la fuente no afirme. `ticket_url` queda vacío: el
   sitio no publica el enlace de venta en el iCal (dice "Entradas a la venta en Ticketpro.cl").

## Qué quedó cargado (20 funciones, 28/09 → 05/12/2026)

| fecha | hora | tipo | actividad | recinto |
|---|---|---|---|---|
| 28/09 | 15:30 | Taller | «Gladiadora de Estrellas», homenaje a Stella Díaz Varín | Espacio Cultural La Merced |
| 30/09 | 20:00 | Danza | Gala Academia de Danza Westyle «Baila a la Moda» | Teatro Regional Lucho Gatica |
| 01/10 | 19:00 | Exposición | Inauguración doble de fotografías «Saint Magma & Retratos con relato» | Casa de la Cultura |
| 02/10 | 20:00 | Evento | «El 18 chico en Oriente» | Centro Cultural Oriente |
| 03/10 | 10:00 | Taller | Taller «Publicar desde lo esencial» | Casa de la Cultura |
| 03/10 | 12:00 | Exposición | Tarde Cultural Árabe | Casa de la Cultura |
| 04/10 | 12:00 | Evento | Celebración Día de la Música Chilena | Casa de la Cultura |
| 06/10 | 11:00 | Taller | Escuela al Cine: cortometrajes FIDOCS | Teatro Regional Lucho Gatica |
| 08/10 | 12:00 | Exposición | Inauguración «La estructura de la luz», Karlos Vargas | Espacio Cultural La Merced |
| 09/10 | 19:00 | Exposición | Inauguración «Sístole y diástole», Rita Gajardo | Centro Cultural y Teatro Baquedano |
| 09/10 | 20:00 | Teatro | Inti-Illimani: gira «Caminos» | Teatro Regional Lucho Gatica |
| 16/10 | 18:00 | Evento | Presentación libros «Pichilemu Blues» y «El ronquido de papá» | Casa de la Cultura |
| 17/10 | 19:00 | Música | Presentación musical Grupo Nieve | Casa de la Cultura |
| 24/10 | 19:30 | Música | Gala Agrupación Folclórica Telar | Centro Cultural Oriente |
| 28/10 | 20:00 | Teatro | Cartelera Comunal: «Antes todo esto era campo» | Teatro Regional Lucho Gatica |
| 29/10 | 20:00 | Teatro | Chofi y Tapia «Por amor o la juerza» | Teatro Regional Lucho Gatica |
| 30/10 | 18:00 | Stand up | «Un poco chill», Juan Pablo López | Teatro Regional Lucho Gatica |
| 06/11 | 20:00 | Teatro | Cartelera Comunal: «El proyecto», Teatro Nomasté | Teatro Regional Lucho Gatica |
| 04/12 | 20:00 | Teatro | Cartelera Comunal: «Yo, mi gay» | Teatro Regional Lucho Gatica |
| 05/12 | 20:00 | Música | Rancagua en Vivo: «Catalina y las Bordonas de Oro + Infeligreses» | Teatro Regional Lucho Gatica |

Medido desde la Plaza de los Héroes, los recintos están a **482 m** (Espacio Cultural La
Merced) y **583 m** (Casa de la Cultura): desde el centro se ven con distancia real.

## El correo a Pipe (enviado 2026-09-27)

```bash
python3 scripts/enviar_correo_agenda_rancagua.py --enviar --copia
```

Sale del emisor del ecosistema (`fase.athamu@gmail.com`, Reply-To al correo personal de
Francisco) por `POST /api/v1/crm/avisos/correo` del hub — **sin tocar el hub ni desplegar
nada**: ese endpoint acepta `html` y lo envuelve con el marco FASE. Queda registro en
`email_log` (`mail_46164dde25cf`).

Qué dice: que Rancagua **ya tiene datos reales** (20 funciones de la Corporación + 16 lugares
con coordenadas), la agenda como muestra con hora/recinto, la lista de los 9 lugares más
cercanos a la Plaza de los Héroes con su distancia, y el pedido concreto — **descubrir los
lugares en terreno** (abrir Inicio, dar el permiso de ubicación, Radar "Todo cerca", caminar y
desbloquear a menos de 120 m, reportar lo que no calce). Cierra avisando de los dos recintos
sin coordenada (Oriente y Baquedano) para que los confirme si pasa por ahí.

**Verificación (un `250` del SMTP no prueba nada)**: se envió con copia al buzón del agente y
se leyó por IMAP (`scripts/verificar_correo_llegado.py`): llegó con la identidad *ATHAMU ·
FASE*, Reply-To a Francisco, el cuerpo completo (los 9 lugares, Inti-Illimani, el aviso de
Oriente/Baquedano, el botón de la app y el APK) y **0 rebotes** (`mailer-daemon`).

## Las 3 muestras de varios días (resuelto: 2026-09-27)

Al principio quedaron afuera porque `events` guardaba una sola fecha. Ahora se cargan completas:
`date` = inicio, **`date_end` = fin** y **sin hora** (la fuente publica sólo el rango; se aflojó
`events.time_start`, que era NOT NULL, para no inventar una hora de apertura). Total: **23 eventos**
(20 funciones + 3 muestras) y la app muestra “hasta el 26 de octubre”.

- 28/09 → 26/10 · Exposición doble de fotografías «Saint Magma & Retratos con relato» (Casa de la Cultura)
- 08/10 → 29/11 · Exposición «La estructura de la luz» (Espacio Cultural La Merced)
- 09/10 → 31/10 · Exposición «Sístole y diástole» (Centro Cultural y Teatro Baquedano)

## La fuente, ahora visible en la app (2026-09-27)

`/api/v1/crm/radar/eventos` devuelve `source` y `source_url`, y la tarjeta de Inicio muestra
**“Ver la fuente”** para lo externo (los 23 eventos la traen: 0 sin `source_url`). Es el “con hora
y fuente” que Francisco había pedido. Además el CRM ya puede **cargar funciones desde `/agenda`**
(con aviso por Telegram), así que la agenda no depende de estos scripts.

## Pendientes que salieron de aquí

1. **Muestras de varios días (3)** — necesitan **rango de fechas** para mostrarse bien
   (`events` no tiene `date_end`). Son:
   - 28/09 → 26/10 · Exposición doble de fotografías «Saint Magma & Retratos con relato» (Casa de la Cultura)
   - 08/10 → 29/11 · Exposición «La estructura de la luz» (Espacio Cultural La Merced)
   - 09/10 → 31/10 · Exposición «Sístole y diástole» (Centro Cultural y Teatro Baquedano)
   Propuesta: agregar `date_end` en `events` (`asegurarColumnasAgenda()` ya agrega columnas
   idempotentes), devolverlo en `/radar/eventos` y que la app muestre «hasta el 26 de octubre».
2. **Dos recintos sin coordenada**: **Centro Cultural Oriente** (Av. Juan Martínez de Rozas
   01040) y **Centro Cultural y Teatro Baquedano** (Baquedano 445). No están en OpenStreetMap
   ni los resuelve Nominatim (devuelve la calle, no el número): sus 3 eventos se cargaron sin
   distancia. **Los puede confirmar Francisco o Pipe desde el terreno** (la app tiene "Reportar
   algo", y cuando el Radar los tenga como nodo, los eventos heredan la ubicación).
3. **La fuente no se ve en la app**: el endpoint devuelve `city`, `image_url`, `ticket_url`,
   pero **no** `source`/`source_url`, y la tarjeta de Inicio no muestra procedencia. Francisco
   pidió cartelera "con hora y **fuente**": falta exponer `source_url` en `/radar/eventos` y
   pintar el enlace en la tarjeta (cambio de hub + app, va con deploy con tag).
4. **Refresco**: la agenda se mueve (la Corporación publica funciones nuevas cada semana). Un
   cron semanal que corra los dos scripts cubre eso sin trabajo manual; queda a decisión de
   Francisco (escribe en el CRM sin supervisión).
5. **Plaza de los Héroes** aparece como recinto en un evento de la cartelera (teatro al aire
   libre); si se carga alguna vez, su coordenada ya existe en el radar.
