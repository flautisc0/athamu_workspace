# Idioma neutro, tema del radar y recomendaciones por cercanía

Fecha: 2026-09-27. Tres observaciones de Francisco después de usar la app: (1) "está escrito todo
en español argentino y debería ser español neutro", (2) "el tema de fondo en el radar quedó por
siempre color papel", (3) "hay que ajustar las recomendaciones del inicio para que sean
realmente cercanas".

## 1 · Español neutro

La app venía escrita con **voseo rioplatense**: *"tenés", "podés", "entrás", "andá", "mirá",
"elegí", "acá"*. Se pasó a **tuteo neutro**: *"tienes", "puedes", "entras", "ve", "mira", "elige",
"aquí"*.

Se hizo en **dos pasadas**, y la segunda fue la que de verdad cerró el tema:

1. **298 cambios en 42 archivos** con una lista explícita de las formas más visibles.
2. Al verificar quedaron ~128 casos sin convertir (*entrás, caminá, pertenecés, preferís, soltá,
   editás, reportás, ubicá, deslizá, adjuntá, publicá, quedás, necesitás…*). Se agregaron:
   - **regla general de los verbos en -ar** (`-ás` → `-as`: entrás→entras, sumás→sumas,
     caminás→caminas, con lista blanca para *más, además, quizás, jamás, detrás, áreas…*);
   - formas de **-er/-ir** explícitas (tenés→tienes, podés→puedes, querés→quieres, sabés→sabes,
     hacés→haces, movés→mueves, pertenecés→perteneces, preferís→prefieres, describís→describes…);
   - los imperativos que faltaban (caminá→camina, soltá→suelta, ubicá→ubica, descubrí→descubre,
     bajá/descargá→descarga, indicá→indica, publicá→publica, editás→editas…).

- Script: **`scripts/neutralizar_espanol.py`** (informe por defecto, `--aplicar` para escribir).
  Reemplaza **palabra completa**, respeta mayúscula inicial y no toca identificadores ni clases
  CSS. Los originales quedan en `backups/espanol/<ruta>`.
- **Termina con una revisión final**: vuelve a escanear todo buscando formas sospechosas y las
  informa en vez de tocarlas sola (hay palabras legítimas que terminan igual: *más, después,
  país, Machalí*). Ahora informa: **"no quedan formas de voseo detectables"**.
- **Error corregido en el camino (y cómo se arregló).** La regla general comparaba su lista blanca
  contra la **raíz** capturada en vez de la palabra completa, así que convirtió palabras legítimas:
  *atrás→atras, además→ademas, detrás→detras, demás→demas, quizás→quizas, jamás→jamas,
  estás→estas* — **57 casos**, varios visibles al usuario ("cuando estas ahí"). Se detectó con un
  escaneo específico de formas sin tilde y se revirtió con **`scripts/reparar_espanol_danado.py`**
  (54 arreglos; los 3 restantes eran demostrativos legítimos: *"estas dos claves"*, que no se
  tocan). El script quedó con la comparación corregida y **comentada**, para que no vuelva a pasar.
- Otro error de la primera versión, también corregido: sólo miraba **dos** archivos de `scripts/`,
  así que los correos (`enviar_correo_piloto.py`, `responder_reportes_gabriel.py`,
  `enviar_correo_agenda_rancagua.py`) quedaron con voseo (44 casos). Ahora recorre `scripts/*.py`,
  y **excluye a propósito** su propio archivo y este doc (contienen el diccionario).
- Alcance: `fase-mobile/src`, `fase-mobile/mobile`, `paginas/*.html`, `server.js` (que tiene las
  páginas del hub embebidas), los correos de `scripts/` y los `docs/`.
- Verificación hecha: `node --check server.js`, `py_compile` de los correos, `tsc --noEmit` de la
  app, re-correr el script (0 restos) y **el bundle desplegado**: 0 apariciones de *tenés, podés,
  querés, andá, mirá, elegí, acá* en el JavaScript servido.

