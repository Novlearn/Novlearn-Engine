"""Real Apache routing on Linux; no VPS or credentials involved."""
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
import unittest

from test_apache_staging import repair, STAGE


@unittest.skipUnless(os.environ.get('APACHE_INTEGRATION') == '1', 'requires Linux Apache')
class ApacheIntegration(unittest.TestCase):
    def test_routing_with_real_apache(self):
        import pwd
        import grp

        class Backend(BaseHTTPRequestHandler):
            def do_POST(self):
                self.rfile.read(int(self.headers.get('Content-Length', '0')))
                authorized = self.headers.get('Authorization') == 'Bearer test-only'
                self.send_response(200 if authorized else 401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}' if authorized else b'{"error":"unauthorized"}')

            def log_message(self, *_):
                pass

        backend = ThreadingHTTPServer(('127.0.0.1', 0), Backend)
        thread = threading.Thread(target=backend.serve_forever, daemon=True)
        thread.start()
        try:
            for redirects in [' Redirect 307 / /accueil\n', ' RedirectMatch 307 ^/.*$ /accueil\n',
                              ' RewriteEngine On\n RewriteCond %{HTTP_HOST} =staging.novlearn.fr [OR]\n RewriteCond %{HTTP_HOST} =other\n RewriteRule ^ /accueil [R=307,L]\n', '']:
                with self.subTest(redirects=redirects), tempfile.TemporaryDirectory() as tmp:
                    with socket.socket() as sock:
                        sock.bind(('127.0.0.1', 0))
                        port = sock.getsockname()[1]
                    config = Path(tmp)/'apache.conf'
                    modules = ['mpm_event', 'authz_core', 'proxy', 'proxy_http', 'rewrite', 'alias']
                    preamble = f'ServerRoot "{tmp}"\nServerName localhost\nListen 127.0.0.1:{port}\nPidFile "{tmp}/apache.pid"\nErrorLog "{tmp}/error.log"\n'
                    preamble += ''.join(f'LoadModule {m}_module /usr/lib/apache2/modules/mod_{m}.so\n' for m in modules)
                    preamble += f'User {pwd.getpwuid(os.getuid()).pw_name}\nGroup {grp.getgrgid(os.getgid()).gr_name}\n'
                    source = STAGE.format(routing=redirects).replace('http://127.0.0.1:3001/', f'http://127.0.0.1:{backend.server_port}/')
                    vhost = repair.patch(source, backend.server_port).replace('*:443', f'*:{port}').replace(' SSLEngine on\n', '')
                    config.write_text(preamble + vhost)
                    subprocess.run(['apache2', '-t', '-f', str(config)], check=True, capture_output=True)
                    apache = subprocess.Popen(['apache2', '-X', '-f', str(config)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    try:
                        for _ in range(100):
                            if apache.poll() is not None:
                                self.fail((Path(tmp)/'error.log').read_text())
                            try:
                                with socket.create_connection(('127.0.0.1', port), timeout=.1):
                                    break
                            except OSError:
                                time.sleep(.05)
                        for path in ['/run', '/run?probe=1']:
                            conn = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
                            conn.request('POST', path, '{}', {'Host': repair.DOMAIN, 'Content-Type': 'application/json'})
                            response = conn.getresponse()
                            self.assertEqual(401, response.status)
                            self.assertIsNone(response.getheader('Location'))
                            self.assertEqual(b'{"error":"unauthorized"}', response.read())
                            conn.close()
                        conn = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
                        conn.request('POST', '/run', '{}', {'Host': repair.DOMAIN, 'Authorization': 'Bearer test-only'})
                        response = conn.getresponse()
                        self.assertEqual(200, response.status)
                        response.read()
                        conn.close()
                        if redirects:
                            for path in ['/runner', '/run/', '/healthz', '/']:
                                conn = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
                                conn.request('POST', path, '{}', {'Host': repair.DOMAIN})
                                response = conn.getresponse()
                                self.assertEqual(307, response.status)
                                self.assertIn('/accueil', response.getheader('Location'))
                                response.read()
                                conn.close()
                    finally:
                        apache.terminate()
                        apache.wait(timeout=10)
        finally:
            backend.shutdown()
            backend.server_close()
            thread.join()
