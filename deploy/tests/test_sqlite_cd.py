import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import nas_cd
from sqlite_cd import SqliteMaintenance


class FakeProject:
    name = 'stamp'
    services = ['backend', 'frontend']
    config = {'sqlite_migrations': {'service': 'backend', 'database_path': '/data/app.db'}}

    def __init__(self, directory):
        self.state_file = directory / 'state.json'
        self.file = directory / 'compose.yaml'
        self.file.write_text('services: {}')
        self.images = {'backend': 'old', 'frontend': 'old'}
        self.fail_candidate = False

    def activate(self, images):
        self.images = images
        if self.fail_candidate and images['backend'] == 'new':
            raise nas_cd.DeploymentError('sonde en échec')

    def current_image_ids(self):
        return self.images

    def expected_image_ids(self, images):
        return images

    def check_probes(self):
        pass

    def compose(self, *args, **kwargs):
        return 'services: {}' if args[0] == 'config' else ''


class Engine(SqliteMaintenance):
    def __init__(self, project, source):
        super().__init__(project, lambda *a, **kw: '', nas_cd.save_json, nas_cd.DeploymentError)
        self.source = source
        self.gated = False
        self.database = 'old'
        self.calls = []
        self.fail = None

    def containers(self):
        return {}

    def layout(self, containers):
        return str(self.source)

    def http_gate(self, closed):
        assert self.gated == closed

    def stop(self, transaction):
        self.calls.append('stop')

    def helper(self, transaction, command, *args, **kw):
        self.calls.append(command)
        if command == self.fail:
            self.fail = None
            raise nas_cd.DeploymentError('panne injectée')
        if command == 'gate-on': self.gated = True
        if command == 'gate-off': self.gated = False
        if command == 'backup': return {'sha256': 'a' * 64}
        if command == 'rehearse': return {'pending': []}
        if command == 'migrate': self.database = 'new'
        if command == 'restore': self.database = 'old'
        return {}


class SQLiteRolloutTest(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch('sqlite_cd.os.geteuid', return_value=1000))
        self.directory = Path(self.enterContext(TemporaryDirectory()))
        self.source = self.directory / 'db'
        self.source.mkdir()
        (self.source / 'app.db').write_text('fixture')
        self.project = FakeProject(self.directory)
        self.engine = Engine(self.project, self.source)
        self.previous = {'tag_name': 'previous', 'images': self.project.images}
        self.candidate = {'tag_name': 'candidate', 'images': {'backend': 'new', 'frontend': 'new'}}
        self.state = {'active': self.previous, 'pending': None, 'rejected': None}
        nas_cd.save_json(self.project.state_file, self.state)

    def load(self):
        return json.loads(self.project.state_file.read_text())

    def test_success_opens_only_after_durable_commit(self):
        original = self.engine.helper
        def helper(transaction, command, *args, **kwargs):
            if command == 'gate-off':
                self.assertEqual(self.load()['maintenance']['phase'], 'committed')
                self.assertEqual(self.load()['active'], self.candidate)
            return original(transaction, command, *args, **kwargs)
        self.engine.helper = helper
        self.engine.deploy(self.state, self.candidate)
        self.assertEqual(self.engine.database, 'new')
        self.assertFalse(self.engine.gated)
        self.assertIsNone(self.load()['maintenance'])

    def test_backup_tree_is_synced_before_any_live_migration(self):
        import sqlite_cd
        synced = []
        original_sync = sqlite_cd.sync_directory
        original_helper = self.engine.helper
        def sync(path):
            original_sync(path)
            synced.append(path)
        def helper(transaction, command, *args, **kwargs):
            if command == 'migrate':
                directory = Path(transaction['backup'])
                self.assertEqual(synced, [directory/'data', directory,
                    directory.parent, directory.parent.parent])
                self.assertTrue(self.load()['maintenance']['restore_required'])
            return original_helper(transaction, command, *args, **kwargs)
        self.engine.helper = helper
        with patch.object(sqlite_cd, 'sync_directory', sync):
            self.engine.deploy(self.state, self.candidate)

    def test_backup_or_rehearsal_failure_never_restores_an_unverified_backup(self):
        for command in ['backup', 'rehearse']:
            with self.subTest(command=command):
                self.setUp()
                self.engine.fail = command
                with self.assertRaises(nas_cd.DeploymentError):
                    self.engine.deploy(self.state, self.candidate)
                self.assertNotIn('restore', self.engine.calls)
                self.assertEqual(self.project.images, self.previous['images'])
                self.assertEqual(self.load()['rejected'], self.candidate)

    def test_health_failure_restores_pair_and_database_before_opening(self):
        self.project.fail_candidate = True
        with self.assertRaises(nas_cd.DeploymentError):
            self.engine.deploy(self.state, self.candidate)
        self.assertEqual(self.engine.database, 'old')
        self.assertEqual(self.project.images, self.previous['images'])
        self.assertFalse(self.engine.gated)
        self.assertEqual(self.load()['rejected'], self.candidate)

    def test_interrupted_opening_rolls_forward_without_erasing_new_writes(self):
        self.engine.fail = 'gate-off'
        with self.assertRaises(nas_cd.DeploymentError):
            self.engine.deploy(self.state, self.candidate)
        self.assertEqual(self.load()['maintenance']['phase'], 'committed')
        self.engine.database = 'new plus new orders'
        self.engine.recover(self.load())
        self.assertEqual(self.engine.database, 'new plus new orders')
        self.assertNotIn('restore', self.engine.calls)

    def test_recovery_before_commit_restores_and_rejects_candidate(self):
        original = self.project.activate
        def interrupted(images):
            if images == self.candidate['images']: raise KeyboardInterrupt()
            original(images)
        self.project.activate = interrupted
        with self.assertRaises(KeyboardInterrupt):
            self.engine.deploy(self.state, self.candidate)
        self.assertTrue(self.engine.gated)
        self.project.activate = original
        self.engine.recover(self.load())
        self.assertEqual(self.engine.database, 'old')
        self.assertEqual(self.load()['rejected'], self.candidate)

    def test_commit_replaced_then_fsync_failed_does_not_roll_back(self):
        original = self.engine.save
        def save(file, state):
            original(file, state)
            if state.get('maintenance', {}).get('phase') == 'committed':
                self.engine.save = original
                raise OSError('fsync')
        self.engine.save = save
        self.engine.deploy(self.state, self.candidate)
        self.assertNotIn('restore', self.engine.calls)
        self.assertEqual(self.load()['active'], self.candidate)
