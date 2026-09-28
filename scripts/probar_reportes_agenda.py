#!/usr/bin/env python3
"""
Batería de pruebas del buzón del piloto (/reportes) y de la agenda del CRM (/agenda).
Se corre contra el hub LOCAL, después contra la URL del tag y al final contra la pública.

Uso:
    python3 scripts/probar_reportes_agenda.py --base=http://localhost:8099
    python3 scripts/probar_reportes_agenda.py --base=https://<url-del-tag>
    python3 scripts/probar_reportes_agenda.py --base=https://… --correo   # además prueba el correo

Qué comprueba (y limpia TODO lo que crea):
  1. Las dos páginas responden 200 y traen su contenido.
  2. Un correo sin permiso: 403 al atender un reporte y al publicar una función.
  3. Buzón: crear un reporte de prueba → aparece en el listado → PATCH a visto → nota → DELETE.
  4. Correo: responder un reporte (sólo con --correo) apunta al buzón del agente, no a un tester.
  5. Agenda: crear una función en borrador (con fecha fin y SIN hora) → el público NO la ve →
     publicarla → el público la ve con `source` y `date_end` → PATCH parcial → DELETE.
"""
import json
import sys
import urllib.error
import urllib.request

ADMIN = 'panxo.sms@gmail.com'
SIN_PERMISO = 'pipe.naranjo33@gmail.com'
BUZON_AGENTE = 'fase.athamu@gmail.com'


def pedir(base, ruta, metodo='GET', email=None, cuerpo=None, crudo=False):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(base + ruta, data=datos, method=metodo,
                                 headers={'Content-Type': 'application/json'})
    if email:
        req.add_header('x-atha-email', email)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
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


