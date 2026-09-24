# Identidad, seguridad y la LLAVE del ecosistema ATHA

Fecha: 2026-09-24 · Hub: `atha-crm-web-frontend` (Cloud Run, proyecto `athamubot`)
Alcance: identidad, autorización y el paso de sesión del CRM hacia los artefactos.

Este documento existe para no volver a depurar lo mismo. Describe **cómo era**,
**qué se cambió** y **cómo se verifica**.

---

## 1. El modelo viejo (y por qué era inseguro)

La identidad era **un string que el cliente mandaba**: el header `x-atha-email` o
el parámetro `?email=`. El servidor lo creía y buscaba ese correo en `users`.

Consecuencias reales, verificadas en el código:

| Hoyo | Evidencia |
|---|---|
| `curl -H 'x-atha-email: <correo-admin>' /api/v1/crm/usuarios` = admin completo | `permisoAdmin()` leía el header |
| `handleGoogleAuth` **no verificaba la firma** del id_token | `decodeJwtPayload()` hacía sólo base64 del payload |
| El rol venía del **body del cliente** | `body.role` en `/api/auth/google` y `/api/auth/register` |
| El registro **daba sesión** y si el correo ya existía **entraba a esa cuenta** y le pisaba `display_name`/`role`/`role_title` | `POST /api/auth/register` |
| Al registrarse como "productor" el alta te metía en la compañía por defecto con rol `coordinator` ⇒ **escritura de inventario regalada** | `company_members` + `ROLES_GESTION` |
| `requireAdmin` **fallaba abierto** (`next()` siempre) | no protegía `/admin-api.php` ni `/admin-ui.php` |
| `users` **no tiene columna password** | `schema_sqlite.sql` |

## 2. El modelo nuevo

### 2.1 Token de sesión del hub
Al loguear con Google, el hub firma su **propio JWT** (`JWT_SECRET_KEY`, HS256) y lo
devuelve en `data.token`. El frontend lo guarda en `localStorage['atha_auth_token']`
y lo manda en cada llamada como `Authorization: Bearer <token>`.

`emailDeSesion(req)` es la **única** fuente de identidad. Un middleware normaliza los
dos canales viejos (`x-atha-email` y `?email=`) con el valor **verificado** (o los
borra), así que las ~25 guardias que ya existían quedaron correctas sin tocarlas.

### 2.2 Verificación real del id_token de Google
`verificarTokenGoogle()` usa `https://oauth2.googleapis.com/tokeninfo` → valida
**firma + `aud` + `exp` + `email_verified`** sin agregar dependencias (el runtime
instala con `--omit=dev`, así que `google-auth-library` no está disponible).

`GOOGLE_CLIENT_ID` debe ser **el mismo** clientId que usa el botón del CRM
(`AuthModal.tsx`), o el login devuelve 401. Si la variable no está seteada, el
chequeo de `aud` se omite (no falla, pero es más débil).

### 2.3 Registro = SOLICITUD de acceso
`POST /api/auth/register` ya **no** da sesión, **no** crea usuario con rol y **no**
toca filas existentes: sólo anota la solicitud en la tabla `access_requests`
(`estado='pendiente'`). Para entrar hay que pasar por Google; el rol y la compañía
los asigna un administrador en Administración.

Rol de entrada de un usuario nuevo: `explorador` (**sin** compañía, sin permisos).

### 2.4 AUTH_MODO: la llave de la transición
`AUTH_MODO=mixto` (default) acepta también el header viejo; `AUTH_MODO=estricto`
sólo acepta token del hub. **Mixto existe para no cortarles la sesión a los
artefactos que todavía no canjean la llave.** Cuando todos canjeen → `estricto`.

## 3. La LLAVE (ticket de un solo uso)

Reemplaza al SSO por query (`?auth=1&email=…&role=…`) que exponía la identidad en
la URL, el history, los logs y el Referer — y que además ya no funcionaba porque
cada artefacto leía una clave distinta.

```
1. El CRM pide el ticket      POST /api/auth/ticket      (Bearer del usuario)  → { ticket }
2. El navegador va al artefacto con  ?t=<opaco>          (nada más en la URL)
3. El artefacto lo canjea     POST /api/auth/exchange     { ticket, destino }
   → { ok, token, usuario }   y el hub QUEMA el ticket (usado=1) ANTES de responder
4. El artefacto guarda su sesión local + el token, y usa el token como Bearer
```

