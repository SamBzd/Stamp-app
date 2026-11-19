import contextlib
from io import StringIO
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import nas_cd


def release(project, version):
    return {
        "id": version,
        "tag_name": "nas-" + str(version) * 40,
        "published_at": f"2026-01-0{version}T00:00:00Z",
        "images": {
            service: repository + "@sha256:" + str(version) * 64
            for service, repository in project["images"].items()
        },
    }


class DeploymentTest(unittest.TestCase):
    def setUp(self):
        self.base = Path(self.enterContext(TemporaryDirectory()))
        self.nas = self.base / "state"
        self.config_path = self.base / "projects.json"
        self.projects = {
            "stamp": self.project_config("stamp", ("backend", "frontend"), require_existing=True,
                preflight={"service": "backend", "entrypoint": "node",
                           "args": ["scripts/migrate-db.js", "--require-current"]}),
            "calendrier": self.project_config("calendrier", ("web",)),
        }
        self.releases = {name: release(config, 2) for name, config in self.projects.items()}
        self.running = {
            "stamp": {"backend": "stamp-backend:original", "frontend": "stamp-frontend:original"},
            "calendrier": {},
        }
        self.unhealthy = set()
        self.migrations_required = set()
        self.local_tags = {}
        self.history = []

    def project_config(self, name, services, **settings):
        root = self.base / name
        root.mkdir()
        compose = root / "compose.yaml"
        compose.write_text("services: {}\n")
        return {
            "repository": f"sam/{name}",
            "compose_file": str(compose),
            "images": {service: f"ghcr.io/sam/{name}-{service}" for service in services},
            "probes": [f"http://localhost/{name}"],
            "health_timeout": 0,
            "trusted_workflows": {f"sam/{name}/.github/workflows/nas-release.yml": "a" * 64},
            **settings,
        }

    def fake_release(self, config, known=()):
        return self.releases[config["repository"].split("/")[1]]

    def fake_run(self, command, **_):
        if command[:2] == ["docker", "inspect"]:
            name, service = command[-1].split("/")
            image = self.running[name][service]
            return "true " + self.local_tags.get(image, image)
        if command[:3] == ["docker", "image", "inspect"]:
            return self.local_tags.get(command[-1], command[-1])
        if command[:3] == ["docker", "image", "tag"]:
            self.local_tags[command[-1]] = command[-2]
            return None
        if command[:2] == ["docker", "pull"]:
            self.history.append(("pull", command[-1]))
            return None
        self.assertEqual(command[:2], ["compose-test", "-p"])
        name = command[2]
        actions = command[5:]
        images = {}
        if actions[:1] == ["-f"]:
            override = json.loads(Path(actions[1]).read_text())
            images = {service: entry["image"] for service, entry in override["services"].items()}
            actions = actions[2:]

        action = actions[0]
        if action == "config":
            return "\n".join(self.projects[name]["images"])
        if action == "ps":
            service = actions[-1]
            return f"{name}/{service}" if service in self.running[name] else ""
        self.history.append((name, action))
        if action == "up":
            self.running[name] = images
        elif action == "stop":
            self.running[name] = {}
        elif action == "run":
            self.assertIn("--no-deps", actions)
            self.assertIn("--require-current", actions)
            if name in self.migrations_required:
                raise nas_cd.DeploymentError("Migration nécessaire.")
        else:
            self.fail(f"Unexpected command: {command}")

    def fake_probes(self, project):
        if any(image in self.unhealthy for image in self.running[project.name].values()):
            raise nas_cd.DeploymentError("HTTP 503.")

    def deploy(self, *options):
        self.config_path.write_text(json.dumps({
            "compose_command": ["compose-test"], "projects": self.projects
        }))
        argv = ["nas_cd.py", str(self.config_path), "--state-dir", str(self.nas), *options]
        def fake_probes(project):
            self.fake_probes(project)

        with patch.object(sys, "argv", argv), patch.object(nas_cd, "run", self.fake_run), \
                patch.object(nas_cd, "latest_release", self.fake_release), \
                patch.object(nas_cd.Project, "check_probes", fake_probes), \
                contextlib.redirect_stdout(StringIO()), contextlib.redirect_stderr(StringIO()):
            return nas_cd.main()

    def state(self, name):
        return json.loads((self.nas / name / "state.json").read_text())

    def test_two_projects_use_same_mechanism_without_redeploying(self):
        self.assertEqual(self.deploy(), 0)
        self.assertEqual(self.running["stamp"], self.releases["stamp"]["images"])
        self.assertEqual(self.running["calendrier"], self.releases["calendrier"]["images"])
        self.assertLess(self.history.index(("stamp", "run")), self.history.index(("stamp", "up")))
        self.history.clear()
        self.assertEqual(self.deploy(), 0)
        self.assertEqual(self.history, [])

    def test_blocked_stamp_migration_does_not_block_calendar(self):
        self.migrations_required.add("stamp")
        self.assertEqual(self.deploy(), 1)
        self.assertEqual(self.state("stamp")["active"]["tag_name"], "initial")
        self.assertNotIn(("stamp", "up"), self.history)
        self.assertEqual(self.state("calendrier")["active"]["id"], 2)
        self.history.clear()
        self.assertEqual(self.deploy(), 0)
        self.assertEqual(self.history, [])
        self.migrations_required.clear()
        self.assertEqual(self.deploy("--project", "stamp", "--retry"), 0)
        self.assertEqual(self.state("stamp")["active"]["id"], 2)

    def test_suspended_stamp_does_not_block_calendar(self):
        self.projects["stamp"]["enabled"] = False
        self.assertEqual(self.deploy(), 0)
        self.assertFalse((self.nas / "stamp").exists())
        self.assertEqual(self.state("calendrier")["active"]["id"], 2)

    def test_invalid_stamp_config_does_not_block_calendar(self):
        self.projects["stamp"] = None
        self.assertEqual(self.deploy(), 1)
        self.assertFalse((self.nas / "stamp").exists())
        self.assertEqual(self.state("calendrier")["active"]["id"], 2)

    def test_failed_release_rolls_back_and_is_not_redeployed(self):
        self.assertEqual(self.deploy(), 0)
        previous = self.releases["stamp"]
        self.releases["stamp"] = release(self.projects["stamp"], 3)
        self.releases["calendrier"] = release(self.projects["calendrier"], 3)
        self.unhealthy.update(self.releases["stamp"]["images"].values())
        self.assertEqual(self.deploy(), 1)
        self.assertEqual(self.running["stamp"], previous["images"])
        self.assertEqual(self.state("stamp")["active"], previous)
        self.assertEqual(self.state("stamp")["rejected"]["id"], 3)
        self.assertEqual(self.state("calendrier")["active"]["id"], 3)
        self.history.clear()
        self.assertEqual(self.deploy(), 0)
        self.assertEqual(self.history, [])

    def test_interrupted_switch_restores_the_previous_images(self):
        self.assertEqual(self.deploy(), 0)
        previous = self.releases["stamp"]
        self.releases["stamp"] = release(self.projects["stamp"], 3)
        self.running["stamp"] = self.releases["stamp"]["images"]
        state = self.state("stamp")
        state["pending"] = self.releases["stamp"]
        nas_cd.save_json(self.nas / "stamp" / "state.json", state)

        self.assertEqual(self.deploy(), 0)
        self.assertEqual(self.running["stamp"], previous["images"])
        self.assertEqual(self.state("stamp")["rejected"]["id"], 3)

    def test_requires_running_production_services_before_adopting_project(self):
        self.running["stamp"] = {}
        self.assertEqual(self.deploy(), 1)
        self.assertEqual(self.state("calendrier")["active"]["id"], 2)
        self.assertNotIn(("stamp", "up"), self.history)

    def test_manifest_only_accepts_expected_repositories_and_exact_services(self):
        config = self.projects["calendrier"]
        candidate = self.releases["calendrier"]
        commit = candidate["tag_name"][4:]
        manifest = {"version": 2, "repository": config["repository"], "commit": commit,
                    "images": candidate["images"]}
        self.assertEqual(nas_cd.validate_manifest(manifest, config, commit), candidate["images"])
        for invalid in ({"web": "ghcr.io/other/web@sha256:" + "2" * 64},
                        {"web": config["images"]["web"] + ":latest"},
                        {"another-service": candidate["images"]["web"]}, {}):
            with self.subTest(invalid=invalid), self.assertRaises(nas_cd.DeploymentError):
                nas_cd.validate_manifest({**manifest, "images": invalid}, config, commit)

    def test_release_reader_ignores_drafts_and_ordinary_releases(self):
        config = self.projects["calendrier"]
        candidate = self.releases["calendrier"]
        asset = {"name": "nas-release.json", "state": "uploaded", "id": 14}
        published = {**candidate, "draft": False, "prerelease": False, "assets": [asset]}
        ordinary = {**published, "id": 4, "tag_name": "v1.0"}
        draft = {**published, "id": 5, "draft": True}
        manifest = {"version": 2, "repository": config["repository"], "commit": candidate["tag_name"][4:],
                    "images": candidate["images"]}
        with patch.object(nas_cd, "github_json", side_effect=[[draft, ordinary, published], manifest]) as api, \
                patch.object(nas_cd, "verify_publication", return_value={"policy": "verified"}):
            self.assertEqual(nas_cd.latest_release(config), {**candidate, "verification": {"policy": "verified"}})
        api.assert_called_with("/repos/sam/calendrier/releases/assets/14", None, "application/octet-stream")


if __name__ == "__main__":
    unittest.main()
