#!/usr/bin/env python3
"""
Batería de pruebas del catálogo de obras con archivos (Tanda A):
ficha parcial, archivos de la obra, subida genérica y permisos.

Está escrita para correr contra el hub CUANDO LOS ENDPOINTS YA EXISTAN
(ver docs/CONTRATO_CATALOGO_ARCHIVOS.md). Mientras no existan, no se corre:
sólo se deja lista y verificada con `python3 -m py_compile`.

Uso:
    python3 scripts/probar_catalogo_archivos.py --base=http://localhost:8099
    python3 scripts/probar_catalogo_archivos.py --base=https://<url-del-tag>
    python3 scripts/probar_catalogo_archivos.py --admin=otro.admin@ejemplo.cl

Qué comprueba (y limpia TODO lo que crea):
  1 · ficha de la obra: PUT parcial {duration} → 200 y NO pisa el título ni la sinopsis;
      {title:''} → 400; obra inexistente → 404; el catálogo ya trae ficha/logo_url/files/dossier_url.
  2 · archivos de la obra: POST tipo dossier → 200 → aparece en GET …/files → tipo inválido,
      sin nombre y sin url → 400 → DELETE → 200 → ya no aparece → DELETE repetido → 404.
  3 · subida genérica: POST /api/v1/crm/archivo con un PDF chico → 200 con url y bytes;
      mime no permitido (text/html) → 400; archivo de más de 25 MB → 400 y el mensaje trae el límite.
  4 · permisos: ficha, archivos y subida genérica con un correo sin permiso → 403.
  5 · compañías: PUT del logo → 200 → al releerlo quedó guardado → se restaura el logo anterior.

Nunca toca datos reales: crea su PROPIA obra de prueba (`PRUEBA catálogo con archivos`) y la borra
al final (incluso si algo falla a mitad de camino). Sobre el logo de la compañía: guarda el valor
previo y lo vuelve a dejar como estaba.

Notas para cuando se corra:
  · El POST de más de 15 MB se manda de verdad (~21 MB de cuerpo), así que puede tardar.
    El tope del hub es 15 MB (no 25): el archivo viaja en base64 y la plataforma de Cloud Run
    corta el request en 32 MB.
    Se acepta 400 (lo pedido) o 413, que es el otro código honesto para «demasiado grande»;
    en ambos casos el mensaje debe mencionar el límite.
  · La subida genérica deja un PDF de prueba diminuto en la carpeta `pruebas_bateria`:
    no hay endpoint para borrar blobs, así que ese resto es esperado.
  · Se prefiere una compañía que YA tenga logo para que la restauración sea exacta; si ninguna
    lo tiene, se restaura a cadena vacía (la compañía se veía sin logo de todos modos).
"""
import base64
import json
import sys
import urllib.error
import urllib.request

BASE_DEFECTO = 'http://localhost:8099'
ADMIN_DEFECTO = 'panxo.sms@gmail.com'
SIN_PERMISO = 'nadie@example.com'
TITULO = 'PRUEBA catálogo con archivos (se borra sola)'
SINOPSIS = 'Sinopsis de prueba de la batería automática (se borra sola).'
LOGO_PRUEBA = 'https://example.com/logo.png'
LIMITE_MB = 15   # tope real del hub: el archivo viaja en base64 y la plataforma corta en 32 MB
PDF_MINIMO = (b'%PDF-1.4\n'
              b'1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
              b'2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
              b'3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n'
              b'trailer<</Root 1 0 R>>\n%%EOF\n')

CONTADOR = {'ok': 0, 'fallos': 0}
FALLOS = []


class SinObraDePrueba(Exception):
    """Corta la batería cuando no hay obra de prueba (sin sumar un fallo extra)."""


def comprobar(titulo, condicion, detalle=''):
    """Imprime ✓ o ✗ y lleva la cuenta. Devuelve si pasó."""
    linea = titulo + (f' · {detalle}' if detalle else '')
    if condicion:
        CONTADOR['ok'] += 1
        print(f'  ✓ {linea}')
    else:
        CONTADOR['fallos'] += 1
        FALLOS.append(linea)
        print(f'  ✗ {linea}')
    return bool(condicion)


