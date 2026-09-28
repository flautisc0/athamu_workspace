# Piloto del radar cultural en Rancagua (Felipe Naranjo)

Estado: **cargado y enviado (2026-09-27)**. Es el primer piloto fuera de Santiago.

## Por qué Rancagua

Francisco quiso probar el radar con alguien que vive fuera de Santiago: la geolocalización
funciona igual, pero el mapa cultural estaba **vacío** ahí (0 nodos en 40 km), así que el
radar no tenía nada que recomendar. Primero se puebla la ciudad, después se invita.

**Felipe Naranjo** (`pipe.naranjo33@gmail.com`) aparece en el CRM en dos fichas de nómina
(TMLL — Diseño Lumínico & Elenco, y ATHA Kids — Actor & Ensamble) y en sus dos membresías,
así que ya puede entrar a la app con su correo.

## Qué se cargó

16 lugares reales cosechados de OpenStreetMap (12 en Rancagua, 4 en Machalí):

```bash
# 1. cosechar (Overpass, sin API key). Grupo "rancagua" = 5 zonas de la ciudad.
python3 scripts/recolectar_nodos.py --grupo=rancagua --guardar --salida=/tmp/nodos_rancagua.json

# 2. informe (no escribe) y después la carga real
python3 scripts/correr_en_hub.py scripts/nodos_reales.cjs --archivo=/tmp/nodos_rancagua.json
python3 scripts/correr_en_hub.py scripts/nodos_reales.cjs --archivo=/tmp/nodos_rancagua.json --insertar
```

A menos de 1 km de la Plaza de los Héroes quedaron **9 lugares** para descubrir caminando:
Teatro San Martín (208 m), Orfeón de la Plaza (315 m), Museo Regional de Rancagua (387 m, con
horario y foto), Cinemark (427 m), Museo Patrimonial de la Merced (482 m), Casa de la Cultura
(583 m, con foto), Biblioteca Pública Eduardo de Geyter (606 m, con horario), Teatro Regional
Lucho Gatica (634 m) y Casa del Arte (660 m).

Total del CRM: **263 nodos** (247 de Santiago + 16 de Rancagua/Machalí).

### Filtros que se aplicaron (el mapa no se rellena con basura)

- **Ruido descartado**: juntas de vecinos, sedes sociales, clubes de adulto mayor, canchas,
  parroquias y **bibliotecas de liceos/colegios** (no son visitables por cualquiera).
  De 22 cosechados quedaron 18.
- **Duplicados de OSM** (el mismo lugar como nodo y como polígono): se comparan **dentro de
  la cosecha** (`nodos_reales.cjs`), en tres reglas — mismo nombre a <300 m, un nombre
  contenido en el otro a <600 m, y **≥60% de palabras en común del nombre más corto** para
  el mismo tipo de lugar a <500 m (así se fusionaron "Museo Comunal Rumel" y "Museo Comunal
  de Machalí Rumel", que están a 410 m). 18 → 16.
- La **región sale de la comuna real** (`regionDe()`): Rancagua/Machalí quedan como
  *Región del Libertador Gral. Bernardo O'Higgins*, no "Metropolitana" (que estaba fijo).

## El correo de invitación

Sale del emisor del ecosistema (`fase.athamu@gmail.com`, Reply-To al correo personal de
Francisco) por el endpoint del hub `POST /api/v1/crm/avisos/correo` con el **HTML propio**
(no hubo que tocar el hub ni desplegar nada: ese endpoint acepta `html`).

```bash
python3 scripts/enviar_correo_piloto.py --para=pipe.naranjo33@gmail.com \
  --nombre=Felipe --ciudad=Rancagua --lugares=16 --enviar --copia
```

Contenido: que es el estreno de Rancagua + **6 tareas** (abrir la app con su correo, dar
permiso de ubicación, ver el Radar "Todo cerca" con los km reales, caminar a uno y
desbloquearlo a menos de 120 m, publicar en el Muro con foto, usar "Reportar algo" si algo
falla) + el aviso de que es una prueba en curso.

**Verificación del envío** (un `250` del SMTP no alcanza):
`scripts/verificar_correo_llegado.py --asunto="radar cultural"` lee el INBOX del agente por
IMAP y muestra de/para/Reply-To/asunto/cuerpo y si viajan los links. Resultado: llegó con la
identidad correcta (*ATHAMU · FASE*), Reply-To a Francisco, con los dos links.
Sin rebotes (`mailer-daemon` / `postmaster` / `Delivery`: 0 mensajes).

## Pendientes

1. **Unificar las dos cuentas de Felipe**: `pipe.naranjo33@gmail.com` (la de las fichas, a la
   que se envió) y `pipenaranjo33@gmail.com` (con la que entró por Google). Si entra con la
   segunda, sus descubrimientos y su perfil quedan en una cuenta distinta de la que lo
   vincula a TMLL y ATHA Kids.
2. Esperar su primer reporte para ajustar datos del mapa (categorías que no calzan, algún
   lugar mal ubicado) — es lo que la prueba busca.
3. Repetir el patrón para la próxima ciudad: `--grupo=<ciudad>` nuevo en `ZONAS`
   (`scripts/recolectar_nodos.py`) + el mismo par de scripts.