- Tabla `auth_tickets` (en la misma MySQL `admin_crm` del hub): TTL 120 s por
  defecto (`TICKET_TTL_SEG`), un solo uso, atado al destino.
- `DESTINOS_LLAVE` (env, lista separada por comas) decide **qué** destinos reciben
  `?t=`. Los demás siguen entrando por query mientras se los parchea: la migración
  se hace de a uno y no se rompe nada.
- CORS `*` **sólo** en `/api/auth/ticket` y `/api/auth/exchange` (el ticket es
  opaco, de un solo uso y de vida corta).

## 4. Cómo se verifica (sin navegador)

```bash
HUB=https://atha-crm-web-frontend-897089213264.us-central1.run.app
# token de prueba (mismo JWT_SECRET_KEY del servicio)
TOK=$(node -e "const j=require('jsonwebtoken');console.log(j.sign({email:'<correo>',role:'admin'},process.env.JWT_SECRET_KEY,{expiresIn:'1h'}))")

# 1) sin identidad -> 403 ; con header legacy y AUTH_MODO=mixto -> 200 ; en estricto -> 403
curl -s -o /dev/null -w "%{http_code}\n" $HUB/api/v1/crm/usuarios
curl -s -o /dev/null -w "%{http_code}\n" -H 'x-atha-email: <correo>' $HUB/api/v1/crm/usuarios
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOK" $HUB/api/v1/crm/usuarios

# 2) token de Google fabricado -> 401
curl -s -X POST $HUB/api/auth/google -H 'Content-Type: application/json' -d "{\"id_token\":\"<jwt-inventado>\",\"role\":\"admin\"}"

# 3) perfil
curl -s -H "Authorization: Bearer $TOK" $HUB/api/v1/perfil

# 4) llave: emitir, canjear, y probar que NO se puede canjear dos veces
T=$(curl -s -X POST $HUB/api/auth/ticket -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"destino":"planner"}')
curl -s -X POST $HUB/api/auth/exchange -H 'Content-Type: application/json' -d "{\"ticket\":\"<ticket>\"}"
# el segundo canje, un ticket inventado, y un destino distinto DEBEN dar 401
```

## 5. Pitfalls encontrados (para el próximo)

- **`gcloud run services describe` tarda >180 s en esta máquina**: no sirve para
  chequear env vars al paso. Usar `--update-env-vars` en vez de `--set-env-vars`
  evita tener que conocer la lista completa (y no borra las credenciales de BD).
- **`grep -c` miente en bundles minificados** (cuenta líneas, y los acentos quedan
  escapados como `\u00f3`): usar `str.count()` en python sobre los bytes y buscar
  fragmentos sin acentos.
- **Nunca encadenar el build a `| tail`**: oculta el fallo y despliega el bundle
  viejo. Redirigir a un log y leerlo.
- El CLI de vite puede quedar bloqueado: build por la **API JS de Vite** desde una
  copia en `/tmp` con `node_modules` enlazado.
- **Riesgo abierto**: si Google GIS no está autorizado para el origen del CRM, el
  login con Google no funciona y la única entrada que quedaba (el registro) ahora
  es una solicitud. Por eso el deploy va en `AUTH_MODO=mixto`: las sesiones ya
  guardadas siguen entrando. Verificar el botón de Google **antes** de pasar a
  `estricto`.

## 6. Estado por artefacto

| Artefacto | Antes | Ahora |
|---|---|---|
| CRM (hub) | identidad por header | token del hub + verificación de Google + perfil + solicitud de acceso |
| `artha-arquitecto` | leía `atha_user_session` y `?email=` | ver `atha-llave.js` |
| `buscardor-de-fondos` | leía `atha_user_session` + `?email=` **y un correo hardcodeado** | ver `atha-llave.js` |
| `planner-frontend` | leía `fase_current_user` (¡no `atha_user_session`!) y traía `panxo.sms@gmail.com` en el bundle | ver `atha-llave.js` |
| `ticketerapp` | **no tenía nada** de sesión | ver `atha-llave.js` |

## 7. Pendientes / deuda

- Pasar a `AUTH_MODO=estricto` (y sólo entonces) y agregar los destinos a
  `DESTINOS_LLAVE` a medida que cada artefacto quede verificado.
- Los deep links del CRM (`?ir=<seccion>&email=`) y de `fase-mobile` siguen usando
  la identidad por query: migrarlos a la llave.
- El panel de usuarios pasa a ser artefacto (`fase-user-pannel`) con tarjeta de
  acceso en el CRM — ver `docs/ROLES_Y_USUARIOS.md`.
