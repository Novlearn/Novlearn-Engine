import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch as mock
from email.message import Message
from apache_fixtures import CERTBOT_CONFIG

spec = importlib.util.spec_from_file_location("repair", Path(__file__).resolve().parents[2] / "deploy/apache-staging.py")
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)

PROD = '<VirtualHost *:443>\n ServerName novlearn.fr\n SSLEngine on\n ProxyPass / http://127.0.0.1:3000/\n</VirtualHost>\n'
STAGE = '<VirtualHost *:443>\n ServerName staging.novlearn.fr\n SSLEngine on\n{routing} ProxyPass / http://127.0.0.1:3001/\n</VirtualHost>\n'


class Patching(unittest.TestCase):
    def test_certbot_include_accepts_logging_and_containers_without_modification(self):
        source = PROD + STAGE.format(routing=' Include /etc/letsencrypt/options-ssl-apache.conf\n')
        report = repair.inspect_include('/etc/letsencrypt/options-ssl-apache.conf', lambda _: CERTBOT_CONFIG)
        self.assertIn('logformat', report['directives'])
        self.assertFalse(repair.include_has_routing(report))
        result = repair.patch(source, 3151, include_reader=lambda _: CERTBOT_CONFIG)
        self.assertTrue(result.startswith(PROD))
        self.assertIn(' Include /etc/letsencrypt/options-ssl-apache.conf\n', result)
        self.assertEqual(result, repair.patch(result, 3151, include_reader=lambda _: CERTBOT_CONFIG))

    def test_shared_include_routing_is_reported_and_never_rewritten(self):
        source = STAGE.format(routing=' Include /etc/letsencrypt/options-ssl-apache.conf\n')
        content = CERTBOT_CONFIG + 'Redirect / /accueil\n'
        report = repair.inspect_include('/etc/letsencrypt/options-ssl-apache.conf', lambda _: content)
        self.assertTrue(repair.include_has_routing(report))
        self.assertEqual('redirect', report['routing'][0]['directive'])
        with self.assertRaisesRegex(ValueError, 'Routing inside shared include'):
            repair.patch(source, 3151, include_reader=lambda _: content)

    def test_inspection_does_not_depend_on_candidate_and_redacts_credentials(self):
        source = STAGE.format(routing=' SetEnv ENGINE_API_TOKEN private-value\n RewriteCond %{HTTP:Authorization} secret-value\n ProxyPass / http://user:private-pass@127.0.0.1:3001/\n')
        report = str(repair.diagnostic_block(source, 1))
        self.assertNotIn('private-value', report)
        self.assertNotIn('secret-value', report)
        self.assertNotIn('private-pass', report)
        self.assertIn('rewritecond', report)

    def test_comment_continuations_are_not_treated_as_active_rules(self):
        routing = '# comment continues \\\nRedirect / /do-not-enable\n'
        result = repair.patch(STAGE.format(routing=routing), 3151)
        self.assertIn(routing, result)
        self.assertNotIn('<If "%{REQUEST_URI}', result)

    def test_nested_blocks_preserve_bytes_and_guard_routing_at_each_depth(self):
        untouched = ' <Directory "/srv/novlearn public">\n  # Keep apostrophes: l\'application\n  Require all granted\n </Directory>\n'
        redirect = '   RedirectMatch 307 ^/.*$ /accueil\n'
        rewrite = '   RewriteRule ^ /accueil [R=307,L]\n'
        routing = (untouched + ' <IfModule mod_alias.c>\n  <Location "/">\n' + redirect +
                   '  </Location>\n </IfModule>\n <IfModule mod_rewrite.c>\n' + rewrite + ' </IfModule>\n')
        result = repair.patch(PROD + STAGE.format(routing=routing), 3151)
        self.assertTrue(result.startswith(PROD))
        self.assertIn(untouched, result)
        self.assertIn('<Location "/">\n    <If "%{REQUEST_URI} != \'/run\'">\n' + redirect, result)
        self.assertIn('RewriteCond %{REQUEST_URI} !^/run$\n' + rewrite, result)
        self.assertEqual(result, repair.patch(result, 3151))
        # Identity is checked even when a managed route is already present.
        with self.assertRaises(ValueError):
            repair.patch(result.replace(' ServerName staging.novlearn.fr', ' ServerAlias novlearn.fr\n ServerName staging.novlearn.fr'), 3151)

    def test_continued_directives_preserved_as_one_statement(self):
        redirect = ' Redirect 307 \\\n / /accueil\n'
        rewrite = ' RewriteRule ^ \\\n /accueil [R=307,L]\n'
        result = repair.patch(STAGE.format(routing=redirect + rewrite), 3151)
        self.assertIn('<If "%{REQUEST_URI} != \'/run\'">\n' + redirect + '    </If>', result)
        self.assertIn('RewriteCond %{REQUEST_URI} !^/run$\n' + rewrite, result)

    def test_unbalanced_or_unfinished_configuration_refused(self):
        for routing in [' <Location />\n', ' </Location>\n', ' <IfModule mod_alias.c>\n </Location>\n']:
            with self.subTest(routing=routing), self.assertRaises(ValueError):
                repair.patch(STAGE.format(routing=routing), 3151)
        with self.assertRaises(ValueError):
            list(repair.statements([' Redirect / \\\n']))

    def test_preexisting_run_proxy_kept_after_exact_reservation(self):
        old = ' ProxyPass /run http://127.0.0.1:3001/run\n'
        result = repair.patch(STAGE.format(routing=old), 3151)
        self.assertIn(old, result)
        self.assertLess(result.index('ProxyPassMatch ^/run$'), result.index(old))

    def test_apache_source_line_supports_inherited_tls_and_quoted_name(self):
        # Representative fixture; the VPS configuration itself was not exported.
        stage = STAGE.format(routing='').replace(' SSLEngine on\n', '').replace(
            'ServerName staging.novlearn.fr', 'ServerName "https://STAGING.novlearn.fr:443"')
        source = '<IfModule mod_ssl.c>\n' + PROD + stage + '</IfModule>\n'
        line = source[:source.index(stage)].count('\n') + 1
        result = repair.patch(source, 3151, vhost_line=line)
        self.assertIn(PROD, result)
        self.assertIn(repair.route(3151), result)
        self.assertEqual(result, repair.patch(result, 3151, vhost_line=line))

    def test_apache_line_never_selects_production_or_wrong_block(self):
        source = PROD + STAGE.format(routing='')
        for line in [1, 2, 999]:
            with self.subTest(line=line), self.assertRaises(ValueError):
                repair.patch(source, 3151, vhost_line=line)
        stage = STAGE.format(routing='').replace('SSLEngine on', 'SSLEngine off')
        with self.assertRaises(ValueError):
            repair.patch(stage, 3151, vhost_line=1)

    def test_vhost_diagnostic_excludes_private_configuration(self):
        source = STAGE.format(routing=' SetEnv ENGINE_API_TOKEN private-value\n SSLCertificateKeyFile /private/key.pem\n')
        summary = repair.vhost_summary(source)
        self.assertEqual([{'line': 1, 'names': [repair.DOMAIN], 'tls_directives': ['sslengine']}], summary)

    def test_exact_route_order_and_preserved_production(self):
        source = PROD + STAGE.format(routing='')
        result = repair.patch(source, 3151)
        self.assertTrue(result.startswith(PROD))
        self.assertIn('ProxyPassMatch ^/run$ http://127.0.0.1:3151/run', result)
        self.assertLess(result.index('ProxyPassMatch'), result.index('ProxyPass / http://127.0.0.1:3001/'))
        self.assertEqual(result, repair.patch(result, 3151))
        with self.assertRaises(ValueError):
            repair.patch(result, 3153)

    def test_redirects_guarded_and_rewrite_conditions_preserved(self):
        routing = ' Redirect / /accueil\n RedirectMatch 307 ^/.*$ /accueil\n RewriteCond %{HTTP_HOST} =example [OR]\n RewriteCond %{HTTP_HOST} =other\n RewriteRule ^ /accueil [R=307,L]\n'
        result = repair.patch(STAGE.format(routing=routing), 3151)
        self.assertEqual(2, result.count('<If "%{REQUEST_URI} != \'/run\'">'))
        self.assertIn(' RewriteCond %{HTTP_HOST} =other\n    RewriteCond %{REQUEST_URI} !^/run$\n RewriteRule', result)

    def test_ambiguous_or_shared_or_unhandled_configuration_refused(self):
        for source in [PROD, STAGE.format(routing='') * 2,
                       STAGE.format(routing=' ServerAlias novlearn.fr\n'),
                       STAGE.format(routing=' Include /etc/other.conf\n'),
                       STAGE.format(routing=' <Location />\n </Directory>\n')]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                repair.patch(source, 3151)

    def test_invalid_ports_refused(self):
        for port in [0, 443, 65536]:
            with self.assertRaises(ValueError):
                repair.patch(STAGE.format(routing=''), port)


