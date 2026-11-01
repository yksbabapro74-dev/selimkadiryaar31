#!/usr/bin/env python3
"""Yerel önizleme. GitHub Pages gibi, bilinmeyen adreste 404.html verir; gizli katlar böyle açılır.

    python3 tools/sunucu.py          # http://localhost:3131/
    python3 tools/sunucu.py 8000
"""
import http.server
import os
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Kapici(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=KOK, **k)

    def send_error(self, code, message=None, explain=None):
        yol = os.path.join(KOK, '404.html')
        if code != 404 or not os.path.exists(yol):
            return super().send_error(code, message, explain)
        govde = open(yol, 'rb').read()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(govde)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(govde)

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3131
    print(f'http://localhost:{port}/')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Kapici).serve_forever()
