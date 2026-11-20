"""Security boundaries for release assets, Actions identity and local approvals."""
from copy import deepcopy
import hashlib
from io import BytesIO
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import nas_cd


class PublicationTest(unittest.TestCase):
    def setUp(self):
        self.commit = "a" * 40
        self.workflow = "sam/calendar/.github/workflows/nas-release.yml"
        self.publisher = "sam/shared/.github/workflows/nas-publish.yml"
        self.config = {
            "repository": "sam/calendar", "images": {"web": "ghcr.io/sam/calendar-web"},
            "trusted_workflows": {name: hashlib.sha256(name.encode()).hexdigest()
                                  for name in (self.workflow, self.publisher)},
        }
        self.manifest = {
            "version": 2, "repository": "sam/calendar", "commit": self.commit,
            "images": {"web": "ghcr.io/sam/calendar-web@sha256:" + "b" * 64},
            "publication": {"run_id": 42, "run_attempt": 1},
        }
        self.run = {
            "id": 42, "run_attempt": 1, "status": "completed", "conclusion": "success",
            "event": "workflow_dispatch", "head_sha": self.commit, "head_branch": "main",
            "path": ".github/workflows/nas-release.yml",
            "repository": {"id": 12, "full_name": "sam/calendar"},
            "head_repository": {"id": 12, "full_name": "sam/calendar"},
            "referenced_workflows": [{"path": self.publisher + "@" + "c" * 40, "sha": "c" * 40}],
        }
        self.archive_manifest = deepcopy(self.manifest)
        self.filename = "nas-release.json"
        self.artifact_changes = {}

    def verify(self):
        stream = BytesIO()
        with ZipFile(stream, "w") as zipped:
            zipped.writestr(self.filename, json.dumps(self.archive_manifest))
        archive = stream.getvalue()
        artifact = {
            "id": 18, "name": "nas-manifest-1", "expired": False, "size_in_bytes": len(archive),
            "digest": "sha256:" + hashlib.sha256(archive).hexdigest(),
            "workflow_run": {"id": 42, "head_sha": self.commit, "head_branch": "main",
                             "repository_id": 12, "head_repository_id": 12},
            **self.artifact_changes,
        }

        def binary(path, token, accept, limit):
            if "/actions/artifacts/" in path:
                return archive
            name = path.split("/contents/")[0][len("/repos/"):] + "/" + path.split("/contents/")[1].split("?")[0]
            return name.encode()

        with patch.object(nas_cd, "github_json", side_effect=[self.run, {"artifacts": [artifact]}]), \
                patch.object(nas_cd, "github_bytes", side_effect=binary):
            return nas_cd.verify_publication(self.manifest, self.config, "test-token")

    def test_accepts_matching_immutable_artifact_and_approved_workflows(self):
        self.assertEqual(self.verify()["policy"], nas_cd.policy_digest(self.config))

    def test_refuses_release_asset_replacement(self):
        self.manifest["images"]["web"] = "ghcr.io/sam/calendar-web@sha256:" + "d" * 64
        with self.assertRaisesRegex(nas_cd.DeploymentError, "diffère"):
            self.verify()

    def test_refuses_failed_incomplete_or_wrong_source_runs(self):
        for key, bad in [("conclusion", "failure"), ("status", "in_progress"),
                         ("head_sha", "d" * 40), ("event", "pull_request"),
                         ("path", ".github/workflows/other.yml"), ("head_branch", "feature"),
                         ("head_repository", {"full_name": "attacker/fork"}), ("run_attempt", 2)]:
            with self.subTest(key=key), self.assertRaises(nas_cd.DeploymentError):
                with patch.dict(self.run, {key: bad}):
                    self.verify()

    def test_refuses_changed_or_extra_workflows(self):
        with patch.dict(self.config["trusted_workflows"], {self.publisher: "f" * 64}):
            with self.assertRaisesRegex(nas_cd.DeploymentError, "non approuvé"):
                self.verify()
        self.run["referenced_workflows"].append({"path": "sam/extra/.github/workflows/ci.yml@" + self.commit,
                                                 "sha": self.commit})
        with self.assertRaisesRegex(nas_cd.DeploymentError, "liste"):
            self.verify()

    def test_refuses_expired_corrupt_or_unrelated_artifacts(self):
        for change in ({"expired": True}, {"digest": "sha256:" + "0" * 64},
                       {"size_in_bytes": nas_cd.MAX_JSON + 1},
                       {"workflow_run": {"id": 123}}, {"name": "nas-manifest-2"}):
            self.artifact_changes = change
            with self.subTest(change=change), self.assertRaises(nas_cd.DeploymentError):
                self.verify()

    def test_archive_paths_are_never_extracted_or_accepted(self):
        self.filename = "../nas-release.json"
        with self.assertRaisesRegex(nas_cd.DeploymentError, "archive"):
            self.verify()

    def test_legacy_unsigned_manifest_is_refused(self):
        self.manifest["version"] = 1
        with self.assertRaises(nas_cd.DeploymentError):
            nas_cd.validate_manifest(self.manifest, self.config, self.commit)

    def test_cached_proof_only_survives_unchanged_local_policy(self):
        release = {"id": 9, "tag_name": "nas-" + self.commit, "published_at": "2026-11-19T10:00:00Z",
                   "draft": False, "prerelease": False,
                   "assets": [{"id": 25, "name": "nas-release.json", "state": "uploaded"}]}
        cached = {key: release[key] for key in ("id", "tag_name", "published_at")}
        cached.update(images=self.manifest["images"], verification={"policy": nas_cd.policy_digest(self.config)})
        with patch.object(nas_cd, "github_json", return_value=[release]) as api:
            self.assertEqual(nas_cd.latest_release(self.config, (cached,)), cached)
            self.assertEqual(api.call_count, 1)
        self.config["trusted_workflows"][self.publisher] = "0" * 64
        with patch.object(nas_cd, "github_json", side_effect=[[release], self.manifest]), \
                patch.object(nas_cd, "verify_publication", side_effect=nas_cd.DeploymentError("reverification")):
            with self.assertRaisesRegex(nas_cd.DeploymentError, "reverification"):
                nas_cd.latest_release(self.config, (cached,))

    def test_missing_approval_fails_configuration(self):
        config = {**self.config, "compose_file": "/tmp/compose.yaml", "probes": ["http://127.0.0.1/"]}
        config.pop("trusted_workflows")
        with self.assertRaisesRegex(nas_cd.DeploymentError, "empreintes"):
            nas_cd.validate("calendar", config)


if __name__ == "__main__":
    unittest.main()