Vocabulario de referencia para las pantallas nuevas: tenés→tienes · podés→puedes · querés→quieres ·
sos→eres · entrás→entras · andá→ve · mirá→mira · tocá→toca · entrá→entra · usá→usa · dejá→deja ·
cargá→carga · elegí→elige · escribí→escribe · pedí→pide · subí→sube · compartí→comparte ·
mandá→envía · buscá→busca · revisá→revisa · probá→prueba · caminá→camina · soltá→suelta ·
fijate→fíjate · sumate→únete · **acá→aquí**.

## 2 · El radar sigue al tema (ya no queda crema para siempre)

**Causa:** `RadarCercania` llevaba la clase **`.tema-papel` fija en su contenedor**. Esa clase
existe para el "modo papel" de la app (una variante de piel que se elige en Perfil), así que el
radar quedaba con los tonos crema **aunque el usuario eligiera modo claro u oscuro**. El mapa de
Google sí seguía al tema (`ESTILO_OSCURO`), el resto de la pantalla no.

**Fix:** el radar tiene su propia piel, **`.piel-radar`** (`src/index.css`), con los tokens
`--papel-*` definidos en tres estados:

| Estado | Cuándo | Tonos |
|---|---|---|
| `.piel-radar` | app en modo claro | fondo `#f7f7f8`, tarjetas blancas |
| `html.tema-papel .piel-radar` | modo papel (Perfil) | crema `#f5efe4`, como el mock original |
| `html.dark .piel-radar` | modo noche | fondo `#121110`, tinta `#f3ede4`, acento `#e0714f` |

Las clases auxiliares `papel-titulo` (tipografía Fraunces) y `papel-linea` (el separador dibujado
a mano) se extendieron a `.piel-radar` para que la piel siga completa en los tres modos.

**Regla para el futuro:** un componente **no** se pone `.tema-papel` a sí mismo — esa clase es del
`<html>` y la pone el tema elegido. Si una pantalla quiere la piel papel, usa `.piel-radar` (o pide
su propia clase con sus tres estados).

## 3 · Recomendaciones del Inicio: cercanía real

**Antes:** una sola lista ("Próximos eventos") que mezclaba lo que está a dos cuadras con lo que
queda a 40 km, ordenada por fecha o por distancia sin distinguir. Desde otra ciudad, las funciones
de Rancagua se mostraban igual, como si fueran "recomendaciones".

**Ahora** (`InicioView`), cuando hay ubicación se arman **anillos**:

- **≤ 2 km** — se puede ir caminando (van primero, ordenados por cercanía real).
- **2 – 10 km** — cerca, con la distancia a la vista.
- **> 10 km y sin coordenada** — **no se ofrecen como cercanas**: quedan detras de un enlace
  *"Ver también N funciones más lejos"*.
- El encabezado pasa de *"Próximos eventos"* a **"Cerca de ti"** con la aclaración de que está
  ordenado por cercanía real.
- Si no hay nada en los anillos cercanos, se dice tal cual: **"No hay funciones cerca de ti"** con
  **la más cercana y a cuántos km** (dato real, sin inventar) y un acceso a toda la agenda.
- Sin permiso de ubicación no se inventa cercanía: la agenda va por fecha y sigue el aviso para
  activar el permiso.

**Evidencia usada para calibrar los anillos** (Plaza de los Héroes, `lat=-34.1708&lng=-70.7444`):
de 23 funciones, 19 tienen coordenada y **las 19 están a ≤ 634 m**; las 4 sin coordenada son
muestras sin dirección cargada. Es decir: en Rancagua todo cae en el anillo "a pie" (antes se
mezclaba igual, pero sin orden ni aviso), y **desde Santiago —donde todo queda a ~80 km— ya no
aparecen como recomendación**, que era el caso que molestaba.
