#!/usr/bin/env python3
"""Controlled first Stamp delivery from the explicitly approved rehearsal branch."""
import argparse
import fcntl
import grp
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import sys
from tempfile import mkdtemp
from urllib.error import HTTPError, URLError
from uuid import uuid4

CD_SHA = '6a5d9f8eac3636566188b82c5d5ada8eff1da614b8a6daaaec7db11cbd5b3b20'
RECIPE_SHA = '99c0536f6fd68bc29db44c3dc9b292334d0116a1cfdad638bc9d605b50828aab'
CI_SHA = '94aa2732e62a6e8bc35da9dc9d7d61f11e596098719a59284547f3676defc84b'
PUBLISHER_SHA = '63db3a8c657d4f1c898cfb7ab6573c188b3c791606dfc9e5d05b9aaabe72e0c8'


def load_verified(name, path, digest):
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Version non approuvée : ' + path.name)
    spec = importlib.util.spec_from_file_location(name, str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def assert_compose_trusted(file):
    for path in (file, file.parent, file.parent.parent):
        info = path.stat()
        if info.st_mode & 0o022:
            raise RuntimeError('Le Compose et ses dossiers doivent interdire les écritures groupe/autres.')
        if info.st_uid:
            try:
                owner = pwd.getpwuid(info.st_uid)
                admin_gid = grp.getgrnam('administrators').gr_gid
                trusted = admin_gid in os.getgrouplist(owner.pw_name, owner.pw_gid)
            except KeyError:
                trusted = False
            if not trusted:
                raise RuntimeError('Propriétaire non administrateur du Compose/dossier : UID ' + str(info.st_uid))


def check_receipt(base, path):
    if path.is_symlink() or path.resolve().parent != base.resolve():
        raise RuntimeError('Le reçu de recette doit être dans le dossier administrateur CD.')
    info = path.stat()
    if info.st_uid != 0 or info.st_mode & 0o077:
        raise RuntimeError('Le reçu de recette doit être privé et appartenir à root.')
    receipt = json.loads(path.read_text())
    checks = [receipt.get('completed'), receipt.get('production_containers_unchanged')]
    checks += [receipt.get('sqlite', {}).get(key) for key in
               ('consistent_copy', 'pending_migration_refused', 'copy_unchanged')]
    checks += [receipt.get('rollback', {}).get(key) for key in
               ('probe_failure_rollback', 'rejected_not_retried')]
    if any(value is not True for value in checks):
        raise RuntimeError('La recette NAS SQLite/rollback doit être réussie avant cette livraison.')


def guard_candidate(recipe, backup, backend, source, image):
    # Read migrations from a never-started candidate container, not production.
    name = 'cd46-candidate-migrations-' + uuid4().hex[:12]
    try:
        container = recipe.docker('create', '--name', name, '--network', 'none',
                                  '--entrypoint', 'node', image, '--version').stdout.strip()
        return recipe.sqlite_check(backup, {**backend, 'Id': container, 'Image': image}, source)
    finally:
        recipe.docker('rm', '-f', '-v', name, check=False)


def rollback_only(base, backup, cd):
    if backup.is_symlink() or backup.resolve().parent != base.resolve():
        raise RuntimeError('Dossier de sauvegarde hors de la racine CD.')
    info = backup.stat()
    if info.st_uid != 0 or info.st_mode & 0o077:
        raise RuntimeError('Sauvegarde privée root requise.')
    transaction = json.loads((backup / 'transaction.json').read_text())
    name, settings = transaction['project'], transaction['settings']
    candidate, previous = transaction['candidate'], transaction['previous']
    cd.validate(name, settings)
    config = json.loads((base / 'projects.json').read_text())
    staged = {**settings, 'enabled': False, 'controlled_release': candidate['tag_name']}
    if config['projects'].get(name) != staged:
        raise RuntimeError('Le projet n’est plus dans cette livraison suspendue. Ne pas rétablir automatiquement.')
    if hashlib.sha256(Path(settings['compose_file']).read_bytes()).hexdigest() != transaction['compose_sha256']:
        raise RuntimeError('Le Compose a changé. Vérification manuelle requise.')
    if os.geteuid() == 0:
        assert_compose_trusted(Path(settings['compose_file']))
    state = base / 'state' / name
    with (state / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        project = cd.Project(name, settings, config['compose_command'], state)
        known = (project.expected_image_ids(previous['images']), project.expected_image_ids(candidate['images']))
        if any(not any(images.get(service) == image for images in known)
               for service, image in project.current_image_ids().items()):
            raise RuntimeError('Une autre image est active. Ne pas écraser cette intervention.')
        recovery = {'active': previous, 'pending': candidate, 'rejected': None}
        cd.save_json(project.state_file, recovery)
        project.recover(recovery)
        print('Ancienne version rétablie. Stamp reste suspendu dans la CD pour vérification.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend-container')
    parser.add_argument('--frontend-container')
    parser.add_argument('--compose-sha256')
    parser.add_argument('--release-commit')
    parser.add_argument('--recipe-receipt', type=Path)
    parser.add_argument('--rollback-backup', type=Path)
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('Exécuter en root sur le NAS.')
    os.umask(0o077)
    base = Path('/volume1/docker/nas-cd')
    os.environ['PATH'] = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
    os.environ['DOCKER_CONFIG'] = str(base / 'credentials/docker')
    cd = load_verified('nas_cd_controlled', base / 'nas_cd.py', CD_SHA)
    if args.rollback_backup:
        rollback_only(base, args.rollback_backup, cd)
        return
    if not all((args.backend_container, args.frontend_container, args.recipe_receipt)):
        parser.error('Conteneurs et reçu de recette obligatoires pour une livraison.')
    if (not re.fullmatch('[a-f0-9]{40}', args.release_commit or '')
        or not re.fullmatch('[a-f0-9]{64}', args.compose_sha256 or '')):
        parser.error('Commit ou empreinte invalide.')
    check_receipt(base, args.recipe_receipt)
    recipe = load_verified('nas_recipe_controlled', base / 'recette-nas-cd46.py', RECIPE_SHA)
    deliver(base, args, cd, recipe)


def deliver(base, args, cd, recipe):
    backend, frontend, source = recipe.require_production(args.backend_container, args.frontend_container)
    labels = backend['Config']['Labels']
    name = labels['com.docker.compose.project']
    file = Path(labels.get('com.docker.compose.project.config_files', ''))
    if not file.is_absolute() or not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != args.compose_sha256:
        raise RuntimeError('Le Compose actif ne correspond pas au fichier relu. Aucune bascule effectuée.')
    if os.geteuid() == 0:
        assert_compose_trusted(file)
    config_file = base / 'projects.json'
    config = json.loads(config_file.read_text())
    if name in config['projects']:
        raise RuntimeError('Ce projet est déjà déclaré. Ne pas remplacer sa configuration automatiquement.')
    bindings = frontend['HostConfig'].get('PortBindings', {}).get('80/tcp', [])
    if len(bindings) != 1 or not bindings[0]['HostPort'].isdigit() or not 1 <= int(bindings[0]['HostPort']) <= 65535:
        raise RuntimeError('Port HTTP du frontend inattendu.')
    port = bindings[0]['HostPort']
    settings = {
        'enabled': True, 'repository': 'SamBzd/Stamp-app',
        'github_token_file': str(base / 'credentials/github-read'),
        'compose_file': str(file), 'compose_version': '2.4', 'require_existing': True,
        'release_workflow': '.github/workflows/ci.yml', 'release_branch': 'codex/nas-cd',
        'trusted_workflows': {'SamBzd/Stamp-app/.github/workflows/ci.yml': CI_SHA,
                              'SamBzd/Stamp-app/.github/workflows/nas-publish.yml': PUBLISHER_SHA},
        'images': {'backend': 'ghcr.io/sambzd/stamp-app-backend',
                   'frontend': 'ghcr.io/sambzd/stamp-app-frontend'},
        'preflight': {'service': 'backend', 'entrypoint': 'node',
                      'args': ['scripts/migrate-db.js', '--require-current']},
        'probes': ['http://127.0.0.1:' + port + '/', 'http://127.0.0.1:' + port + '/api/health'],
    }
    cd.validate(name, settings)
    candidate = cd.latest_release(settings)
    if not candidate or candidate['tag_name'] != 'nas-' + args.release_commit:
        raise RuntimeError('La dernière release Stamp ne correspond pas à la recette attendue.')
    state = base / 'state' / name
    state.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (state / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        project = cd.Project(name, settings, config['compose_command'], state)
        if project.compose_services() != {'backend', 'frontend'}:
            raise RuntimeError('Services Compose inattendus.')
        project.wait_healthy({'backend': backend['Image'], 'frontend': frontend['Image']})
        backup = Path(mkdtemp(prefix='stamp-before-cd46-', dir=str(base)))
        print('Sauvegarde privée conservée : ' + str(backup), flush=True)
        shutil.copyfile(config_file, backup / 'projects.before.json')
        shutil.copyfile(file, backup / 'compose.before.yaml')
        cd.save_json(backup / 'candidate.json', candidate)
        for image in candidate['images'].values():
            cd.run(['docker', 'pull', image], timeout=900)
        # The copy and both guard passes now use the genuine published candidate image.
        guards = guard_candidate(recipe, backup, backend, source, candidate['images']['backend'])
        if [recipe.fingerprint(recipe.inspect(args.backend_container)),
            recipe.fingerprint(recipe.inspect(args.frontend_container))] != [recipe.fingerprint(backend), recipe.fingerprint(frontend)]:
            raise RuntimeError('La production a changé pendant le précontrôle. Aucune bascule effectuée.')
        if project.state_file.exists():
            previous_state = json.loads(project.state_file.read_text())
            if previous_state.get('pending') or not previous_state.get('active'):
                raise RuntimeError('Livraison précédente inachevée. Récupérer son état avant de poursuivre.')
            previous = previous_state['active']
        else:
            previous = project.bootstrap()
            previous_state = {'active': previous, 'pending': None, 'rejected': None}
            project.write_images(project.override, previous['images'])
            cd.save_json(project.state_file, previous_state)
        project.wait_healthy(previous['images'])
        cd.save_json(backup / 'previous-state.json', previous_state)
        cd.save_json(backup / 'transaction.json', {'project': name, 'settings': settings,
                     'candidate': candidate, 'previous': previous, 'compose_sha256': args.compose_sha256})
        # Stage a durable but DISABLED registration. A crash before commit must
        # never permit the scheduler to perform a first deployment on its own.
        staged = {**settings, 'enabled': False, 'controlled_release': candidate['tag_name']}
        fresh = json.loads(config_file.read_text())
        if name in fresh['projects']:
            raise RuntimeError('Le projet a été déclaré pendant le précontrôle. Vérification requise.')
        fresh['projects'][name] = staged
        cd.save_json(config_file, fresh)
        original_reader = cd.latest_release
        try:
            # Pin this controlled delivery to the release already authenticated above.
            cd.latest_release = lambda *_: candidate
            project.deploy(False)
            project.wait_healthy(candidate['images'])
            actual = json.loads(project.state_file.read_text())
            if actual.get('pending') or actual['active']['id'] != candidate['id']:
                raise RuntimeError('La release attendue n’est pas active.')
            new_backend = recipe.inspect(args.backend_container)
            data_mounts = [m for m in new_backend['Mounts'] if m['Destination'] == '/data']
            if len(data_mounts) != 1 or data_mounts[0]['Source'] != source:
                raise RuntimeError('Le montage SQLite actif diffère de celui prévu. Vérification requise.')
            cd.save_json(backup / 'result.json', {'release': candidate['tag_name'], 'sqlite_guard': guards,
                         'delivery_checks_passed': True, 'data_mount_preserved': True})
            fresh = json.loads(config_file.read_text())
            if fresh['projects'].get(name) != staged:
                raise RuntimeError('La configuration suspendue a changé. Vérification requise.')
            fresh['projects'][name] = settings
            cd.save_json(config_file, fresh)  # Commit point: all delivery checks have passed.
        except BaseException:
            try:
                fresh = json.loads(config_file.read_text())
                if fresh['projects'].get(name) in (settings, staged):
                    fresh['projects'][name] = staged
                    cd.save_json(config_file, fresh)
                current = json.loads(project.state_file.read_text())
                if (current.get('pending') or current.get('active', {}).get('id') == candidate['id']
                    or project.current_image_ids() != project.expected_image_ids(previous['images'])):
                    recovery = {'active': previous, 'pending': candidate, 'rejected': None}
                    cd.save_json(project.state_file, recovery)
                    project.recover(recovery)
            except Exception:
                print('Récupération/configuration à vérifier. Reprise manuelle : --rollback-backup ' + str(backup), file=sys.stderr)
            raise
        finally:
            cd.latest_release = original_reader
        print('STAMP APP : première livraison contrôlée réussie et projet raccordé à la tâche DSM.')
        print('Release active : ' + candidate['tag_name'])
        print('Canal provisoire : branche codex/nas-cd ; transition vers main à faire après fusion.')


if __name__ == '__main__':
    try:
        main()
    except HTTPError as error:
        raise SystemExit('Requête GitHub en échec (%d). Aucune URL authentifiée affichée.' % error.code)
    except URLError:
        raise SystemExit('Connexion GitHub indisponible.')
