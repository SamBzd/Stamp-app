import ast
import contextlib
import importlib.util
from io import BytesIO, StringIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

FILE = Path(__file__).parents[1] / 'maintenance/recette-nas-cd46.py'
spec = importlib.util.spec_from_file_location('recipe_under_test', FILE)
recipe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recipe)


class RecipeTest(unittest.TestCase):
    def item(self, service):
        return {'Id': service + '-container', 'Image': service + '-image',
                'State': {'Running': True, 'StartedAt': 'fixed'},
                'Config': {'WorkingDir': '/app/backend', 'Env': ['STAMP_DB_PATH=/data/app.db'],
                           'Labels': {'com.docker.compose.project': 'known-project',
                                      'com.docker.compose.service': service}},
                'Mounts': [{'Type': 'bind', 'Destination': '/data', 'Source': '/known/database'}]}

    def test_rejects_other_project_stopped_or_old_data_mount(self):
        backend, frontend = self.item('backend'), self.item('frontend')
        with patch.object(recipe, 'inspect', side_effect=[backend, frontend]):
            self.assertEqual(recipe.require_production('backend', 'frontend')[2], '/known/database')
        for mutation in ('project', 'stopped', 'mount', 'path'):
            changed = self.item('backend')
            if mutation == 'project':
                changed['Config']['Labels']['com.docker.compose.project'] = 'another'
            elif mutation == 'stopped':
                changed['State']['Running'] = False
            elif mutation == 'mount':
                changed['Mounts'][0]['Destination'] = '/data/db'
            else:
                changed['Config']['Env'] = ['STAMP_DB_PATH=/unexpected.db']
            with self.subTest(mutation=mutation), patch.object(recipe, 'inspect', side_effect=[changed, frontend]):
                with self.assertRaises(RuntimeError):
                    recipe.require_production('backend', 'frontend')

    def test_invalid_cli_hash_never_starts_database_container(self):
        with TemporaryDirectory() as temporary, patch.object(recipe.os, 'chown'), \
                patch.object(recipe, 'docker') as docker, \
                patch.object(recipe.urllib.request, 'urlopen', return_value=BytesIO(b'corrupted-cli')):
            with self.assertRaisesRegex(RuntimeError, 'Empreinte'):
                recipe.sqlite_check(Path(temporary), self.item('backend'), '/known/database')
            self.assertFalse(any(call.args[0] == 'run' for call in docker.call_args_list))

    def exercise_cleanup(self, fail_sqlite=False, fail_receipt=False):
        with TemporaryDirectory() as temporary:
            directory = Path(temporary) / 'own-fixture'
            directory.mkdir()
            data = directory / 'data'
            data.mkdir()
            (data / 'app.db').write_bytes(b'private fixture bytes')
            backend, frontend = self.item('backend'), self.item('frontend')
            def save(path, value):
                if fail_receipt:
                    raise OSError('disk unavailable')
                path.write_text(json.dumps(value))
            cd = SimpleNamespace(save_json=save)
            with patch.object(recipe, 'sqlite_check', side_effect=RuntimeError('guard') if fail_sqlite else None,
                              return_value={'copy_unchanged': True}), \
                    patch.object(recipe, 'rollback_check', return_value={'probe_failure_rollback': True}), \
                    patch.object(recipe, 'require_production', return_value=(backend, frontend, '/known/database')), \
                    contextlib.redirect_stdout(StringIO()):
                if fail_sqlite or fail_receipt:
                    with self.assertRaises((RuntimeError, OSError)):
                        recipe.run_checks(cd, directory, {}, backend, frontend, '/known/database')
                else:
                    recipe.run_checks(cd, directory, {}, backend, frontend, '/known/database')
            self.assertFalse(directory.exists())
            receipt = Path(temporary) / 'own-fixture.result.json'
            if not fail_receipt:
                result = json.loads(receipt.read_text())
                self.assertEqual(result['completed'], not fail_sqlite)
                self.assertNotIn('private fixture bytes', receipt.read_text())

    def test_cleanup_after_success_preserves_only_receipt(self):
        self.exercise_cleanup()

    def test_cleanup_after_guard_failure(self):
        self.exercise_cleanup(fail_sqlite=True)

    def test_cleanup_even_when_receipt_cannot_be_written(self):
        self.exercise_cleanup(fail_receipt=True)

    def test_python38_syntax(self):
        ast.parse(FILE.read_text(), feature_version=(3, 8))
