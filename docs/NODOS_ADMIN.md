# Panel de nodos del radar (`/nodos`) — administración desde el CRM

Estado: **desplegado el 2026-09-27**. Es la mesa de trabajo de los lugares culturales que la
app muestra en su pestaña **Radar**: antes los nodos sólo se podían cargar con scripts
(`recolectar_nodos.py` + `nodos_reales.cjs`), ahora se administran a mano desde el hub.

## Dónde está

```
https://atha-crm-web-frontend-897089213264.us-central1.run.app/nodos
```

- **Sólo administración.** El permiso lo valida el hub (`alcanceInventario`): cualquier otra
  cuenta recibe `403 sólo administración puede editar el radar` y el panel lo muestra.
- La identidad sale de la sesión del navegador en ese origen (el CRM guarda `user_session`,
  la app `atha_user_session`) o de `?email=tu@correo.cl` para abrirlo con una cuenta puntual.
- La página **no** es parte de la SPA del CRM: la sirve el hub en línea (igual que `/piloto` y
  `/previa`), así que se despliega con tag **sin recompilar el CRM**.

## Qué se puede hacer

| Acción | Detalle |
|---|---|
| Ver y filtrar | Buscador por nombre/comuna/dirección/categoría, filtros por comuna, categoría y estado (publicados · borradores · **sin coordenada**) |
| Métricas | Nodos, publicados, borradores, sin coordenada y en pantalla |
| Mapa | Todos los nodos filtrados en OpenStreetMap; cada punto abre su ficha. Rojos = publicados, naranjos = borradores |
| Alta / edición | Nombre, categoría (con sugerencias de las que ya existen), descripción corta y larga, dirección, comuna, región, latitud/longitud, **radio de desbloqueo**, **horario**, foto (URL), QR y publicado/borrador |
| Ubicar el lugar | Clic en el mapa, arrastrar el marcador, **“Usar mi ubicación”** (GPS del navegador) y **“Ubicar por la dirección”** (resuelve con OpenStreetMap/Nominatim, marcado como aproximado) + “Ver en Google Maps” |
| Publicar / ocultar | Un toque por fila: publicado aparece en la app, borrador sólo se ve aquí |
| Eliminar | Con confirmación; el hub limpia también sus descubrimientos y su lugar en las rutas |
| Posibles duplicados | Detecta pares a menos de 200 m con el nombre parecido (el caso real: el mismo museo cargado dos veces desde OSM) |

Un nodo **sin coordenada** se marca en la tabla y se puede filtrar: la app lo muestra igual,
pero sin distancia (mejor eso que una ubicación inventada — con el radio de desbloqueo de
120 m, una coordenada falsa hace que el lugar se abra donde no está).

## Cambios que se hicieron en el hub (`server.js`)

1. **`hours` ahora se guarda.** `guardarNodoRadar` no incluía la columna del horario (existía
   en la tabla, se leía, pero no se podía escribir): se agregó a los campos editables y al
   `INSERT`. Sin eso, el campo “Horario” del panel se perdía en silencio.
2. **PATCH parcial arreglado.** El `UPDATE` viejo pisaba **todas** las columnas con lo que
   viniera en el cuerpo: un PATCH con sólo `{is_published: 0}` (lo que hace el botón
   Publicar/Ocultar) **vaciaba el nombre, la descripción y las coordenadas** del nodo. Ahora
   se actualiza únicamente lo que llega en el cuerpo (con alias `lat`/`lng`).
3. **Los borradores son sólo de administración.** `?incluir_borradores=1` no validaba nada:
   cualquiera podía listar los nodos sin publicar. Ahora se comprueba el permiso.
4. **Avisos en vivo.** Crear, editar y borrar emiten por el canal SSE (`radarEmitir`:
   `nodo_creado`, `nodo_actualizado`, `nodo_eliminado`), así que la app y el CRM se enteran.
5. **Validación de nombre** (≥3 letras) también en la edición, no sólo al crear.

## Archivos

