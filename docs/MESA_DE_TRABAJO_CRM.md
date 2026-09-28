# Mesa de trabajo del CRM: las páginas del hub

Estado: 2026-09-27. Son **páginas servidas por el hub** (no secciones de la SPA), a propósito:
se despliegan con tag **sin recompilar el CRM**, que es la diferencia que importa cuando hay
gente probando la app en vivo. Cada una tiene su HTML editable en `paginas/`.

| Página | Para qué | Quién entra |
|---|---|---|
| `/nodos` | Administrar los **lugares culturales** del radar (263 nodos) | administración |
| `/reportes` | **Buzón del piloto**: ver y responder lo que la gente reporta desde la app | administración |
| `/agenda` | Cargar y editar las **funciones** que la app muestra en Inicio | administración o producción de la agrupación de la obra |
| `/guia` | **Guía de uso para usuarios nuevos** (pública, sin sesión): los flujos del ecosistema en 5 pasos | cualquiera — es la que se manda por correo |
| `/tablero` | **Métricas de la prueba**: descubrimientos por persona, uso de los últimos 7 días, reportes por pantalla, agenda, muro, rutas, datos y correos | administración |

```
https://atha-crm-web-frontend-897089213264.us-central1.run.app/nodos
https://atha-crm-web-frontend-897089213264.us-central1.run.app/reportes
https://atha-crm-web-frontend-897089213264.us-central1.run.app/agenda
```

La identidad sale de la sesión del navegador en ese origen (`user_session` del CRM,
`atha_user_session` de la app) o de `?email=tu@correo.cl`.

## 1 · Buzón del piloto (`/reportes`)

Por qué existe: los reportes de la app **entraban y no había dónde verlos**. Gabriel Ríos
mandó tres la noche del 27/09 y estuvieron 13 horas sin leer; dos de ellos ya habían quedado
obsoletos por cambios de la propia app.

- Lista con el reporte completo: quién, categoría, texto, **pantalla**, plataforma/versión y la
  **captura** adjunta. Filtros por estado y categoría, buscador.
- Estados: **nuevo → visto → resuelto** (con nota y quién lo atendió).
- **Responder por correo** desde la propia ficha: sale por el emisor del ecosistema
  (`/api/v1/crm/avisos/correo`), cita el reporte original y marca el reporte como resuelto.
- **Aviso por Telegram al instante** de cada reporte nuevo (con el enlace a esta página).

Endpoints: `GET /api/v1/crm/piloto/reportes` · `PATCH /api/v1/crm/piloto/reportes/:id`
(`estado`, `nota`) · `POST /api/v1/crm/piloto/reportes/:id/responder` (`mensaje`, `para?`) ·
`DELETE /api/v1/crm/piloto/reportes/:id` (limpieza de pruebas y spam). Todos, administración.

## 2 · Agenda (`/agenda`)

Por qué existe: `POST /api/v1/crm/radar/eventos` ya existía (y ya avisaba por Telegram), pero
**el calendario del CRM es mock**: no había forma de cargar una función desde la interfaz, así
que la agenda sólo se podía cargar con scripts.

- Tabla con lo publicado y los borradores (la app sólo ve lo publicado), incluidas las pasadas
  recientes para corregirlas.
- Alta/edición: título, tipo, condición, fecha, **hasta** (muestras de varios días), hora y hora
  de término, lugar, comuna, coordenadas (**“Usar mi ubicación”** o “Ubicar por la dirección”
  con OpenStreetMap), imagen, link de entradas, notas y publicado/borrador.
- Publicar / ocultar en un toque. Las funciones **externas** se marcan con su fuente (link).

Endpoints: `GET /api/v1/crm/radar/eventos` (acepta `desde`, y `incluir_borradores=1` **sólo para
administración**) · `POST` · `PATCH /:id` (sólo toca lo que llega) · `DELETE /:id`. El permiso
es administración **o** dirección/producción de la agrupación dueña de la obra.

## 3 · Nodos del radar (`/nodos`)

Ver `docs/NODOS_ADMIN.md`. Es la misma familia: `paginas/nodos.html` + el insertador.

## Cómo se mantiene esto (y cómo se agrega otra página)

1. El HTML editable vive en `paginas/<algo>.html`; **no** se escribe a mano dentro de `server.js`.
2. Se mete/actualiza con `scripts/insertar_pagina_hub.py` (escapa `` ` ``, `\`, `${` y sabe
   reemplazar el bloque existente):
   ```bash
   python3 scripts/insertar_pagina_hub.py --html=paginas/reportes.html \
     --const=PAGINA_REPORTES --ruta=/reportes --titulo="Buzón del piloto"
   node --check server.js
   ```
3. **Probar contra el hub local** (mismo `server.js`, misma base real) antes de desplegar:
   `set -a && . /tmp/hub_local_env.sh && set +a && PORT=8099 node server.js`, y después
   `python3 scripts/probar_reportes_agenda.py --base=http://localhost:8099`.
4. Desplegar con tag y validar **en la URL del tag** con la misma batería; recién ahí
   `gcloud run services update-traffic … --to-latest`.
5. Borrar lo que haya creado la prueba (las baterías ya lo hacen solas).

## Cambios que necesitó el hub (server.js)

- **`events.date_end`** (columna nueva, idempotente): una muestra de varios días tiene rango y
  la app muestra “hasta el 26 de octubre”.
- **`events.time_start` ahora acepta NULL**: una exposición no tiene hora (antes era NOT NULL y
  obligaba a inventar una).
- **`/radar/eventos` devuelve `date_end`, `source` y `source_url`** (la app los usa) y acepta
  `incluir_borradores=1` sólo para administración.
- **`PATCH`/`DELETE` de eventos** (antes sólo se podía crear) y `date_end` en el alta.
- **Reportes**: columnas `nota`, `atendido_por`, `atendido_en`; `PATCH` de estado/nota; endpoint
  de respuesta por correo; borrado para limpieza; y **aviso por Telegram** en el alta.
- **Aviso de Telegram de funciones**: ahora distingue publicada de borrador y avisa si es una
  muestra con fecha de fin.

## Baterías de prueba (re-ejecutables)

```bash
python3 scripts/probar_panel_nodos.py --base=http://localhost:8099      # nodos
python3 scripts/probar_reportes_agenda.py --base=http://localhost:8099 --correo   # buzón + agenda
python3 scripts/probar_catalogo_archivos.py --base=http://localhost:8099  # catálogo: ficha, archivos y subida
python3 scripts/probar_companias.py --base=http://localhost:8099          # agrupaciones: ficha, elenco y montajes
```

`--correo` además manda una respuesta de prueba **al buzón del agente** (no a un tester) para
comprobar que el correo del ecosistema sale de verdad. Todo lo que crean lo borran.

> `probar_catalogo_archivos.py` (33 comprobaciones) crea su propia obra de prueba y la borra; la
> parte de **subida de archivos sólo pasa en la nube** (el token de GCS sale del metadata server de
> Cloud Run, que en local no existe: ahí esas 3 comprobaciones dan `fetch failed`). Correrla contra
> la URL del tag antes de promover. Deja un PDF diminuto en `pruebas_bateria/` del bucket, sin
> endpoint para borrar blobs (resto esperado).
