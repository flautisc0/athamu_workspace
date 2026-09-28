# Iteración: tarjetas del Inicio, fotos a mano y hallazgos del feed

Fecha: 2026-09-27 (segunda ronda de la tarde). Pedidos de Francisco después de usar la app:
*(1)* el dashboard del principio debería tener **sólo 5 recomendaciones**, como **tarjetas que se
abren**, con **foto**, **descripción** y **link a la fuente** ("se siente medio falso al no poder
interactuar"); *(2)* varios nodos siguen sin foto y hace falta una **manera manual** de encontrarlas
—él puede rellenar lo que falte en el CRM—; *(3)* ideas sobre perfil e insignias; *(4)* la pestaña
de **rutas** se ve color papel en modo lista; *(5)* "hay mucho texto y debería ser más diseño que
texto".

## 1 · Las tarjetas del Inicio

- **Cinco recomendaciones y nada más** (`MAX_RECOMENDADAS = 5`, decisión suya). El resto **no se
  pierde**: queda detrás de **"Ver N funciones más"** (antes ese enlace sólo aparecía con las que
  estaban lejos; ahora también cubre lo que sobra de las cinco).
- **La tarjeta ahora es una tarjeta**: empieza por la **foto** (del evento o de la obra, con el
  marcador `FotoNodo` si no hay), con la fecha en bloque sobre la imagen, el título y una línea con
  *hora · lugar · distancia*. **Se toca y se abre**: al abrir aparecen los datos completos y los
  **enlaces reales** (*Entradas*, *Ver la fuente*). Los enlaces viven **fuera** del botón: un `<a>`
  dentro de un `<button>` es HTML inválido y el clic se lo come el contenedor.
- **La descripción** sale de datos reales, en este orden: **sinopsis de la obra** (`projects.synopsis`,
  ya viajaba en la API pero no se pedía en `/radar/eventos` — se agregó al SELECT) → primera parte
  de las **notas del CRM** (descartando el pie *"Fuente: …"*) → y si no hay nada, **los datos
  reales** del evento: *tipo · lugar · comuna · condición* (p. ej. "Entrada liberada"). **No se
  inventa texto.**

### Hallazgo del feed (importante para la próxima cosecha)

El calendario de Rancagua **no publica descripción** para las funciones próximas: de 222 páginas de
evento, sólo **41** traen el bloque de descripción, y **0 de las 24 próximas**. Sí trae lo demás
(título, fecha/hora, lugar, imagen, categorías, "entrada liberada" en el título).
Las descripciones que existan se cosechan igual: la página del evento tiene el bloque
`tribe-events-single-event-description` y el cosechador lo extrae — con **dos trampas** que costaron
dos corridas:

1. **Buscar la apertura del contenedor** (`<div class="tribe-events-single-event-description…">`).
   Buscando sólo `class="…"` el primer match es el **comentario de cierre** de la plantilla y se
   extrae basura (aparecía "Añadir al calendario Google Calendar…").
2. **El cosechador sólo escribe el JSON con `--salida=`**. Sin ese argumento imprime por pantalla y
   el archivo viejo queda intacto: dos verificaciones seguidas dieron "0 descripciones" porque se
   estaba leyendo el JSON de la corrida anterior. Correr siempre:
   `python3 scripts/recolectar_agenda_rancagua.py --salida=/tmp/agenda_rancagua.json`.

Para las que no tienen descripción, la vía es **el CRM**: el panel `/agenda` tiene el campo Notas y
es lo que muestra la tarjeta al abrirse.

## 2 · Fotos: buscarlas a mano desde el CRM

Los 162 nodos sin foto no se resuelven con un script (no hay artículo ni foto libre con nombre
verificable). Se agregó la vía **manual**, que es la que él pidió:

- **Endpoint** `GET /api/v1/crm/radar/fotos-sugeridas?q=<lugar>&ciudad=<comuna>` (sólo administración):
  busca en **Wikimedia Commons** y devuelve hasta 8 candidatas con su título, autor y licencia.
  Descarta mapas, escudos, logos y obras de arte. **No elige: sugiere.**
- **En `/nodos`**, al lado del campo *Foto (URL)* hay un botón **“Buscar fotos”**: abre una galería
  de candidatas con su procedencia (título · licencia · autor — para dar crédito), se elige la que
  corresponde con un clic, queda en el campo y se ve la **vista previa** antes de guardar. También
  hay enlaces a *ver todas en Commons* y a *Google Imágenes* para los casos en que Commons no tenga
  nada.
- Probado con casos reales: *Centro Español de Rancagua* → 9 candidatas; *Orfeón de la Plaza de los
  Héroes* → 0 (no hay foto libre: queda el aviso y los enlaces, sin inventar nada).

## 3 · Pendientes de esta iteración (propuestas, sin ejecutar)

- **Perfil más editable** (foto de portada, más campos de artista).
- **Insignias interactivas**: que cada insignia abra su ficha (cómo se gana, progreso, cuándo se
  obtuvo) y el diseño de **crests** que él va a trabajar.
- **Rutas en modo lista**: ver más abajo — hace falta una captura para no arreglar a ciegas.
- **Menos texto, más diseño**: pasada de diseño en las pantallas con más texto (Inicio, Muro,
  Perfil) cuando elija por dónde empezar.
