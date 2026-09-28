# Estado del ecosistema para la PRUEBA REAL (2026-09-27)

Resumen de lo que se dejó listo el 27/09 para empezar a probar con gente de verdad. Todo lo que
dice aquí está verificado contra el CRM y el hub en producción, no es un plan.

## El hallazgo que ordenó el día

Los **3 reportes de Gabriel Ríos** (tester real, 27/09 01:28–01:37) llevaban **13 horas sin leer**:
entraban desde el botón “Reportar algo” de la app y el CRM no tenía dónde verlos. Ese circuito
—lo que entra debe poder atenderse— era el que había que cerrar antes de invitar a más gente.

## Lo que se hizo

| Pieza | Estado |
|---|---|
| **Buzón del piloto** (`/reportes`) | Listo: ficha completa (texto, pantalla, versión, captura), estados nuevo/visto/resuelto, nota y quién atendió, **responder por correo desde la ficha**, borrado para limpieza |
| **Aviso por Telegram** de cada reporte | Listo: suena al instante, con el enlace al buzón (verificado: mensajes 14-17) |
| **Gabriel contestado** | Email con sus 3 reportes explicados (uno arreglado, dos que quedaron obsoletos por el cambio de rumbo de la app) a sus dos casillas + sus 3 reportes marcados `resuelto` |
| **Gabriel listo para la prueba** | Su ficha de nómina y su membresía en **Tenoia Musicalis** (las había declarado al anotarse al piloto, pero no existían en el CRM): ahora al entrar a la app ve su agrupación |
| **Agenda cargable desde el CRM** (`/agenda`) | Listo: alta/edición/baja de funciones con hora, rango, lugar, coordenadas y publicado/borrador + aviso por Telegram |
| **Cartelera con hora y fuente** | Listo: 23 eventos externos con `source_url`, y la app muestra **“Ver la fuente”** y **“hasta el …”** en las muestras de varios días |
| **Muestras de varios días** | Resuelto: `events.date_end` (columna nueva) y `events.time_start` admite NULL (una exposición no tiene hora) |
| **Rutas culturales** | 3 rutas reales cargadas (Centro histórico · Teatros · Museos y memoria) — la pestaña estaba vacía |
| **Panel de nodos** (`/nodos`) | Ya estaba; esta pasada se le sumó el filtro de borradores sólo-admin y las pruebas |
| **Datos de identidad** | Las **dos cuentas de Pipe** unificadas (se conserva la de Google, con sus 2 membresías y sus fichas), 3 membresías falsas de la iteración “Schultz” borradas, los 3 socios reales (Antonia Fernández, Joaquín Toledo, Nicolas Ortiz) ahora son miembros, y el Planner quedó apuntando al correo correcto |
| **Duplicado en el Planner** | “Gabriel Rios” estaba dos veces (doble clic): se dejó una |

Fuera de alcance pero anotado: las **7 compañías “sin nadie”** (INTERDRAM, Ilícita Teatro, Los
Dispersos, Proyecto Fuego, SantosFilms, Con Mucho Merkén, Q importa?) son `kind='colaboradora'`,
creadas por Francisco, cada una con su obra: **son legítimas y no se tocaron**.

## Cómo está la base hoy

- **263 nodos** del radar (todos publicados), **23 funciones** en la agenda (28/09 → 05/12), **13 obras** en cartelera.
- **3 rutas** culturales con 4-6 paradas cada una.
- **18 cuentas**, 18 membresías, 28 fichas de nómina (la diferencia es gente con correo placeholder `@athaproducciones.cl`, que no tiene casilla real).
- Auditoría de consistencia: de 27 chequeos, **quedan 5 avisos** y ninguno es un problema real (las 7 colaboradoras + el correo del agente y de Pipe en el Planner, que ahora apunta al correo que Pipe sí usa).

## Verificación (todo contra producción)

- **Baterías re-ejecutables**: `scripts/probar_panel_nodos.py` y `scripts/probar_reportes_agenda.py`
  (páginas 200, **403 con cuenta sin permiso**, alta/edición/borrado, PATCH parcial que no vacía
  datos, rango de fechas, respuesta por correo), más `scripts/probar_companias.py` (ficha, elenco y
  montajes de una agrupación) y `scripts/probar_catalogo_archivos.py` (ficha de obra, archivos,
  subida real a GCS y permisos: 33 comprobaciones). Todas crean sus propios datos y los borran. Corridas contra el hub **local**, la **URL del tag**
  y la **URL pública**: TODO OK.
- **Correo verificado por IMAP**: las respuestas salen del emisor del ecosistema (`fase.athamu@gmail.com`,
  Reply-To a Francisco) y quedan en `email_log`.
- **Deploy con tag** (nunca directo con gente probando): revisiones **00103-nul** (nodos) y
  **00105-puv** (buzón + agenda), validadas antes de mover el tráfico y con la anterior guardada
  para volver atrás.

## Lo que queda para después (dicho, no escondido)

1. **Notificaciones a los usuarios**: hoy el tester recibe correo; el push exige recompilar el APK (decisión de Francisco: va al final).
2. **Chat**: no está en la app (se sacó de la barra). Si vuelve, va dentro del Muro.
3. **Dos recintos sin coordenada**: Centro Cultural Oriente (Juan Martínez de Rozas 01040) y Centro Cultural y Teatro Baquedano (Baquedano 445) no están en OpenStreetMap: sus funciones se ven sin distancia hasta que alguien los confirme en terreno.
4. **Tablero del piloto**: falta una vista de métricas (descubrimientos por persona, lugares desbloqueados, reportes abiertos). El buzón ya muestra lo de reportes.
5. **Obra en el alta de agenda**: el formulario de `/agenda` todavía no ofrece elegir la obra del catálogo (se carga como texto). La producción de una agrupación ya puede publicar funciones vía API con su `obra_id`.
6. **Planner**: `planner_scheduled_rehearsals.confirmed_artist_ids` no se usa desde el CRM (los ensayos se agendan en el Planner).