def main():
    base = 'http://localhost:8099'
    con_correo = '--correo' in sys.argv
    for a in sys.argv[1:]:
        if a.startswith('--base='):
            base = a.split('=', 1)[1].rstrip('/')
    print(f'base: {base}\n')
    fallos = []
    reporte_id = None
    evento_id = None

    # 1 · las páginas
    for ruta, aguja in (('/reportes', 'Buzón del piloto'), ('/agenda', 'Agenda cultural')):
        est, html = pedir(base, ruta, crudo=True)
        ok = est == 200 and isinstance(html, str) and aguja in html
        print(f'1 · GET {ruta} → {est} · {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append(f'la página {ruta} no salió como se espera')

    # 2 · permisos
    est, d = pedir(base, '/api/v1/crm/piloto/reportes', 'GET', SIN_PERMISO)
    est2, d2 = pedir(base, '/api/v1/crm/radar/eventos', 'POST', SIN_PERMISO,
                     {'title': 'Función de alguien sin permiso', 'date': '2026-12-01'})
    ok = est == 403 and est2 == 403
    print(f'2 · sin permiso → listado de reportes {est}, publicar función {est2} · {"OK" if ok else "FALLA"}')
    if not ok:
        fallos.append('una cuenta sin permiso pudo entrar al buzón o publicar una función')

    # 3 · buzón del piloto
    est, d = pedir(base, '/api/v1/crm/piloto/reportes', 'POST', ADMIN, {
        'texto': 'Reporte de prueba de la batería (se borra sola)', 'categoria': 'prueba',
        'pantalla': 'inicio', 'plataforma': 'bateria', 'version': 'test', 'email': BUZON_AGENTE,
        'nombre': 'Batería de pruebas',
    })
    reporte_id = d.get('id') if isinstance(d, dict) else None
    ok = est == 200 and reporte_id
    print(f'3 · POST reporte → {est} id={reporte_id} · {"OK" if ok else "FALLA"}')
    if not ok:
        fallos.append(f'no se pudo crear el reporte de prueba: {d}')

    if reporte_id:
        est, d = pedir(base, '/api/v1/crm/piloto/reportes', 'GET', ADMIN)
        listado = d.get('reportes', []) if isinstance(d, dict) else []
        encontrado = next((r for r in listado if r['id'] == reporte_id), None)
        campos_ok = encontrado is not None and 'nota' in encontrado and 'atendido_por' in encontrado
        print(f'   · aparece en el listado con nota/atendido_por: {"OK" if campos_ok else "FALLA"}')
        if not campos_ok:
            fallos.append('el reporte de prueba no aparece con las columnas nuevas')

        est, d = pedir(base, f'/api/v1/crm/piloto/reportes/{reporte_id}', 'PATCH', ADMIN, {'estado': 'visto'})
        est2, d2 = pedir(base, f'/api/v1/crm/piloto/reportes/{reporte_id}', 'PATCH', ADMIN, {'nota': 'nota de prueba'})
        listado = pedir(base, '/api/v1/crm/piloto/reportes', 'GET', ADMIN)[1].get('reportes', [])
        r = next((x for x in listado if x['id'] == reporte_id), {})
        ok = est == 200 and est2 == 200 and r.get('estado') == 'visto' and r.get('nota') == 'nota de prueba' and r.get('atendido_por')
        print(f'   · marcar visto + nota → {"OK" if ok else "FALLA"} ({r.get("estado")} / {r.get("nota")} / {r.get("atendido_por")})')
        if not ok:
            fallos.append('el PATCH del reporte no guardó estado/nota/atendido_por')

        if con_correo:
            est, d = pedir(base, f'/api/v1/crm/piloto/reportes/{reporte_id}/responder', 'POST', ADMIN,
                           {'mensaje': 'Prueba automática del buzón del piloto (batería).', 'para': BUZON_AGENTE})
            ok = est == 200
            print(f'4 · responder por correo → {est} {"" if ok else d} · {"OK" if ok else "FALLA"}')
            if not ok:
                fallos.append(f'no se pudo responder el reporte: {d}')

        est, d = pedir(base, f'/api/v1/crm/piloto/reportes/{reporte_id}', 'DELETE', ADMIN, {'email': ADMIN})
        est2, _ = pedir(base, f'/api/v1/crm/piloto/reportes/{reporte_id}', 'DELETE', ADMIN, {'email': ADMIN})
        ok = est == 200 and est2 == 404
        print(f'   · borrar el reporte de prueba → {est} y al repetir {est2} · {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append('no se pudo borrar el reporte de prueba')

    # 5 · agenda
    est, d = pedir(base, '/api/v1/crm/radar/eventos', 'POST', ADMIN, {
        'title': 'PRUEBA agenda (se borra sola)', 'type': 'Exposición', 'date': '2026-11-02',
        'date_end': '2026-11-20', 'venue': 'Lugar de prueba', 'city': 'Rancagua',
        'lat': -34.1708, 'lng': -70.7444, 'is_public': False, 'source': 'atha',
    })
    evento_id = d.get('id') if isinstance(d, dict) else None
    est2, d2 = pedir(base, '/api/v1/crm/radar/eventos?desde=2026-11-01&incluir_borradores=1', 'GET', ADMIN)
    est3, d3 = pedir(base, '/api/v1/crm/radar/eventos?desde=2026-11-01', 'GET')
    privado_en_admin = any(e['id'] == evento_id for e in d2.get('eventos', [])) if isinstance(d2, dict) else False
    publico_lo_ve = any(e['id'] == evento_id for e in d3.get('eventos', [])) if isinstance(d3, dict) else False
    ok = est == 200 and evento_id and privado_en_admin and not publico_lo_ve
    print(f'5 · crear muestra en borrador → {est} · admin la ve: {privado_en_admin} · público NO: {not publico_lo_ve} · {"OK" if ok else "FALLA"}')
    if not ok:
        fallos.append('el borrador de la agenda no se comporta como debe')

    if evento_id:
        est, d = pedir(base, f'/api/v1/crm/radar/eventos/{evento_id}', 'PATCH', ADMIN, {'is_public': True})
        est2, d2 = pedir(base, '/api/v1/crm/radar/eventos?desde=2026-11-01', 'GET')
        ev = next((e for e in d2.get('eventos', []) if e['id'] == evento_id), {}) if isinstance(d2, dict) else {}
        ok = est == 200 and ev.get('date_end') and ev.get('source') == 'atha' and ev.get('time_start') in (None, '')
        print(f'   · publicar → público la ve con date_end={str(ev.get("date_end"))[:10]} source={ev.get("source")} hora={ev.get("time_start")} · {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append('la función publicada no trae date_end/source como se espera')

        # la edición parcial no debe vaciar el resto
        pedir(base, f'/api/v1/crm/radar/eventos/{evento_id}', 'PATCH', ADMIN, {'venue': 'Otro lugar cualquiera'})
        _, d3 = pedir(base, '/api/v1/crm/radar/eventos?desde=2026-11-01', 'GET')
        ev2 = next((e for e in d3.get('eventos', []) if e['id'] == evento_id), {})
        ok = ev2.get('venue') == 'Otro lugar cualquiera' and ev2.get('title') == 'PRUEBA agenda (se borra sola)' and ev2.get('date_end')
        print(f'   · PATCH parcial conserva el resto: {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append('el PATCH parcial de la agenda vació datos')

        est, d = pedir(base, f'/api/v1/crm/radar/eventos/{evento_id}', 'DELETE', ADMIN, {'email': ADMIN})
        est2, d2 = pedir(base, '/api/v1/crm/radar/eventos?desde=2026-11-01&incluir_borradores=1', 'GET', ADMIN)
        sigue = any(e['id'] == evento_id for e in d2.get('eventos', [])) if isinstance(d2, dict) else False
        ok = est == 200 and not sigue
        print(f'   · borrar la función de prueba → {est} · ya no está: {not sigue} · {"OK" if ok else "FALLA"}')
        if not ok:
            fallos.append('no se pudo borrar la función de prueba')

    print()
    if fallos:
        print('FALLAS:')
        for f in fallos:
            print(' -', f)
        raise SystemExit(1)
    print('TODO OK')


if __name__ == '__main__':
    main()
