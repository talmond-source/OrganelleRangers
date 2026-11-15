import sys, base64, os
# Builds the single-file game page from the sources in this folder.
#   python3 build.py         -> ../index.html (the live site)
#   python3 build.py local   -> ../test.html  (same, without the install-as-app bits, for testing)
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
args = sys.argv[1:]; LOCAL = 'local' in args; ART = 'artifact' in args
F = 'fonts/'
def face(fam, path, w=400):
    b = base64.b64encode(open(F + path, 'rb').read()).decode()
    return "@font-face{font-family:%s;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, w, b)
fonts = "\n".join([face('P2', 'press-start-2p-latin-400-normal.woff2'), face('Bangers', 'bangers-latin-400-normal.woff2'),
  face('BC', 'barlow-condensed-latin-400-normal.woff2', 400), face('BC', 'barlow-condensed-latin-700-normal.woff2', 700)])
head = open('head.html').read().replace('/*FONTS*/', fonts)
PWA = '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">\n<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">\n<script>if ("serviceWorker" in navigator && location.protocol === "https:") addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));</script>'
head = head.replace('<!--PWA-->', '' if (ART or LOCAL) else PWA)
three = '<script>' + open('vendor.min.js').read().replace('</script','<\\/script') + '</script>\n<script>' + open('data/assets.js').read() + '</script>'
detect = 'var Q_ = new URLSearchParams(location.search);\nvar LITE = Q_.has("hq") ? false : Q_.has("lite") ? true : (/CrOS|Android|iPhone|iPad|Mobi/.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4);\n'
js = detect + "\n".join(open(f).read() for f in ['engine.js', 'models.js', 'rig.js', 'chars.js', 'suit.js', 'bodymesh.js', 'rmodel.js', 'ranger3d.js', 'extras.js', 'assets.js', 'fx.js', 'view.js', 'audio.js', 'stages.js', 'fight.js', 'kits.js', 'kits2.js', 'ults.js', 'megas.js', 'intro.js', 'app.js'])
js += '\nAPP.init();\n'
def esc(s):
    out = []
    for ch in s:
        o = ord(ch)
        if o < 128: out.append(ch)
        elif o < 0x10000: out.append('\\u%04x' % o)
        else: o -= 0x10000; out.append('\\u%04x\\u%04x' % (0xD800 + (o >> 10), 0xDC00 + (o & 0x3FF)))
    return ''.join(out)
page = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n' + head + '</head><body>\n' + open('body.html').read() + '\n' + three + '\n<script>\n' + esc(js) + '\n</script>\n</body></html>\n'
if ART: page = head + open('body.html').read() + '\n' + three + '\n<script>\n' + esc(js) + '\n</script>\n'
open('../test.html' if LOCAL else '../preview.html' if ART else '../index.html', 'w').write(page)
print(len(page))
