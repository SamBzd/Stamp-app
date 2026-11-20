import ast
import contextlib
from copy import deepcopy
import hashlib
import importlib.util
from io import StringIO
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

FILE = Path(__file__).parents[1] / 'maintenance/connect-stamp-rehearsal.py'
spec = importlib.util.spec_from_file_location('stamp_driver_test', FILE)
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)


class ConnectTest(unittest.TestCase):
    def test_compose_owner_must_be_root_or_admin_without_group_write(self):
        file = Path('/fixture/parent/compose.yaml')
        metadata = SimpleNamespace(st_uid=1031, st_mode=0o100755)
        with patch.object(Path, 'stat', return_value=metadata), \
                patch.object(driver.pwd, 'getpwuid', return_value=SimpleNamespace(pw_name='owner', pw_gid=100)), \
                patch.object(driver.grp, 'getgrnam', return_value=SimpleNamespace(gr_gid=101)), \
                patch.object(driver.os, 'getgrouplist', return_value=[100, 101]):
            driver.assert_compose_trusted(file)
            with patch.object(driver.os, 'getgrouplist', return_value=[100]):
                with self.assertRaisesRegex(RuntimeError, 'non administrateur'):
                    driver.assert_compose_trusted(file)
            with patch.object(Path, 'stat', return_value=SimpleNamespace(st_uid=0, st_mode=0o100775)):
                with self.assertRaisesRegex(RuntimeError, 'écritures'):
                    driver.assert_compose_trusted(file)

    def test_unapproved_helper_never_executes(self):
        with TemporaryDirectory() as temporary:
            marker = Path(temporary) / 'executed'
            file = Path(temporary) / 'helper.py'
            file.write_text('open(' + repr(str(marker)) + ',"w").write("unsafe")')
            with self.assertRaisesRegex(RuntimeError, 'non approuvée'):
                driver.load_verified('unapproved', file, '0' * 64)
            self.assertFalse(marker.exists())

    def test_receipt_requires_private_root_file_and_all_successes(self):
        with TemporaryDirectory() as temporary:
            base = Path(temporary)
            file = base / 'receipt.json'
            good = {'completed': True, 'production_containers_unchanged': True,
                    'sqlite': dict.fromkeys(('consistent_copy', 'pending_migration_refused', 'copy_unchanged'), True),
                    'rollback': dict.fromkeys(('probe_failure_rollback', 'rejected_not_retried'), True)}
            file.write_text(json.dumps(good))
            file.chmod(0o600)
            original = Path.stat
            def root_stat(path, *args, **kwargs):
                result = original(path, *args, **kwargs)
                if path == file and kwargs.get('follow_symlinks', True):
                    fields = list(result)
                    fields[4] = 0
                    return os.stat_result(fields)
                return result
            with patch.object(Path, 'stat', root_stat):
                driver.check_receipt(base, file)
                bad = deepcopy(good)
                bad['rollback']['probe_failure_rollback'] = False
                file.write_text(json.dumps(bad))
                with self.assertRaisesRegex(RuntimeError, 'réussie'):
                    driver.check_receipt(base, file)
                file.write_text(json.dumps(good))
                file.chmod(0o640)
                with self.assertRaisesRegex(RuntimeError, 'privé'):
                    driver.check_receipt(base, file)
                linked = base / 'link.json'
                linked.symlink_to(file)
                with self.assertRaises(RuntimeError):
                    driver.check_receipt(base, linked)

    def exercise(self, failure=None):
        with TemporaryDirectory() as temporary, contextlib.redirect_stdout(StringIO()):
            base = Path(temporary)
            cfg = base / 'projects.json'
            cfg.write_text(json.dumps({'compose_command': ['test-compose'], 'projects': {'other': {'enabled': False}}}))
            file = base / 'compose.yaml'
            file.write_text('reviewed compose')
            name = 'stamp-fixture'
            old = {'backend': 'old-backend', 'frontend': 'old-frontend'}
            candidate = {'id': 7, 'tag_name': 'nas-' + 'a' * 40, 'published_at': '2026-11-19T00:00:00Z',
                         'images': {'backend': 'new-backend', 'frontend': 'new-frontend'}}
            def container(service):
                return {'Id': service, 'Image': old[service], 'State': {'Running': True, 'StartedAt': 'before'},
                        'Config': {'Labels': {'com.docker.compose.project': name,
                                             'com.docker.compose.project.config_files': str(file)}},
                        'HostConfig': {'PortBindings': {'80/tcp': [{'HostPort': '5173'}]}},
                        'Mounts': [{'Destination': '/data', 'Source': '/expected/data'}]}
            backend, frontend = container('backend'), container('frontend')
            flags = {'guard': False, 'deployed': False, 'recovered': False}
            holder = []
            def save(path, value):
                if failure == 'register' and path == cfg:
                    raise OSError('configuration disk unavailable')
                if failure == 'commit' and path == cfg and value['projects'][name]['enabled']:
                    raise OSError('commit disk unavailable')
                if failure == 'receipt' and path.name == 'result.json':
                    raise OSError('receipt disk unavailable')
                path.write_text(json.dumps(value))
            class Project:
                def __init__(self, name, settings, command, directory):
                    self.state_file = directory / 'state.json'
                    self.override = directory / 'override.json'
                    self.current = dict(old)
                    holder.append(self)
                def compose_services(self):
                    return set(old)
                def wait_healthy(self, images):
                    if self.current != images:
                        raise RuntimeError('unexpected active images')
                def bootstrap(self):
                    return {'id': 0, 'tag_name': 'initial', 'published_at': '', 'images': dict(old)}
                def write_images(self, path, images):
                    path.write_text(json.dumps(images))
                def current_image_ids(self):
                    return self.current
                def expected_image_ids(self, images):
                    return images
                def deploy(self, retry):
                    # The scheduler must skip the staged project, even after a crash.
                    assert json.loads(cfg.read_text())['projects'][name]['enabled'] is False
                    core_spec = importlib.util.spec_from_file_location('scheduler_under_test', FILE.parents[1] / 'nas_cd.py')
                    core = importlib.util.module_from_spec(core_spec)
                    core_spec.loader.exec_module(core)
                    with patch.object(sys, 'argv', ['nas_cd.py', str(cfg), '--state-dir', str(base / 'state')]), \
                            patch.object(core, 'Project', side_effect=AssertionError('scheduler must not deploy')):
                        assert core.main() == 0
                    state = json.loads(self.state_file.read_text())
                    state['pending'] = candidate
                    self.state_file.write_text(json.dumps(state))
                    self.current = dict(candidate['images'])
                    flags['deployed'] = True
                    if failure == 'activation':
                        raise RuntimeError('activation interrupted')
                    state.update(active=candidate, pending=None)
                    self.state_file.write_text(json.dumps(state))
                def recover(self, state):
                    assert state['active']['images'] == old
                    self.current = dict(state['active']['images'])
                    state.update(pending=None, rejected=candidate)
                    self.state_file.write_text(json.dumps(state))
                    flags['recovered'] = True
            def guard(*args):
                assert args[1]['Id'] == 'candidate-migration-container', 'migrations must come from candidate'
                assert args[1]['Image'] == candidate['images']['backend']
                flags['guard'] = True
                if failure == 'guard':
                    raise RuntimeError('migration rejected')
                return {'copy_unchanged': True}
            def inspect(service):
                item = deepcopy(backend if service == 'backend' else frontend)
                if failure == 'changed' and flags['guard'] and not flags['deployed']:
                    item['State']['StartedAt'] = 'external restart'
                if failure == 'mount' and flags['deployed'] and not flags['recovered']:
                    item['Mounts'][0]['Source'] = '/wrong/data'
                return item
            cd = SimpleNamespace(validate=lambda *_: None, latest_release=lambda *_: candidate,
                                 Project=Project, save_json=save, run=lambda *_a, **_kw: None)
            recipe = SimpleNamespace(require_production=lambda *_: (backend, frontend, '/expected/data'),
                                     sqlite_check=guard, inspect=inspect,
                                     docker=lambda *_a, **_kw: SimpleNamespace(stdout='candidate-migration-container'),
                                     fingerprint=lambda item: (item['Id'], item['Image'], item['State']['StartedAt']))
            args = SimpleNamespace(backend_container='backend', frontend_container='frontend',
                                   compose_sha256='0' * 64 if failure == 'compose' else hashlib.sha256(file.read_bytes()).hexdigest(),
                                   release_commit='a' * 40)
            if failure:
                with self.assertRaises((RuntimeError, OSError)):
                    driver.deliver(base, args, cd, recipe)
            else:
                driver.deliver(base, args, cd, recipe)
            config = json.loads(cfg.read_text())
            self.assertEqual(config['projects']['other'], {'enabled': False})
            if failure in ('compose', 'guard', 'changed', 'register'):
                self.assertNotIn(name, config['projects'])
                self.assertFalse(flags['deployed'])
            elif failure:
                self.assertIn(name, config['projects'])
                self.assertFalse(config['projects'][name]['enabled'])
                self.assertTrue(flags['recovered'])
                self.assertEqual(holder[0].current, old)
                state = json.loads(holder[0].state_file.read_text())
                self.assertIsNone(state['pending'])
                self.assertEqual(state['active']['id'], 0)
            else:
                self.assertIn(name, config['projects'])
                self.assertTrue(config['projects'][name]['enabled'])
                self.assertEqual(holder[0].current, candidate['images'])

    def test_success_registers_before_switch_and_preserves_other_projects(self):
        self.exercise()

    def test_bad_compose_hash_never_switches(self):
        self.exercise('compose')

    def test_failed_guard_never_registers_or_switches(self):
        self.exercise('guard')

    def test_external_restart_during_guard_stops_delivery(self):
        self.exercise('changed')

    def test_failed_registration_never_switches(self):
        self.exercise('register')

    def test_interrupted_switch_recovers_previous_state(self):
        self.exercise('activation')

    def test_failed_post_switch_mount_check_recovers_previous_state(self):
        self.exercise('mount')

    def test_failed_post_switch_receipt_recovers_previous_state(self):
        self.exercise('receipt')

    def test_failed_enable_commit_recovers_and_keeps_scheduler_paused(self):
        self.exercise('commit')

    def test_candidate_container_removed_when_sqlite_guard_fails(self):
        from unittest.mock import Mock
        recipe = SimpleNamespace(docker=Mock(return_value=SimpleNamespace(stdout='temporary-candidate')),
                                 sqlite_check=Mock(side_effect=RuntimeError('requires migration')))
        with self.assertRaises(RuntimeError):
            driver.guard_candidate(recipe, Path('/unused'), {'Id': 'production'}, '/source', 'candidate@digest')
        self.assertEqual(recipe.sqlite_check.call_args.args[1]['Id'], 'temporary-candidate')
        self.assertEqual(recipe.docker.call_args.args[:3], ('rm', '-f', '-v'))

    def exercise_rollback_only(self, enabled=False, unknown=False):
        with TemporaryDirectory() as temporary, contextlib.redirect_stdout(StringIO()):
            base = Path(temporary)
            backup = base / 'stamp-before-cd46-fixture'
            backup.mkdir(mode=0o700)
            source = base / 'compose.yaml'
            source.write_text('approved compose')
            settings = {'enabled': True, 'compose_file': str(source)}
            previous = {'id': 0, 'images': {'backend': 'old'}}
            candidate = {'id': 7, 'tag_name': 'nas-candidate', 'images': {'backend': 'new'}}
            (backup / 'transaction.json').write_text(json.dumps({'project': 'fixture', 'settings': settings,
                'candidate': candidate, 'previous': previous,
                'compose_sha256': hashlib.sha256(source.read_bytes()).hexdigest()}))
            staged = {**settings, 'enabled': enabled, 'controlled_release': 'nas-candidate'}
            (base / 'projects.json').write_text(json.dumps({'compose_command': ['fixture'], 'projects': {'fixture': staged}}))
            (base / 'state/fixture').mkdir(parents=True)
            calls = []
            class Project:
                def __init__(self, *args):
                    self.state_file = base / 'state/fixture/state.json'
                def expected_image_ids(self, images):
                    return images
                def current_image_ids(self):
                    return {'backend': 'external' if unknown else 'new'}
                def recover(self, state):
                    calls.append(state)
            cd = SimpleNamespace(validate=lambda *_: None, Project=Project,
                                 save_json=lambda path, value: path.write_text(json.dumps(value)))
            original = Path.stat
            def root_stat(path, *args, **kwargs):
                result = original(path, *args, **kwargs)
                if path == backup and kwargs.get('follow_symlinks', True):
                    fields = list(result)
                    fields[4] = 0
                    return os.stat_result(fields)
                return result
            with patch.object(Path, 'stat', root_stat):
                if enabled or unknown:
                    with self.assertRaises(RuntimeError):
                        driver.rollback_only(base, backup, cd)
                    self.assertFalse(calls)
                else:
                    driver.rollback_only(base, backup, cd)
                    self.assertEqual(calls[0]['active'], previous)
                    self.assertEqual(calls[0]['pending'], candidate)
                    self.assertFalse(json.loads((base / 'projects.json').read_text())['projects']['fixture']['enabled'])

    def test_explicit_recovery_restores_staged_project_without_fetching_release(self):
        self.exercise_rollback_only()

    def test_explicit_recovery_refuses_already_enabled_project(self):
        self.exercise_rollback_only(enabled=True)

    def test_explicit_recovery_refuses_unknown_external_image(self):
        self.exercise_rollback_only(unknown=True)

    def test_python38_syntax(self):
        ast.parse(FILE.read_text(), feature_version=(3, 8))