def pedir(base, ruta, metodo='GET', email=None, cuerpo=None, crudo=False, timeout=120):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(base + ruta, data=datos, method=metodo,
                                 headers={'Content-Type': 'application/json'})
    if email:
        req.add_header('x-atha-email', email)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            texto = r.read().decode('utf-8', 'replace')
            if crudo:
                return r.status, texto
            return r.status, (json.loads(texto) if texto.strip().startswith(('{', '[')) else texto)
    except urllib.error.HTTPError as e:
        texto = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def mensaje(d):
    """Texto del error, venga como venga."""
    if isinstance(d, dict):
        for clave in ('error', 'detail', 'mensaje', 'message'):
            if d.get(clave):
                return str(d[clave])
        return json.dumps(d, ensure_ascii=False)[:160]
    return str(d)[:160]


def data_url(mime, contenido):
    return f'data:{mime};base64,' + base64.b64encode(contenido).decode('ascii')


def leer_catalogo(base, email):
    _, d = pedir(base, '/api/v1/crm/portfolio/projects', 'GET', email)
    if isinstance(d, dict):
        for clave in ('projects', 'data'):
            if isinstance(d.get(clave), list):
                return d[clave]
    return []


def obra_en_catalogo(base, email, obra_id):
    return next((o for o in leer_catalogo(base, email) if str(o.get('id')) == str(obra_id)), {})


def leer_archivos(base, email, obra_id):
    _, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/files', 'GET', email)
    if isinstance(d, dict) and isinstance(d.get('files'), list):
        return d['files']
    return []


def leer_companias(base, email):
    _, d = pedir(base, '/api/v1/crm/companies', 'GET', email)
    return d.get('companies', []) if isinstance(d, dict) and isinstance(d.get('companies'), list) else []


