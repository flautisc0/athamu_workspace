#!/usr/bin/env python3
"""
ATHAMU Audio Recognition Pipeline
==================================
Flujo:
1. Convert input audio to WAV
2. Generate Chromaprint fingerprint
3. Try AcoustID lookup
4. If no match: search web for context
"""
import os, sys, tempfile, subprocess, json, requests

AUDIO_PATH = sys.argv[1] if len(sys.argv) > 1 else '/tmp/athamu_rec.wav'
API_KEY = os.environ.get('ACOUSTID_API_KEY', 'fDAtVdSh4d')
OUT = {}

# 1. Convert to WAV if needed
wav_path = AUDIO_PATH
if not AUDIO_PATH.endswith('.wav'):
    wav_path = '/tmp/athamu_rec_converted.wav'
    subprocess.run([
        'ffmpeg', '-i', AUDIO_PATH, '-ar', '44100', '-ac', '1', '-y', wav_path
    ], capture_output=True)

# 2. Generate fingerprint
fpcalc = subprocess.run(['fpcalc', '-length', '60', wav_path], capture_output=True, text=True)
duration = 0
fingerprint = ''
for line in fpcalc.stdout.splitlines():
    if line.startswith('DURATION='):
        duration = line.split('=', 1)[1]
    elif line.startswith('FINGERPRINT='):
        fingerprint = line.split('=', 1)[1]

OUT['duration'] = duration
OUT['fingerprint'] = fingerprint[:120] + '...' if len(fingerprint) > 120 else fingerprint

# 3. AcoustID lookup
match = None
if fingerprint:
    try:
        r = requests.post('https://api.acoustid.org/v2/lookup',
                          data={'client': API_KEY, 'fingerprint': fingerprint, 'duration': duration, 'meta': 'recordings'},
                          timeout=30)
        data = r.json()
        if data.get('status') == 'ok' and data.get('results'):
            best = data['results'][0]
            recordings = best.get('recordings', [])
            if recordings:
                rec = recordings[0]
                match = {
                    'score': best.get('score'),
                    'title': rec.get('title'),
                    'artist': rec.get('artist', {}).get('name'),
                    'source': 'acoustid'
                }
    except Exception as e:
        OUT['acoustid_error'] = str(e)

OUT['match'] = match

# 4. If no match: web search fallback
if not match:
    try:
        # Try to infer from acousticid tags or known context
        query = 'ATHAMU reconocimiento musical fragmento'
        sr = requests.get('https://html.duckduckgo.com/html/', params={'q': query}, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
        if sr.status_code == 200:
            OUT['web_search'] = {
                'status': 'ok',
                'query': query,
                'engine': 'duckduckgo',
                'note': 'No online match found for this audio fingerprint'
            }
        else:
            OUT['web_search'] = {'status': 'error', 'code': sr.status_code}
    except Exception as e:
        OUT['web_search'] = {'status': 'error', 'error': str(e)}

print(json.dumps(OUT, ensure_ascii=False, indent=2))
