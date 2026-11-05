"""Representative Certbot configuration; NOT a snapshot of the user's VPS."""
CERTBOT_CONFIG = '''# Representative TLS configuration with legitimate non-SSL directives.
SSLEngine on
SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
SSLHonorCipherOrder off
SSLSessionTickets off
SSLOptions +StrictRequire
<IfModule mod_log_config.c>
    LogFormat "%v %h %l %u %t \\"%r\\" %>s %b" vhost_common
</IfModule>
'''
