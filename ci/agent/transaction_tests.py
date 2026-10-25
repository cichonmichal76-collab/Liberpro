"""Exercise complete manual publication and record failures on temporary files."""
import contextlib
import io
import json
import stat
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent)]
import worker
from deploy import MARKER, STATE, sha

HEAD = 'a' * 40
OLD_HEAD = 'b' * 40
NAMES = ['.htaccess', 'index.html', 'contact.php', 'site.js', 'style.css', 'sitemap.xml']
OLD = {name: ('old-' + name).encode() for name in NAMES}
NEW = {name: ('new-' + name).encode() for name in NAMES}


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'domains/liberpro.pl'
        self.agent = self.root / 'ci-agent'
        self.agent.mkdir(parents=True)
        (self.root / 'public_html').mkdir()
        (self.root / MARKER).write_text(json.dumps({
            'domain': 'liberpro.pl', 'repository': worker.REPOSITORY,
            'documentRoot': 'public_html', 'version': 1,
        }))
        self.baseline = {name: sha(data) for name, data in OLD.items()}
        (self.agent / 'baseline.json').write_text(json.dumps(self.baseline))
        (self.agent / 'config.json').write_text('{"mode":"manual"}')
        self.state = self.root / STATE
        self.state.write_bytes(json.dumps({'files': self.baseline, 'release': 'old-release'}).encode())
        self.old_state = self.state.read_bytes()
        for name, data in OLD.items():
            (self.root / 'public_html' / name).write_bytes(data)
        self.private = self.agent / 'last-result.json'
        self.receipt = self.root / 'public_html/deployment-status.json'
        self.private.write_bytes(b'{"status":"PASS","commit":"previous-private"}\n')
        self.private.chmod(0o600)
        self.receipt.write_bytes(json.dumps({'status': 'PASS', 'commit': OLD_HEAD}).encode())
        self.receipt.chmod(0o644)
        self.previous = {p: (p.read_bytes(), stat.S_IMODE(p.stat().st_mode)) for p in [self.private, self.receipt]}
        self.ready = True
        self.superseded = False
        self.refs = 0
        self.fetches = 0
        source = io.BytesIO()
        with zipfile.ZipFile(source, 'w') as archive:
            prefix = 'Liberpro-' + HEAD + '/'
            archive.writestr(prefix + 'ci/managed-files.json', json.dumps(NAMES))
            for name, data in NEW.items():
                archive.writestr(prefix + name, data)
        self.source = source.getvalue()
        self.original_json = worker.atomic_json
        for name, value in [
            ('HERE', self.agent), ('requested_commit', lambda: HEAD),
            ('api', self.api), ('fetch', self.fetch), ('check_public', lambda _: {'checksPassed': 18}),
        ]:
            mock = patch.object(worker, name, value)
            mock.start()
            self.addCleanup(mock.stop)

    def api(self, path):
        if path == 'git/ref/heads/main':
            self.refs += 1
            return {'object': {'sha': OLD_HEAD if self.superseded and self.refs > 1 else HEAD}}
        if path.startswith('actions/workflows/'):
            return {'workflow_runs': [{
                'id': 1, 'head_sha': HEAD, 'event': 'push', 'head_branch': 'main',
                'path': '.github/workflows/' + worker.WORKFLOW,
                'head_repository': {'full_name': worker.REPOSITORY},
                'status': 'completed', 'conclusion': 'success',
            }]}
        if path.startswith('actions/runs/'):
            return {'jobs': [{'name': name, 'status': 'completed', 'conclusion': 'success'}
                             for name in (['Validate', 'Browser'] if self.ready else ['Validate'])]}
        raise AssertionError('Unexpected API path: ' + path)

    def fetch(self, *args):
        self.fetches += 1
        return self.source

    def invoke(self):
        output, errors = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            code = worker.cli()
        return code, output.getvalue(), errors.getvalue()

    def assert_restored(self):
        for name, data in OLD.items():
            self.assertEqual((self.root / 'public_html' / name).read_bytes(), data)
        self.assertEqual(self.state.read_bytes(), self.old_state)
        for path, (data, mode) in self.previous.items():
            self.assertEqual(path.read_bytes(), data)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), mode)

    def test_success_commits_both_records_and_correct_permissions(self):
        code, output, errors = self.invoke()
        self.assertEqual((code, errors), (0, ''))
        for path in [self.private, self.receipt]:
            self.assertEqual(json.loads(path.read_text())['commit'], HEAD)
        self.assertEqual(json.loads(output)['commit'], HEAD)
        self.assertEqual(stat.S_IMODE(self.private.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.receipt.stat().st_mode), 0o644)
        self.assertEqual((self.root / 'public_html/index.html').read_bytes(), NEW['index.html'])

    def fail_record(self, name, after=False, absent=False):
        if absent:
            self.private.unlink()
            self.receipt.unlink()
            self.previous = {}
        def injected(path, data, mode=0o600):
            if path.name == name:
                if after:
                    self.original_json(path, data, mode)
                raise OSError('Injected record failure: ' + name)
            return self.original_json(path, data, mode)
        with patch.object(worker, 'atomic_json', injected):
            code, _, errors = self.invoke()
        self.assertEqual(code, 1)
        self.assertIn('original website restored', errors)
        self.assert_restored()
        if absent:
            self.assertFalse(self.private.exists())
            self.assertFalse(self.receipt.exists())

    def test_private_record_failure_before_write(self):
        self.fail_record('last-result.json')

    def test_private_record_failure_after_replace(self):
        self.fail_record('last-result.json', after=True)

    def test_public_record_failure_before_write(self):
        self.fail_record('deployment-status.json')

    def test_public_record_failure_after_replace(self):
        self.fail_record('deployment-status.json', after=True)

    def test_first_publication_removes_new_records_after_failure(self):
        self.fail_record('deployment-status.json', after=True, absent=True)

    def test_failed_metadata_restore_reports_manual_recovery_and_restores_other_record(self):
        original_bytes = worker.atomic_bytes
        def fail_private_restore(path, data, mode=0o600):
            if path == self.private and data == self.previous[self.private][0]:
                raise OSError('Injected recovery failure')
            return original_bytes(path, data, mode)
        def fail_after_public(path, data, mode=0o600):
            self.original_json(path, data, mode)
            if path == self.receipt:
                raise OSError('Injected receipt failure')
        with patch.object(worker, 'atomic_json', fail_after_public), patch.object(worker, 'atomic_bytes', fail_private_restore):
            code, _, errors = self.invoke()
        self.assertEqual(code, 1)
        self.assertIn('manual recovery required', errors)
        self.assertIn('publication metadata', errors)
        self.assertIn('backup ci-backups/', errors)
        self.assertEqual(self.receipt.read_bytes(), self.previous[self.receipt][0])
        self.assertEqual((self.root / 'public_html/index.html').read_bytes(), OLD['index.html'])
        self.assertEqual(self.state.read_bytes(), self.old_state)

    def test_missing_required_job_returns_error_before_download(self):
        self.ready = False
        code, _, errors = self.invoke()
        self.assertEqual(code, 1)
        self.assertIn('Validate and Browser', errors)
        self.assertEqual(self.fetches, 0)
        self.assert_restored()

    def test_superseded_main_returns_error_without_publication(self):
        self.superseded = True
        code, _, errors = self.invoke()
        self.assertEqual(code, 1)
        self.assertIn('main changed', errors)
        self.assert_restored()

    def test_busy_lock_is_an_explicit_failure(self):
        with patch.object(worker.fcntl, 'flock', side_effect=BlockingIOError):
            code, _, errors = self.invoke()
        self.assertEqual(code, 1)
        self.assertIn('Another publication is running', errors)
        self.assertEqual(self.refs, 0)

    def test_atomic_write_cleans_partial_after_failed_replace(self):
        with patch.object(worker.os, 'replace', side_effect=OSError('Injected replace failure')):
            with self.assertRaises(OSError):
                worker.atomic_json(self.private, {'new': 'value'})
        self.assertEqual(self.private.read_bytes(), self.previous[self.private][0])
        self.assertEqual(list(self.agent.glob('*.partial')), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
