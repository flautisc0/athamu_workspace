# Geolocalización real y recomendación por cercanía

Estado: **implementado y desplegado (2026-09-27)** · App: `fase-mobile` · aplica a la
pestaña **Radar ("Todo cerca")**, a la agenda del **Inicio** y al **mapa**.

## El problema que se arregló

La app **ya pedía el GPS** (commit `9fbce5b`, permiso real + `watchPosition`), pero la
recomendación por cercanía no era confiable por tres razones:

1. **El store arrancaba con una coordenada inventada** (`-33.43985, -70.67211`, NAVE /
   Barrio Yungay) y **nada distinguía ese punto de una posición real**. Si el permiso se
   negaba, el GPS tardaba o fallaba, el radar seguía ordenando y mostrando distancias
   calculadas desde ese punto falso — y la campana de notificaciones traía dos avisos de
   ejemplo del tipo *"Estás a 45 m de NAVE"*.
2. **No había radio**: "Todo cerca" listaba los 247 lugares hasta 13 km, así que la
   supuesta recomendación era una lista larga sin criterio de cercanía real.
3. **No se podía reintentar**: el permiso se pedía una sola vez al arrancar; si se negaba,
   la app quedaba sin posición real hasta reiniciarla.

## La regla que queda (no romperla)

> **NO se inventa cercanía.** Una distancia, un orden "más cerca primero" o un
> "estás cerca de…" sólo se muestran cuando la posición viene del GPS del teléfono
> (o de la caminata de prueba, declarada como simulación).

En el store:

| campo | qué significa |
|---|---|
| `ubicacionReal` | la posición viene del GPS del teléfono |
| `ubicacionPrecision` | precisión del último fix (±m), se muestra en el radar |
| `ubicacionTs` | cuándo se obtuvo el último fix |
| `simulandoUbicacion` | la posición viene de la **caminata de prueba** del mapa (demo explícita) |

`setUserLocation(coords, esReal)` estampa esos campos **sólo** cuando `esReal` es true.
La caminata de prueba del mapa llama `setUserLocation(coords, false)`: mueve la posición
para poder probar el desbloqueo, pero **nunca** la marca como GPS real.

## Qué ve el usuario

- **Con GPS real**: orden por distancia, chips de radio **1 km · 3 km · 10 km · Todo**
  (por defecto 3 km), contador `"N lugares a menos de 3 km · N ya descubiertos · ±12 m"`
  y distancia en cada tarjeta.
- **Sin GPS real**: subtítulo *"Sin tu ubicación no podemos ordenarte lo que tienes cerca"*,
  lista **alfabética sin distancias**, y una tarjeta **"Activa tu ubicación"** con el botón
  **"Usar mi ubicación"** que dispara el permiso de nuevo.
- **Radio sin resultados**: *"Nada a menos de 3 km en este grupo · N lugares del grupo
  quedan más lejos"* con botón para ampliar a "sin límite de distancia".
- **Geofencing** (aviso "¡Cerca de X!"): sólo con posición conocida.
- El **Inicio** sólo manda la ubicación a la agenda cuando es real (si no, la agenda no
  ordena por cercanía).

## Reintento del permiso

- Al volver la app al frente (`visibilitychange`) si todavía no hay fix real.
- Con el botón **"Usar mi ubicación"** del Radar (`reintentarUbicacion` en `App.tsx`).

## Verificación

```bash
# 1. que el bundle desplegado traiga la regla nueva
cd /home/flautisc0/athamu_workspace/fase-mobile
node ./node_modules/typescript/bin/tsc --noEmit          # debe salir limpio
grep -c "Activa tu ubicación" dist/assets/index-*.js     # >= 1
grep -c "posición simulada (demo)" dist/assets/index-*.js # >= 1

# 2. distancias reales del hub desde un punto conocido
curl -s -H "x-atha-email: panxo.sms@gmail.com" \
  "https://atha-crm-web-frontend-897089213264.us-central1.run.app/api/v1/crm/radar/nodos?lat=-33.4372&lng=-70.6506" \
  | python3 -c "import json,sys; n=[x for x in json.load(sys.stdin)['nodos'] if x['distance_m'] is not None]; n.sort(key=lambda x:x['distance_m']); print(len(n),'nodos con distancia ·','el más cerca:',n[0]['name'],round(n[0]['distance_m']),'m')"
```

Referencia (Plaza de Armas, 2026-09-27): 247 nodos, el más cercano a 9 m
(Museo Histórico Nacional), 68 a menos de 1 km.

## Pendientes (decidir con Francisco)

1. **El hub no valida la distancia al descubrir**: `POST /api/v1/crm/radar/descubrimientos`
   acepta cualquier lat/lng, así que se puede desbloquear un lugar a 13 km (o desde el
   punto simulado). Endurecerlo: si `method === 'gps'`, exigir que la posición enviada
   esté dentro de `unlock_radius_m` (con tolerancia por el ruido del GPS).
2. **El radio del mapa no calza con el de desbloqueo**: el mapa dibuja
   `detectionRadiusM` (50 m del store) mientras los nodos desbloquean a `unlock_radius_m`
   (120 m por defecto en la base). Conviene que el círculo use el radio del nodo.
3. **La agenda de eventos sigue vacía** (`events` = 0 filas): la recomendación geolocalizada
   de la cartelera no tiene qué mostrar hasta que producción cargue funciones reales.