class Transactions(unittest.TestCase):
    def test_failure_at_each_stage_restores_original(self):
        for failure in ['check', 'reload', 'verify']:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp)/'staging.conf'
                path.write_bytes(b'original')
                backup_root = Path(tmp)/'backups'
                backup_root.mkdir()
                calls = []
                failed = False

                def action(name):
                    def invoke():
                        nonlocal failed
                        calls.append(name)
                        if failure == name and not failed:
                            failed = True
                            raise RuntimeError('simulated failure')
                    return invoke

                with mock.object(repair.os, 'chown', create=True), self.assertRaises(RuntimeError):
                    repair.transact(path, b'candidate', backup_root, action('check'), action('reload'), action('verify'))
                self.assertEqual(b'original', path.read_bytes())
                self.assertEqual(['check', 'reload'], calls[-2:])
                self.assertEqual(b'original', next(backup_root.glob('*/vhost.conf')).read_bytes())

    def test_success_and_noop(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'staging.conf'
            path.write_bytes(b'original')
            calls = []
            with mock.object(repair.os, 'chown', create=True):
                for _ in range(2):
                    repair.transact(path, b'candidate', Path(tmp), lambda: calls.append('check'), lambda: calls.append('reload'), lambda: calls.append('verify'))
            self.assertEqual(b'candidate', path.read_bytes())
            self.assertEqual(['check', 'reload', 'verify', 'check', 'verify'], calls)


class AuthenticatedQualification(unittest.TestCase):
    def test_expected_identity_and_response(self):
        headers = Message()
        headers['x-engine-archive-sha256'] = 'a' * 64
        body = b'{"ok":true,"requestId":"staging-apache-qualification"}'
        with mock.object(repair, 'request_http', return_value=(200, headers, body)) as request:
            repair.authenticated_probe('https://staging.novlearn.fr/run', 'test-secret', 'a' * 64)
        self.assertEqual('Bearer test-secret', request.call_args.args[2]['Authorization'])
        self.assertNotIn('Origin', request.call_args.args[2])

    def test_redirect_bad_identity_and_bad_result_refused(self):
        headers = Message()
        headers['x-engine-archive-sha256'] = 'a' * 64
        for status, body in [(307, b'{}'), (200, b'{"ok":false}'), (200, b'{"ok":true,"requestId":"wrong"}')]:
            with self.subTest(status=status, body=body), mock.object(repair, 'request_http', return_value=(status, headers, body)), self.assertRaises(RuntimeError):
                repair.authenticated_probe('https://staging.novlearn.fr/run', 'test-secret', 'a' * 64)
        with mock.object(repair, 'request_http', return_value=(200, headers, b'{}')), self.assertRaises(RuntimeError):
            repair.authenticated_probe('https://staging.novlearn.fr/run', 'test-secret', 'b' * 64)


if __name__ == '__main__':
    unittest.main()