def main():
    base = BASE_DEFECTO
    admin = ADMIN_DEFECTO
    for a in sys.argv[1:]:
        if a.startswith('--base='):
            base = a.split('=', 1)[1].rstrip('/')
        elif a.startswith('--admin='):
            admin = a.split('=', 1)[1].strip()
    print(f'base:  {base}')
    print(f'admin: {admin}\n')

    estado = {'obra': None, 'archivos': [], 'empresa': None, 'logo_previo': None, 'logo_restaurado': False}

    def limpiar():
        """Red de seguridad: se ejecuta siempre, aunque algo reviente a mitad de camino."""
        if estado['empresa'] and not estado['logo_restaurado']:
            try:
                pedir(base, f"/api/v1/crm/companies/{estado['empresa']}", 'PUT', admin,
                      {'logoUrl': estado['logo_previo'] or ''})
                estado['logo_restaurado'] = True
            except Exception:
                pass
        for fid in list(estado['archivos']):
            try:
                pedir(base, f'/api/v1/crm/files/{fid}', 'DELETE', admin, {'email': admin})
                estado['archivos'].remove(fid)
            except Exception:
                pass
        if estado['obra']:
            try:
                pedir(base, f"/api/v1/crm/portfolio/projects/{estado['obra']}", 'DELETE', admin,
                      {'email': admin})
                estado['obra'] = None
            except Exception:
                pass

    try:
        # ------------------------------------------------------------------
        # 0 · la obra de prueba (propia, para no tocar ninguna real)
        # ------------------------------------------------------------------
        print('0 · obra de prueba')
        est, d = pedir(base, '/api/v1/crm/portfolio/projects', 'POST', admin, {
            'title': TITULO, 'synopsis': SINOPSIS, 'descripcion': SINOPSIS,
            'discipline': 'Teatro', 'category': 'teatro', 'status': 'En formulación',
        })
        obra_id = (d.get('id') or d.get('project', {}).get('id')) if isinstance(d, dict) else None
        if obra_id:
            estado['obra'] = obra_id
        comprobar('POST de una obra de prueba responde 200 con id', est == 200 and bool(obra_id),
                  f'HTTP {est} · id={obra_id}')
        if not obra_id:
            print('  (sin obra de prueba no se pueden correr los grupos 1 a 4)')
            raise SinObraDePrueba()

        # ------------------------------------------------------------------
        # 1 · ficha de la obra
        # ------------------------------------------------------------------
        print('\nGRUPO 1 · ficha de la obra')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/ficha', 'PUT', admin,
                       {'duration': '80 min'})
        proj = d.get('project', {}) if isinstance(d, dict) else {}
        base_resp = proj if isinstance(proj, dict) else {}
        comprobar('PUT parcial {duration:"80 min"} responde 200', est == 200, f'HTTP {est} · {mensaje(d)}')

        obra = obra_en_catalogo(base, admin, obra_id)
        # La duración puede venir en la respuesta del PUT o en el catálogo: sirve cualquiera.
        dur = base_resp.get('duration', d.get('duration') if isinstance(d, dict) else None)
        if dur is None:
            dur = obra.get('duration')
        comprobar('la duración quedó guardada', str(dur) == '80 min', f'duration={dur!r}')

        comprobar('la edición parcial NO pisa el título', obra.get('title') == TITULO,
                  f'título ahora: {obra.get("title")!r}')
        sinopsis_leida = obra.get('synopsis') if obra.get('synopsis') else obra.get('description')
        comprobar('la edición parcial NO pisa la sinopsis', (sinopsis_leida or '') == SINOPSIS,
                  f'sinopsis ahora: {(sinopsis_leida or "")[:40]!r}')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/ficha', 'PUT', admin,
                       {'title': ''})
        comprobar('PUT con título vacío responde 400', est == 400, f'HTTP {est} · {mensaje(d)}')

        est, d = pedir(base, '/api/v1/crm/portfolio/projects/NO-EXISTE-BATERIA/ficha', 'PUT', admin,
                       {'duration': '80 min'})
        comprobar('PUT sobre una obra inexistente responde 404', est == 404, f'HTTP {est} · {mensaje(d)}')

        obra = obra_en_catalogo(base, admin, obra_id)
        comprobar('el catálogo trae `ficha`', 'ficha' in obra, f'ficha={obra.get("ficha")!r}')
        comprobar('el catálogo trae `logo_url`', 'logo_url' in obra, f'logo_url={obra.get("logo_url")!r}')
        comprobar('el catálogo trae `files` (lista)',
                  isinstance(obra.get('files'), list),
                  f'files={obra.get("files")!r}')
        comprobar('el catálogo trae `dossier_url`', 'dossier_url' in obra,
                  f'dossier_url={obra.get("dossier_url")!r}')

        # ------------------------------------------------------------------
        # 2 · archivos de la obra
        # ------------------------------------------------------------------
        print('\nGRUPO 2 · archivos de la obra')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/files', 'POST', admin, {
            'tipo': 'dossier', 'nombre': 'Dossier prueba.pdf', 'url': 'https://example.com/x.pdf',
        })
        arch = d.get('file', {}) if isinstance(d, dict) else {}
        fid = (arch.get('id') if isinstance(arch, dict) else None) or (d.get('id') if isinstance(d, dict) else None)
        if fid:
            estado['archivos'].append(fid)
        comprobar('POST de un archivo tipo dossier responde 200', est == 200 and bool(fid),
                  f'HTTP {est} · id={fid} · {mensaje(d)}')

        mio = next((a for a in leer_archivos(base, admin, obra_id) if str(a.get('id')) == str(fid)), None)
        comprobar('el archivo aparece en GET …/files', mio is not None, f'id buscado={fid}')
        visto = mio or {}
        comprobar('el archivo trae tipo, nombre y url',
                  mio is not None and visto.get('tipo') == 'dossier'
                  and visto.get('nombre') == 'Dossier prueba.pdf'
                  and visto.get('url') == 'https://example.com/x.pdf',
                  f'tipo={visto.get("tipo")!r} nombre={visto.get("nombre")!r} url={visto.get("url")!r}')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/files', 'POST', admin,
                       {'tipo': 'exe', 'nombre': 'virus.exe', 'url': 'https://example.com/v.exe'})
        comprobar("POST con tipo inválido ('exe') responde 400", est == 400, f'HTTP {est} · {mensaje(d)}')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/files', 'POST', admin,
                       {'tipo': 'dossier', 'url': 'https://example.com/sin-nombre.pdf'})
        comprobar('POST sin nombre responde 400', est == 400, f'HTTP {est} · {mensaje(d)}')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/files', 'POST', admin,
                       {'tipo': 'dossier', 'nombre': 'sin url.pdf'})
        comprobar('POST sin url responde 400', est == 400, f'HTTP {est} · {mensaje(d)}')

        est, d = pedir(base, f'/api/v1/crm/files/{fid}', 'DELETE', admin, {'email': admin})
        comprobar('DELETE del archivo responde 200', est == 200, f'HTTP {est} · {mensaje(d)}')
        if est == 200 and fid in estado['archivos']:
            estado['archivos'].remove(fid)

        sigue = any(str(a.get('id')) == str(fid) for a in leer_archivos(base, admin, obra_id))
        comprobar('el archivo ya no aparece en GET …/files', not sigue, f'sigue apareciendo: {sigue}')

        est, d = pedir(base, f'/api/v1/crm/files/{fid}', 'DELETE', admin, {'email': admin})
        comprobar('DELETE repetido responde 404', est == 404, f'HTTP {est} · {mensaje(d)}')

        # ------------------------------------------------------------------
        # 3 · subida genérica
        # ------------------------------------------------------------------
        print('\nGRUPO 3 · subida genérica')

        est, d = pedir(base, '/api/v1/crm/archivo', 'POST', admin, {
            'nombre': 'PDF de prueba.pdf',
            'dataUrl': data_url('application/pdf', PDF_MINIMO),
            'carpeta': 'pruebas_bateria',
        })
        sub = d if isinstance(d, dict) else {}
        comprobar('POST /api/v1/crm/archivo con un PDF chico responde 200', est == 200,
                  f'HTTP {est} · {mensaje(d)}')
        comprobar('devuelve la url del archivo subido', bool(sub.get('url')), f'url={sub.get("url")!r}')
        comprobar('devuelve los bytes', isinstance(sub.get('bytes'), int) and sub.get('bytes') > 0,
                  f'bytes={sub.get("bytes")!r}')

        est, d = pedir(base, '/api/v1/crm/archivo', 'POST', admin, {
            'nombre': 'pagina.html',
            'dataUrl': data_url('text/html', b'<h1>no permitido</h1>'),
        })
        comprobar('un mime no permitido (text/html) responde 400', est == 400,
                  f'HTTP {est} · {mensaje(d)}')

        grande = b'%PDF-1.4\n' + b'A' * ((LIMITE_MB + 1) * 1024 * 1024)
        est, d = pedir(base, '/api/v1/crm/archivo', 'POST', admin, {
            'nombre': 'enorme.pdf', 'dataUrl': data_url('application/pdf', grande),
        }, timeout=300)
        msj = mensaje(d).lower()
        comprobar(f'un archivo de más de {LIMITE_MB} MB responde 400 y el mensaje trae el límite',
                  est in (400, 413) and ('25' in msj or 'mb' in msj),
                  f'HTTP {est} · {mensaje(d)}')
        del grande

        # ------------------------------------------------------------------
        # 4 · permisos
        # ------------------------------------------------------------------
        print('\nGRUPO 4 · permisos')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/ficha', 'PUT', SIN_PERMISO,
                       {'duration': '90 min'})
        comprobar('PUT ficha con un correo sin permiso responde 403', est == 403,
                  f'HTTP {est} · {mensaje(d)}')

        est, d = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}/files', 'POST', SIN_PERMISO,
                       {'tipo': 'otro', 'nombre': 'sin-permiso.pdf', 'url': 'https://example.com/s.pdf'})
        comprobar('POST …/files con un correo sin permiso responde 403', est == 403,
                  f'HTTP {est} · {mensaje(d)}')

        est, d = pedir(base, '/api/v1/crm/archivo', 'POST', SIN_PERMISO,
                       {'nombre': 'sin-permiso.pdf', 'dataUrl': data_url('application/pdf', PDF_MINIMO)})
        comprobar('POST /api/v1/crm/archivo con un correo sin permiso responde 403', est == 403,
                  f'HTTP {est} · {mensaje(d)}')

        # ------------------------------------------------------------------
        # 5 · compañías (logo)
        # ------------------------------------------------------------------
        print('\nGRUPO 5 · compañías')

        empresas = leer_companias(base, admin)
        elegida = next((c for c in empresas if c.get('logoUrl')), empresas[0] if empresas else None)
        if not elegida:
            comprobar('hay una compañía para probar el logo', False,
                      'GET /api/v1/crm/companies no devolvió compañías')
        else:
            estado['empresa'] = elegida['id']
            estado['logo_previo'] = elegida.get('logoUrl') or ''
            est, d = pedir(base, f"/api/v1/crm/companies/{elegida['id']}", 'PUT', admin,
                           {'logoUrl': LOGO_PRUEBA})
            comprobar('PUT del logo de la compañía responde 200', est == 200,
                      f'HTTP {est} · compañía={elegida.get("name")!r} · {mensaje(d)}')

            ahora = next((c for c in leer_companias(base, admin)
                          if str(c.get('id')) == str(elegida['id'])), {})
            valor = ahora.get('logoUrl', ahora.get('logo_url'))
            comprobar('al releer la compañía, el logo quedó guardado', valor == LOGO_PRUEBA,
                      f'logo leído={valor!r}')

            est, d = pedir(base, f"/api/v1/crm/companies/{elegida['id']}", 'PUT', admin,
                           {'logoUrl': estado['logo_previo']})
            estado['logo_restaurado'] = est == 200
            comprobar('el logo vuelve a como estaba antes', est == 200,
                      f'logo restaurado a {estado["logo_previo"]!r} · HTTP {est}')

        # ------------------------------------------------------------------
        # 6 · limpieza comprobada
        # ------------------------------------------------------------------
        print('\nLIMPIEZA')

        for fid in list(estado['archivos']):
            est, _ = pedir(base, f'/api/v1/crm/files/{fid}', 'DELETE', admin, {'email': admin})
            if est == 200:
                estado['archivos'].remove(fid)
        comprobar('no quedan archivos de prueba en la obra', not estado['archivos'],
                  f'quedan {estado["archivos"]}')

        est, _ = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}', 'DELETE', admin, {'email': admin})
        est2, _ = pedir(base, f'/api/v1/crm/portfolio/projects/{obra_id}', 'DELETE', admin, {'email': admin})
        comprobar('la obra de prueba se borró (y al repetir da 404)', est == 200 and est2 == 404,
                  f'HTTP {est} y al repetir {est2}')
        if est == 200:
            estado['obra'] = None

    except SinObraDePrueba:
        pass  # ya quedó anotado el fallo del paso 0; sólo hay que limpiar
    except Exception as e:  # red de seguridad: el `finally` limpia igual
        comprobar('la batería llegó al final sin reventar', False, f'{type(e).__name__}: {e}')
    finally:
        limpiar()

    print()
    if FALLOS:
        print('FALLAS:')
        for f in FALLOS:
            print(' -', f)
    print(f'RESULTADO: {CONTADOR["ok"]} ok · {CONTADOR["fallos"]} fallos')
    raise SystemExit(1 if CONTADOR['fallos'] else 0)


if __name__ == '__main__':
    main()
