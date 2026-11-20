"""Fault-injection tests of the one-time NAS migration's shell rollback.

External API/Python/Docker calls are stubs. Real file copies, moves, checksums
and shell traps run in a temporary directory, never against a NAS.
"""
import ast
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest


class SecurityUpdateTest(unittest.TestCase):
    script = Path(__file__).parents[1] / 'maintenance/update-calendar-security-20261119.sh'

    def embedded_node(self, kind, name):
        body = re.findall(r"<<'PY'\n(.*?)\nPY", self.script.read_text(), re.S)[0]
        for node in ast.parse(body).body:
            if isinstance(node, kind):
                if getattr(node, 'name', None) == name or (
                    isinstance(node, ast.Assign) and any(getattr(target, 'id', None) == name for target in node.targets)
                ):
                    return ast.Module(body=[node], type_ignores=[])
        self.fail('Embedded definition missing: ' + name)

    def profile(self, info):
        namespace = {}
        exec(compile(self.embedded_node(ast.FunctionDef, 'resource_limits'), str(self.script), 'exec'), namespace)
        return namespace['resource_limits'](info)

    def test_synology_without_cfs_and_pids_uses_supported_controls(self):
        info = {'CPUShares': True, 'CPUCfsQuota': False, 'MemoryLimit': True,
                'SwapLimit': True, 'PidsLimit': False}
        namespace = {'image': 'test-image', 'resources': self.profile(info)}
        exec(compile(self.embedded_node(ast.Assign, 'compose'), str(self.script), 'exec'), namespace)
        service = namespace['compose']['services']['web']
        self.assertNotIn('cpus', service)
        self.assertNotIn('pids_limit', service)
        self.assertEqual(service['mem_limit'], '64m')
        self.assertEqual(service['cpu_shares'], 128)
        self.assertEqual(service['ulimits']['nproc'], {'soft': 64, 'hard': 64})
        self.assertEqual(service['user'], '101:101')
        self.assertEqual(service['cap_drop'], ['ALL'])

    def test_missing_required_resource_support_refuses_profile(self):
        for info in ({}, {'CPUShares': False, 'MemoryLimit': True},
                     {'CPUShares': True, 'MemoryLimit': False}):
            with self.subTest(info=info), self.assertRaises(SystemExit):
                self.profile(info)

    def test_embedded_python_remains_compatible_with_python38(self):
        for body in re.findall(r"<<'PY'\n(.*?)\nPY", self.script.read_text(), re.S):
            ast.parse(body, feature_version=(3, 8))

    def exercise(self, failure=""):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            base = root / "nas"
            project = "calendrier-avent-maman-2026"
            state = base / "state" / project
            state.mkdir(parents=True)
            (base / "calendrier").mkdir()
            (base / "nas_cd.py").write_text("OLD SCRIPT")
            (base / "projects.json").write_text("OLD CONFIG")
            (base / "calendrier/compose.yaml").write_text("OLD COMPOSE")
            (state / "state.json").write_text("OLD STATE")
            (state / "images.compose.json").write_text("OLD IMAGES")
            binaries = root / "bin"
            binaries.mkdir()
            interpreter = "#!" + sys.executable + "\n"
            stubs = {
                "id": "print('0')\n",
                "curl": """import os, sys
from pathlib import Path
if '--output' in sys.argv:
    Path(sys.argv[sys.argv.index('--output') + 1]).write_text('NEW SCRIPT')
elif os.environ.get('FAILURE') == 'health' and (Path(os.environ['TEST_BASE']) / 'calendrier/compose.yaml').read_text() == 'NEW COMPOSE':
    sys.exit(1)
""",
                "docker-compose": """import os, sys
from pathlib import Path
base = Path(os.environ['TEST_BASE'])
if 'up' in sys.argv:
    version = (base / 'calendrier/compose.yaml').read_text()
    with (base / 'docker.log').open('a') as log:
        log.write(version + '\\n')
    if version == 'NEW COMPOSE' and os.environ.get('FAILURE') == 'switch':
        sys.exit(1)
""",
                "python": """import os, sys
from pathlib import Path
base = Path(os.environ['TEST_BASE'])
project = 'calendrier-avent-maman-2026'
if sys.argv[1] == '-':
    source = sys.stdin.read()
    if 'importlib.util' in source:
        if os.environ.get('FAILURE') == 'proof':
            sys.exit(1)
        backup = Path(os.environ['UPDATE_BACKUP'])
        (backup / 'projects.next.json').write_text('NEW CONFIG')
        (backup / 'compose.next.json').write_text('NEW COMPOSE')
    elif os.environ.get('FAILURE') == 'inspection':
        sys.exit(1)
else:
    if os.environ.get('FAILURE') == 'adoption':
        sys.exit(1)
    state = base / 'state' / project
    state.mkdir(exist_ok=True)
    (state / 'state.json').write_text('NEW STATE')
    (state / 'images.compose.json').write_text('NEW IMAGES')
""",
            }
            for name, body in stubs.items():
                path = binaries / name
                path.write_text(interpreter + body)
                path.chmod(0o700)
            source = (Path(__file__).parents[1] / "maintenance/update-calendar-security-20261119.sh").read_text()
            source = source.replace("/volume1/docker/nas-cd", str(base))
            source = source.replace("export PATH=", "export PATH=" + str(binaries) + ":")
            source = source.replace("/bin/python3", str(binaries / "python"))
            source = source.replace("export CD_SHA256=" + source.split("export CD_SHA256=")[1].splitlines()[0],
                                    "export CD_SHA256=" + hashlib.sha256(b"NEW SCRIPT").hexdigest())
            environment = {**os.environ, "PATH": str(binaries) + ":" + os.environ["PATH"],
                           "TEST_BASE": str(base), "FAILURE": failure}
            result = subprocess.run(["/bin/sh"], input=source, text=True, env=environment,
                                    capture_output=True, timeout=15)
            if failure:
                self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertEqual((base / "nas_cd.py").read_text(), "OLD SCRIPT")
                self.assertEqual((base / "projects.json").read_text(), "OLD CONFIG")
                self.assertEqual((base / "calendrier/compose.yaml").read_text(), "OLD COMPOSE")
                self.assertEqual((state / "state.json").read_text(), "OLD STATE")
                self.assertEqual((state / "images.compose.json").read_text(), "OLD IMAGES")
                if failure == "proof":
                    self.assertFalse((base / "docker.log").exists())
                else:
                    self.assertEqual((base / "docker.log").read_text().splitlines()[-1], "OLD COMPOSE")
            else:
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertEqual((base / "nas_cd.py").read_text(), "NEW SCRIPT")
                self.assertEqual((base / "projects.json").read_text(), "NEW CONFIG")
                self.assertEqual((state / "state.json").read_text(), "NEW STATE")
                backups = list(base.glob("calendar-security-*"))
                self.assertEqual(len(backups), 1)
                self.assertEqual((backups[0] / "state/state.json").read_text(), "OLD STATE")
                self.assertIn("reste désactivée", result.stdout)

    def test_success_preserves_backup_and_adopts_new_state(self):
        self.exercise()

    def test_invalid_proof_does_not_change_runtime_or_config(self):
        self.exercise("proof")

    def test_failed_recreation_restores_old_compose_images_and_state(self):
        self.exercise("switch")

    def test_failed_health_probe_restores_old_version(self):
        self.exercise("health")

    def test_failed_adoption_restores_old_version(self):
        self.exercise("adoption")

    def test_failed_security_inspection_restores_old_version(self):
        self.exercise("inspection")