| Archivo | Para qué |
|---|---|
| `paginas/nodos.html` | **Fuente editable** de la página (HTML+CSS+JS, sin dependencias más allá de Leaflet por CDN) |
| `scripts/insertar_pagina_hub.py` | Mete/reemplaza ese HTML dentro de `server.js` antes del catch-all de la SPA y lo deja escapado (`` ` ``, `\\`, `${`) |
| `scripts/probar_panel_nodos.py` | Batería de pruebas del panel y de la API (página, permisos, alta con horario, PATCH parcial, edición completa, borrado). Limpia todo lo que crea |
| `docs/NODOS_ADMIN.md` | Este documento |

### Editar la página y volver a desplegar

```bash
cd ~/athamu_workspace
# 1) editar paginas/nodos.html
# 2) meterla en server.js (reemplaza el bloque existente)
python3 scripts/insertar_pagina_hub.py --html=paginas/nodos.html \
  --const=PAGINA_NODOS --ruta=/nodos --titulo="Nodos del radar cultural (administración)"
node --check server.js                       # obligatorio
# 3) probar contra el hub LOCAL, con las credenciales del servicio, ANTES de desplegar
python3 - <<'PY'
import json, subprocess, shlex
g = subprocess.run(['gcloud','run','services','describe','atha-crm-web-frontend','--region','us-central1',
                    '--project','athamubot','--format=json'], capture_output=True, text=True)
env = {e['name']: e.get('value','') for e in json.loads(g.stdout)['spec']['template']['spec']['containers'][0].get('env',[])}
open('/tmp/hub_local_env.sh','w').write(''.join(f'export {k}={shlex.quote(v)}\n' for k,v in env.items()))
PY
set -a && . /tmp/hub_local_env.sh && set +a && PORT=8099 node server.js   # en otra terminal
python3 scripts/probar_panel_nodos.py --base=http://localhost:8099
# 4) desplegar CON TAG (con gente probando en vivo, nunca directo al 100%)
bash ~/.hermes/skills/atha-fase-mobile-workflow/scripts/hub_deploy_tag.sh nodos-admin
#    … y validar en la URL del tag:
python3 scripts/probar_panel_nodos.py --base=<url-del-tag>
# 5) recién ahí, mover el tráfico
gcloud run services update-traffic atha-crm-web-frontend --project=athamubot --region=us-central1 --to-latest
python3 scripts/probar_panel_nodos.py --base=https://atha-crm-web-frontend-897089213264.us-central1.run.app
```

## Trampas (ya pagadas)

- **El deploy del hub copia sólo `server.js`**: un archivo nuevo en `public/` no viaja en la
  imagen. Por eso la página se sirve en línea desde el propio `server.js` (y por eso su fuente
  vive en `paginas/`, que es material de trabajo, no algo que se sirva).
- **El HTML va dentro de un template literal**: si la página trae una comilla invertida, un
  `\\` o un `${`, hay que escaparlos. Lo hace `insertar_pagina_hub.py`; nunca pegar a mano.
- **Reemplazar el bloque deja el comentario viejo**: al re-insertar, el comentario de cabecera
  anterior puede quedar huérfano arriba (pasó al pasar de `/tmp` a `paginas/`). Revisar que
  quede UN solo encabezado antes de `const PAGINA_NODOS`.
- **`gcloud run deploy --set-env-vars` corrompe los nombres** de variables (les pega un `^`) y
  el hub queda sin BD: el deploy con tag usa `--env-vars-file=/tmp/hub_env.yaml` (se regenera
  desde el servicio actual, con los valores entre comillas JSON).
- **El chequeo de tráfico engaña**: `status.traffic[0].percent` es `null` para las entradas de
  tag; hay que buscar la que tiene `100`.

## Pruebas hechas (2026-09-27)

Contra el hub **local** (mismo `server.js`, misma base real), después contra la **URL del tag**
y al final contra la **URL pública**, con `scripts/probar_panel_nodos.py`: `GET /nodos` 200 con
la página completa; POST con `pipe.naranjo33@gmail.com` → **403**; alta en borrador → 200 con
horario y radio guardados; PATCH parcial (publicar) → 200 sin vaciar el resto; edición completa
→ 200 (comuna, horario y radio actualizados); DELETE → 200 y relectura 404. Todo lo creado se
borró en la misma corrida. Datos reales intactos tras el despliegue: **263 nodos publicados**,
20 eventos externos y 13 obras en cartelera.

- **Revisión desplegada**: `atha-crm-web-frontend-00103-nul` (tag `nodos-admin`, 100% del tráfico).
- **Rollback**: `gcloud run services update-traffic atha-crm-web-frontend --project=athamubot
  --region=us-central1 --to-revisions=<revision-anterior>=100` (la que servía tráfico quedó en
  `/tmp/hub_rev_anterior.txt`).

## Dependencia externa

El mapa usa **Leaflet 1.9.4 desde unpkg** (con `integrity`/SRI, hashes verificados). Si algún día
unpkg no responde, la página sigue funcionando —tabla, filtros, alta y edición— pero el mapa no
se dibuja: no hay copia local del JS de Leaflet a propósito (el deploy con tag sólo copia
`server.js`; empaquetarlo obligaría a rearmar la imagen con `--source .`).
