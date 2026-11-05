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
import json

from test_apache_staging import repair, STAGE, PROD
from apache_fixtures import CERTBOT_CONFIG


@unittest.skipUnless(os.environ.get('APACHE_INTEGRATION') == '1', 'requires Linux Apache')
class ApacheIntegration(unittest.TestCase):
    def test_routing_with_real_apache(self):
        self.exercise_routing(real_engine=False)

    @unittest.skipUnless(os.environ.get('REAL_ENGINE_PORT'), 'requires the published Engine container')
    def test_routing_with_published_engine(self):
        self.exercise_routing(real_engine=True)

    def exercise_routing(self, real_engine):
        import pwd
        import grp
        archive = os.environ.get('REAL_ENGINE_ARCHIVE_SHA256', 'a' * 64)
        token = os.environ.get('REAL_ENGINE_API_TOKEN', 'test-only')

        class Backend(BaseHTTPRequestHandler):
            def do_POST(self):
                data = self.rfile.read(int(self.headers.get('Content-Length', '0')))
                status, result = 200, {'ok': True, 'requestId': json.loads(data).get('requestId')}
                if self.path != '/run':
                    status, result = 404, {'error': 'not-found'}
                elif self.headers.get('Origin') is not None:
                    status, result = 403, {'error': 'browser-origin-not-allowed'}
                elif self.headers.get('Authorization') != 'Bearer ' + token:
                    status, result = 401, {'error': 'unauthorized'}
                elif self.headers.get('x-engine-archive-sha256') != archive:
                    status, result = 409, {'error': 'archive-mismatch'}
                elif self.headers.get('Content-Type') != 'application/json':
                    status, result = 415, {'error': 'unsupported-media-type'}
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('x-engine-archive-sha256', archive)
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

            def log_message(self, *_):
                pass

        class NextBackend(Backend):
            def do_POST(self):
                self.rfile.read(int(self.headers.get('Content-Length', '0')))
                self.send_response(307)
                self.send_header('Location', '/accueil')
                self.end_headers()

        backend = ThreadingHTTPServer(('127.0.0.1', 0), Backend)
        next_backend = ThreadingHTTPServer(('127.0.0.1', 0), NextBackend)
        thread = threading.Thread(target=backend.serve_forever, daemon=True)
        next_thread = threading.Thread(target=next_backend.serve_forever, daemon=True)
        thread.start()
        next_thread.start()
        engine_port = int(os.environ['REAL_ENGINE_PORT']) if real_engine else backend.server_port
        try:
            for redirects in [' Redirect 307 / /accueil\n', ' RedirectMatch 307 ^/.*$ /accueil\n',
                              ' RewriteEngine On\n RewriteCond %{HTTP_HOST} =staging.novlearn.fr [OR]\n RewriteCond %{HTTP_HOST} =other\n RewriteRule ^ /accueil [R=307,L]\n',
                              ' <IfModule mod_alias.c>\n  <Location "/">\n   Redirect 307 / /accueil\n  </Location>\n </IfModule>\n',
                              ' <IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteRule ^ /accueil [R=307,L]\n </IfModule>\n',
                              ' <If "true">\n  RedirectMatch 307 ^/.*$ /accueil\n </If>\n',
                              ' Redirect 307 \\\n / /accueil\n',
                              ' <Location "/">\n  Require all granted\n </Location>\n',
                              f' <Location "/">\n  ProxyPass http://127.0.0.1:{next_backend.server_port}/\n </Location>\n',
                              ' ProxyPass /run http://127.0.0.1:NEXT_PORT/run\n',
                              ' Include /etc/letsencrypt/options-ssl-apache.conf\n', '']:
                with self.subTest(redirects=redirects), tempfile.TemporaryDirectory() as tmp:
                    with socket.socket() as sock:
                        sock.bind(('127.0.0.1', 0))
                        port = sock.getsockname()[1]
                    config = Path(tmp)/'apache.conf'
                    modules = ['mpm_event', 'authz_core', 'proxy', 'proxy_http', 'rewrite', 'alias', 'socache_shmcb', 'ssl']
                    preamble = f'ServerRoot "{tmp}"\nServerName localhost\nListen 127.0.0.1:{port}\nPidFile "{tmp}/apache.pid"\nErrorLog "{tmp}/error.log"\n'
                    preamble += ''.join(f'LoadModule {m}_module /usr/lib/apache2/modules/mod_{m}.so\n' for m in modules)
                    preamble += f'User {pwd.getpwuid(os.getuid()).pw_name}\nGroup {grp.getgrgid(os.getgid()).gr_name}\n'
                    source = PROD + STAGE.format(routing=redirects)
                    source = source.replace(':3000/', f':{next_backend.server_port}/').replace(':3001/', f':{next_backend.server_port}/').replace(':NEXT_PORT/', f':{next_backend.server_port}/')
                    # Exercise Apache's file:line selection with inherited TLS.
                    line = PROD.count('\n') + 1
                    vhost = repair.patch(source, engine_port, vhost_line=line, include_reader=lambda _: CERTBOT_CONFIG).replace('*:443', f'*:{port}').replace(' SSLEngine on\n', '')
                    # Test the real Certbot directive syntax, including logging.
                    # TLS termination/certificate on the VPS is verified by apply.
                    ssl_include = Path(tmp)/'options-ssl-apache.conf'
                    ssl_include.write_text(CERTBOT_CONFIG.replace('SSLEngine on\n', ''))
                    vhost = vhost.replace('/etc/letsencrypt/options-ssl-apache.conf', str(ssl_include))
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
                        for path, expected in [('/run', 401), ('/run?probe=1', 404)]:
                            conn = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
                            conn.request('POST', path, '{}', {'Host': repair.DOMAIN, 'Content-Type': 'application/json'})
                            response = conn.getresponse()
                            self.assertEqual(expected, response.status)
                            self.assertIsNone(response.getheader('Location'))
                            self.assertEqual({'error': 'unauthorized' if expected == 401 else 'not-found'}, json.loads(response.read()))
                            if expected == 401:
                                self.assertEqual(archive, response.getheader('x-engine-archive-sha256'))
                            conn.close()
                        payload = json.dumps({'protocolVersion': 1, 'requestId': 'apache-ci', 'operation': 'parseMathInput',
                                              'payload': {'source': '1', 'context': {}, 'profile': 'scalar-latex-v1'}})
                        headers = {'Host': repair.DOMAIN, 'Authorization': 'Bearer ' + token,
                                   'Content-Type': 'application/json', 'x-engine-archive-sha256': archive}
                        for overrides, expected in [({}, 200), ({'Authorization': 'Bearer wrong'}, 401),
                                                    ({'x-engine-archive-sha256': 'b' * 64}, 409),
                                                    ({'Origin': 'https://admin.novlearn.fr'}, 403),
                                                    ({'Content-Type': 'text/plain'}, 415)]:
                            conn = http.client.HTTPConnection('127.0.0.1', port, timeout=10)
                            conn.request('POST', '/run', payload, headers | overrides)
                            response = conn.getresponse()
                            self.assertEqual(expected, response.status)
                            self.assertIsNone(response.getheader('Location'))
                            result = json.loads(response.read())
                            if expected == 200:
                                self.assertTrue(result['ok'])
                                self.assertEqual('apache-ci', result['requestId'])
                                self.assertEqual(archive, response.getheader('x-engine-archive-sha256'))
                            conn.close()
                        for host, paths in [(repair.DOMAIN, ['/runner', '/run/', '/healthz', '/']), ('novlearn.fr', ['/run', '/'])]:
                            for path in paths:
                                conn = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
                                conn.request('POST', path, '{}', {'Host': host})
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
            next_backend.shutdown()
            next_backend.server_close()
            next_thread.join()
