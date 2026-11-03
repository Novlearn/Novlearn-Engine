"""Verify the existing release bytes without rebuilding or extracting the archive."""

import hashlib
import json
from pathlib import Path
import sys
import tarfile


def verify(directory):
    package = json.loads(Path('package.json').read_text(encoding='utf-8'))
    version = package['version']
    directory = Path(directory)
    manifest = json.loads((directory / f'engine-release-{version}.json').read_text(encoding='utf-8'))
    assert manifest['manifestVersion'] == 1
    assert manifest['packageName'] == package['name'] == 'novlearn-exercise-engine'
    assert manifest['packageVersion'] == version
    assert manifest['archive'] == f'novlearn-exercise-engine-{version}.tgz'
    archive = directory / manifest['archive']
    data = archive.read_bytes()
    assert hashlib.sha256(data).hexdigest() == manifest['archiveSha256'], 'Archive SHA-256 mismatch'
    import base64
    integrity = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode('ascii')
    assert integrity == manifest['archiveIntegrity'], 'Archive integrity mismatch'
    actual = {}
    with tarfile.open(archive, 'r:gz') as bundle:
        for member in bundle:
            assert member.name.startswith('package/'), 'Unexpected archive prefix'
            name = member.name.removeprefix('package/')
            assert name and not any(part in ('', '.', '..') for part in name.split('/'))
            assert member.isfile() and not member.issym() and not member.islnk(), 'Non-regular member'
            assert name not in actual, 'Duplicate archive member'
            assert name in ('package.json', 'README.md') or name.startswith('dist/'), 'Unexpected distribution file'
            content = bundle.extractfile(member).read()
            actual[name] = hashlib.sha256(content).hexdigest()
            if name == 'package.json':
                shipped = json.loads(content)
                assert shipped['name'] == package['name'] and shipped['version'] == version
                assert shipped['exports'] == manifest['exports']
                assert shipped['dependencies'] == package['dependencies']
    assert actual == manifest['files'], 'Archive inventory or file digest mismatch'
    print(json.dumps({'version': version, 'files': len(actual), 'sha256': manifest['archiveSha256'], 'verified': True}))


if __name__ == '__main__':
    verify(sys.argv[1])
