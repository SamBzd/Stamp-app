#!/usr/bin/env python3
"""Install a GitHub release into a locally configured Docker Compose project."""

import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from tempfile import NamedTemporaryFile
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

NAME = re.compile(r"[a-z0-9][a-z0-9_-]*")
REPO = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
IMAGE_REPOSITORY = re.compile(r"ghcr\.io/[a-z0-9_.-]+(?:/[a-z0-9_.-]+)+")
DIGEST = re.compile(r"sha256:[a-f0-9]{64}")
RELEASE_TAG = re.compile(r"nas-([a-f0-9]{40})")
MANIFEST_NAME = "nas-release.json"
GITHUB = "https://api.github.com"


class DeploymentError(RuntimeError):
    pass


class GitHubRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not newurl.startswith("https://"):
            raise DeploymentError("Redirection GitHub sans HTTPS.")
        # Authorization is an unredirected header, even for asset downloads.
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def github_json(path, token, accept="application/vnd.github+json"):
    request = Request(GITHUB + path, headers={
        "Accept": accept,
        "User-Agent": "nas-compose-cd",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    if token:
        request.add_unredirected_header("Authorization", "Bearer " + token)
    with build_opener(GitHubRedirect()).open(request, timeout=20) as response:
        return json.load(response)


def latest_release(config):
    token_file = config.get("github_token_file")
    token = Path(token_file).read_text().strip() if token_file else None
    releases_path = "/repos/" + config["repository"] + "/releases"
    # Filter on the CD tag and manifest, so ordinary releases can coexist.
    releases = github_json(releases_path + "?per_page=100", token)
    candidates = []
    for release in releases:
        if release["draft"] or release["prerelease"] or not release["published_at"]:
            continue
        if not RELEASE_TAG.fullmatch(release["tag_name"]):
            continue
        for asset in release["assets"]:
            if asset["name"] == MANIFEST_NAME and asset["state"] == "uploaded":
                candidates.append((release, asset["id"]))
    if not candidates:
        return None
    release, asset_id = max(candidates, key=lambda item: release_order(item[0]))
    commit = RELEASE_TAG.fullmatch(release["tag_name"]).group(1)
    manifest = github_json(
        releases_path + "/assets/" + str(asset_id), token, "application/octet-stream"
    )
    return {
        "id": release["id"],
        "tag_name": release["tag_name"],
        "published_at": release["published_at"],
        "images": validate_manifest(manifest, config, commit),
    }


def release_order(release):
    return release["published_at"], release["id"]


def validate_manifest(manifest, config, commit):
    if (
        manifest.get("version") != 1
        or manifest.get("repository", "").lower() != config["repository"].lower()
        or manifest.get("commit") != commit
    ):
        raise DeploymentError("Le manifeste ne correspond pas à la release attendue.")
    images = manifest.get("images", {})
    if not isinstance(images, dict) or images.keys() != config["images"].keys():
        raise DeploymentError("Les services du manifeste diffèrent de la configuration locale.")
    for service, repository in config["images"].items():
        value = images[service]
        if not isinstance(value, str):
            raise DeploymentError(f"Référence d’image invalide pour {service}.")
        name, _, digest = value.partition("@")
        if name != repository or not DIGEST.fullmatch(digest):
            raise DeploymentError(f"Image absente, non épinglée ou non autorisée pour {service}.")
    return images


def run(command, cwd=None, capture=False, timeout=300):
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            timeout=timeout,
            check=True,
            stdout=subprocess.PIPE if capture else None,
            text=True,
        ).stdout
    except subprocess.CalledProcessError as error:
        raise DeploymentError(f"Commande en échec ({error.returncode}) : {' '.join(command)}") from None
    except subprocess.TimeoutExpired:
        raise DeploymentError(f"Délai dépassé : {' '.join(command)}") from None


def save_json(path, value):
    with NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
        try:
            json.dump(value, temporary, indent=2)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
            os.replace(temporary_path, path)
            directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            if temporary_path.exists():
                temporary_path.unlink()


class Project:
    def __init__(self, name, config, command, directory):
        self.name = name
        self.config = config
        self.services = list(config["images"])
        self.file = Path(config["compose_file"]).resolve(strict=True)
        self.state_file = directory / "state.json"
        self.override = directory / "images.compose.json"
        self.candidate_override = directory / "candidate.compose.json"
        self.command = command + ["-p", name, "-f", str(self.file)]

    def compose(self, *args, images_file=None, capture=False):
        command = self.command
        if images_file:
            command = command + ["-f", str(images_file)]
        return run(command + list(args), cwd=self.file.parent, capture=capture)

    def compose_services(self):
        return set(self.compose("config", "--services", capture=True).splitlines())

    def current_image_ids(self):
        images = {}
        for service in self.services:
            containers = self.compose("ps", "-q", service, capture=True).split()
            for container in containers:
                running, image = run(
                    ["docker", "inspect", "--format", "{{.State.Running}} {{.Image}}", container],
                    capture=True,
                ).split()
                if running == "true":
                    if service in images:
                        raise DeploymentError(f"Plusieurs conteneurs actifs pour {service}.")
                    images[service] = image
        return images

    def bootstrap(self):
        """Pin the images of an already-running project before adopting it."""
        previous = self.current_image_ids()
        if not previous and not self.config.get("require_existing", False):
            return None
        if previous.keys() != self.config["images"].keys():
            raise DeploymentError("Tous les services déclarés doivent être actifs avant la reprise.")
        self.check_probes()
        images = {}
        for service, image_id in previous.items():
            local_tag = f"nas-cd-local/{self.name}/{service}:initial"
            run(["docker", "image", "tag", image_id, local_tag])
            images[service] = local_tag
        return {"id": 0, "published_at": "", "tag_name": "initial", "images": images}

    def write_images(self, path, images):
        override = {"services": {
            service: {"image": image} for service, image in images.items()
        }}
        version = self.config.get("compose_version")
        if version:
            override["version"] = version
        save_json(path, override)

    def expected_image_ids(self, images):
        return {
            service: run(
                ["docker", "image", "inspect", "--format", "{{.Id}}", image], capture=True
            ).strip()
            for service, image in images.items()
        }

    def check_probes(self):
        opener = build_opener(NoRedirect())
        for url in self.config["probes"]:
            with opener.open(url, timeout=5) as response:
                if not 200 <= response.status < 300:
                    raise DeploymentError(f"Sonde en échec : {url} (HTTP {response.status}).")

    def wait_healthy(self, images):
        expected = self.expected_image_ids(images)
        deadline = time.monotonic() + self.config.get("health_timeout", 60)
        while True:
            try:
                if self.current_image_ids() != expected:
                    raise DeploymentError("Les conteneurs actifs ne correspondent pas aux images attendues.")
                self.check_probes()
                return
            except (DeploymentError, OSError) as error:
                if time.monotonic() >= deadline:
                    raise DeploymentError(f"Sondes de santé en échec : {error}") from None
                time.sleep(2)

    def activate(self, images):
        self.write_images(self.override, images)
        self.compose("up", "-d", "--no-build", "--force-recreate", *self.services, images_file=self.override)
        self.wait_healthy(images)

    def recover(self, state):
        pending = state["pending"]
        active = state["active"]
        if active:
            self.activate(active["images"])
            print(f"[{self.name}] Version précédente rétablie : {active['tag_name']}.", flush=True)
        else:
            self.write_images(self.override, pending["images"])
            self.compose("stop", *self.services, images_file=self.override)
            self.override.unlink(missing_ok=True)
            print(f"[{self.name}] Première livraison arrêtée.", flush=True)
        state["rejected"] = pending
        state["pending"] = None
        save_json(self.state_file, state)

    def deploy(self, retry):
        state = json.loads(self.state_file.read_text()) if self.state_file.exists() else {
            "active": None, "pending": None, "rejected": None
        }
        if not set(self.services) <= self.compose_services():
            raise DeploymentError("Un service déclaré est absent du fichier Compose.")
        if state["pending"]:
            self.recover(state)

        candidate = latest_release(self.config)
        if not candidate:
            return
        active = state["active"]
        rejected = state["rejected"]
        if active and release_order(candidate) <= release_order(active):
            return
        if rejected and release_order(candidate) <= release_order(rejected):
            if not retry or candidate["id"] != rejected["id"]:
                return
        if active is None and not self.state_file.exists():
            active = state["active"] = self.bootstrap()
            if active:
                self.write_images(self.override, active["images"])
            save_json(self.state_file, state)
        elif active and self.current_image_ids() != self.expected_image_ids(active["images"]):
            raise DeploymentError("La version active diffère de l’état enregistré. Vérifier le projet local.")

        print(f"[{self.name}] Préparation de {candidate['tag_name']}.", flush=True)
        for image in candidate["images"].values():
            run(["docker", "pull", image], timeout=900)
        preflight = self.config.get("preflight")
        if preflight:
            try:
                self.write_images(self.candidate_override, candidate["images"])
                self.compose(
                    "run", "--rm", "--no-deps", "-T", "--entrypoint", preflight["entrypoint"],
                    preflight["service"], *preflight["args"], images_file=self.candidate_override,
                )
            except DeploymentError:
                state["rejected"] = candidate
                save_json(self.state_file, state)
                raise DeploymentError("Contrôle de compatibilité en échec avant bascule.") from None
            finally:
                self.candidate_override.unlink(missing_ok=True)

        # A manually installed candidate can be adopted without restarting it.
        if active and self.current_image_ids() == self.expected_image_ids(candidate["images"]):
            self.check_probes()
            self.write_images(self.override, candidate["images"])
            state.update(active=candidate, rejected=None)
            save_json(self.state_file, state)
            print(f"[{self.name}] Release déjà en service : {candidate['tag_name']}.", flush=True)
            return

        # Record the active and candidate images before Compose can change anything.
        state["pending"] = candidate
        save_json(self.state_file, state)
        try:
            self.activate(candidate["images"])
        except (DeploymentError, OSError) as error:
            print(f"[{self.name}] Échec de la bascule : {error}", file=sys.stderr, flush=True)
            self.recover(state)
            raise DeploymentError("Release rejetée après bascule.") from None
        state.update(active=candidate, pending=None, rejected=None)
        save_json(self.state_file, state)
        print(f"[{self.name}] Release active : {candidate['tag_name']}.", flush=True)


def validate(name, config):
    if not NAME.fullmatch(name) or not REPO.fullmatch(config["repository"]):
        raise DeploymentError("Nom de projet Compose ou dépôt GitHub invalide.")
    if not Path(config["compose_file"]).is_absolute():
        raise DeploymentError("Le chemin du fichier Compose doit être absolu.")
    images = config["images"]
    if not images or not all(NAME.fullmatch(service) and IMAGE_REPOSITORY.fullmatch(repo)
                             for service, repo in images.items()):
        raise DeploymentError("La liste des services et dépôts d’images GHCR est invalide.")
    probes = config["probes"]
    if not probes or not all(url.startswith(("http://", "https://")) for url in probes):
        raise DeploymentError("Au moins une sonde HTTP est requise.")
    preflight = config.get("preflight")
    if preflight and preflight["service"] not in images:
        raise DeploymentError("Le service du contrôle de compatibilité ne fait pas partie de la release.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path)
    parser.add_argument("--state-dir", required=True, type=Path)
    parser.add_argument("--project")
    parser.add_argument("--retry", action="store_true")
    args = parser.parse_args()
    if args.retry and not args.project:
        parser.error("--retry exige --project.")
    config = json.loads(args.config.read_text())
    projects = config["projects"]
    if args.project and args.project not in projects:
        parser.error("Projet absent de la configuration.")
    command = config["compose_command"]
    if not isinstance(command, list) or not command or not all(
        isinstance(part, str) and part for part in command
    ):
        parser.error("compose_command doit être une liste contenant la commande Compose.")

    failures = 0
    for name, settings in projects.items():
        if args.project and name != args.project:
            continue
        try:
            if not settings.get("enabled", True):
                continue
            validate(name, settings)
            directory = args.state_dir / name
            directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            with (directory / "lock").open("a") as lock:
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    continue
                Project(name, settings, command, directory).deploy(args.retry)
        except (DeploymentError, OSError, ValueError, KeyError, TypeError, AttributeError) as error:
            # urllib errors can contain signed asset URLs. Report their status only.
            if isinstance(error, HTTPError):
                error = f"requête HTTP en échec ({error.code})"
            elif isinstance(error, URLError):
                error = "connexion HTTP indisponible"
            print(f"[{name}] {error}", file=sys.stderr, flush=True)
            failures += 1
    return int(failures > 0)


if __name__ == "__main__":
    sys.exit(main())
