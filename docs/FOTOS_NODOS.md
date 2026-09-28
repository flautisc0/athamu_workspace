# Fotos de los nodos del radar (por qué faltaban y cómo se completaron)

Estado: 2026-09-27. Reporte de Francisco: *“las fotos en las fichas de los nodos nuevos no se
ven, aunque los lugares descubiertos sí”*. **No era la app: eran los datos** (más un detalle de
la ficha que lo empeoraba).

## Diagnóstico (con números)

- **Sólo 60 de 263 nodos publicados tenían foto** (23%). Por comuna: Santiago 37/146,
  Providencia 13/62, Recoleta 7/15, **Rancagua 2/12**, **Machalí 0/4**, Quilicura 0/13,
  Conchalí 0/6.
- La causa: la carga original (`scripts/nodos_reales.cjs`) buscaba la foto **sólo si OpenStreetMap
  traía los tags `wikipedia`/`wikidata`**. Los lugares de Rancagua (y buena parte de Santiago) no
  los traen → quedaron sin foto.
- Y en la ficha (`NodeDetailModal`) el `<img>` se pintaba **siempre**: sin `cover_url` quedaba un
  recuadro vacío o el ícono de imagen rota, que se lee como “la app está rota”.

## Lo que se hizo

**1 · Fotos reales para los que no tenían** — `scripts/fotos_nodos.cjs` (idempotente, sólo llena
`cover_url` vacíos, con backup):
- busca primero en **Wikipedia (es)** el artículo del lugar y usa su imagen principal;
- si no hay artículo, busca una **foto libre en Wikimedia Commons**.

**2 · Verificación antes de escribir** (el corazón del script: es fácil traer la foto de OTRO
lugar). Todas las reglas deben pasar:

| Regla | Por qué |
|---|---|
| El título cubre **≥75% de las palabras que identifican al nodo** (se mide sobre el nodo, no sobre el título) | evita que “Centro Español de Rancagua” matchee el artículo “Rancagua” |
| **Coordenadas del artículo a ≤500 m** del nodo; si el artículo no trae coordenadas, se exige la **comuna en el título** | evita el artículo de una avenida a 1,6 km |
| Si el nodo tiene **una sola palabra identificatoria**, además se exige la comuna | “Cinemark” no puede matchear una foto de otro país |
| Se descarta el nodo que **se llama sólo con la comuna** | “Biblioteca Municipal de Quilicura” no puede usar el artículo de Quilicura |
| El título **no puede traer palabras que cambien el sujeto** (universidad, municipalidad, iglesia, liceo, hospital, fundación…) | “Teatro Finis Terrae” no puede usar el artículo de la *Universidad* Finis Terrae |
| Commons: se descartan **mapas, escudos, logos y obras de arte** (cuadro, pintura, mural, escultura…) | “Museo Taller” trajo la foto de un *cuadro* |
| **La misma imagen no se asigna a dos nodos** | si dos fichas matchean el mismo archivo, es señal de duplicado de nodo |

Resultado: **+41 fotos (12 wikipedia, 29 commons)** → el radar quedó con **101/263 con foto**
(Rancagua pasó de 2 a 4). Las 162 restantes **se quedan sin foto a propósito**: mejor sin foto
que con la de otro lugar.

**3 · La ficha ya no muestra un recuadro roto** — `fase-mobile/src/components/FotoNodo.tsx`:
sin `cover_url` muestra un marcador de papel con el ícono de cámara y “Sin foto” (y en las
miniaturas, sólo el ícono). Se usa en la ficha del nodo y en el listado del perfil.

## Cómo se vuelve a correr

```bash
cd ~/athamu_workspace
python3 scripts/correr_en_hub.py scripts/fotos_nodos.cjs                    # informe (no escribe)
python3 scripts/correr_en_hub.py scripts/fotos_nodos.cjs --ciudad=Rancagua  # sólo una comuna
python3 scripts/correr_en_hub.py scripts/fotos_nodos.cjs --aplicar          # escribe + backup
```

## Pendientes de esta tanda

1. **Revisar a ojo** un puñado de coincidencias dudosas (el script las marca con su fuente y
   página): *Cinepolis* → `Cinépolis, La Reina` (la cadena, otra comuna), *Biblioteca de la Corte
   Suprema* → artículo del edificio, *Museo de la Merced* → basílica, *Sala Museo Gabriela
   Mistral* → galería a 376 m. **Se cambian a mano desde `/nodos`** (campo Foto).
2. **Dos nodos “Cinepolis”** en Santiago: la regla de imagen repetida lo dejó en evidencia. Hay
   que decidir si son dos salas reales o un duplicado (el panel de `/nodos` tiene detector).
3. **162 nodos sin foto**: la mayoría son bibliotecas de barrio, centros culturales y cines sin
   artículo ni foto libre. La vía para esos es la foto **del propio lugar** (la puede subir
   cualquiera desde `/nodos` con una URL, o a futuro una foto tomada en terreno).
