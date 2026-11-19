#!/usr/bin/env python3
"""Run isolated CD checks on the NAS, without reconfiguring live applications."""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
from tempfile import mkdtemp
from threading import Thread
import urllib.request
from uuid import uuid4

CD_SHA = '6a5d9f8eac3636566188b82c5d5ada8eff1da614b8a6daaaec7db11cbd5b3b20'
CLI_SHA = '06246dca8ac26856f54a04d2d9b7f11dd04feeddf629380ffde58d1995303d3d'
CLI_URL = ('https://raw.githubusercontent.com/SamBzd/Stamp-app/'
           '61928f728b5bd99289e0e643b0590378007e4460/backend/scripts/migrate-db.js')
PREVIOUS_WEB = ('ghcr.io/sambzd/calendrier-avent-maman-2026-web@sha256:'
                '6a46e80575f92e79a47bf4ff16114c57ffb6f49fee52e0ab3c971a8904aa37e3')
EXPECTED_TAG = 'nas-c704957f5c4e32e3cccbe87e9768d54e2a127c98'
DOCKER = '/usr/local/bin/docker'


def execute(args, check=True):
    return subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          universal_newlines=True, timeout=240, check=check)


def docker(*args, check=True):
    return execute([DOCKER, *args], check=check)


def inspect(name):
    return json.loads(docker('inspect', name).stdout)[0]


def fingerprint(item):
    return item['Id'], item['Image'], item['State']['StartedAt'], item['State']['Running']


def require_production(backend, frontend):
    b, f = inspect(backend), inspect(frontend)
    for item, service in ((b, 'backend'), (f, 'frontend')):
        labels = item['Config'].get('Labels') or {}
        if not item['State']['Running'] or labels.get('com.docker.compose.service') != service:
            raise RuntimeError('Conteneur actif ou service Compose inattendu.')
    if (b['Config']['Labels']['com.docker.compose.project'] !=
            f['Config']['Labels']['com.docker.compose.project']):
        raise RuntimeError('Les conteneurs ne partagent pas le même projet.')
    mounts = [m for m in b['Mounts'] if m['Destination'] == '/data']
    if len(mounts) != 1 or mounts[0]['Type'] != 'bind' or b['Config']['WorkingDir'] != '/app/backend':
        raise RuntimeError('Montage SQLite ou dossier du backend inattendu.')
    if 'STAMP_DB_PATH=/data/app.db' not in b['Config'].get('Env', []):
        raise RuntimeError('Chemin SQLite inattendu.')
    return b, f, mounts[0]['Source']


def sqlite_check(directory, backend, source):
    data, migrations = directory / 'data', directory / 'migrations'
    data.mkdir(mode=0o700)
    os.chown(str(data), 1000, 1000)
    migrations.mkdir(mode=0o755)
    docker('cp', backend['Id'] + ':/app/db/migrations/.', str(migrations))
    migrations.chmod(0o755)
    for file in migrations.iterdir():
        if file.is_file():
            file.chmod(0o444)
    cli = directory / 'migrate-db.js'
    with urllib.request.urlopen(CLI_URL, timeout=20) as response:
        content = response.read(128 * 1024)
    if hashlib.sha256(content).hexdigest() != CLI_SHA:
        raise RuntimeError('Empreinte du précontrôle incorrecte.')
    cli.write_bytes(content)
    cli.chmod(0o444)
    name = 'cd46-sqlite-' + uuid4().hex[:12]
    common = ['run', '--rm', '--name', name, '--network', 'none', '--read-only',
              '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
              '--entrypoint', 'node']
    try:
        # SQLite online backup reads a consistent snapshot, including the live WAL.
        snapshot = """const Database = require('better-sqlite3');
        const db = new Database('/source/app.db', {readonly:true, fileMustExist:true});
        db.backup('/data/app.db').then(() => {
          db.close();
          const copy = new Database('/data/app.db');
          copy.pragma('journal_mode = DELETE');
          if (copy.pragma('integrity_check', {simple:true}) !== 'ok') throw Error('Copie invalide');
          copy.close();
        }).catch(error => { console.error(error.message); process.exitCode=1; });"""
        docker(*common, '--mount', 'type=bind,src=' + source + ',dst=/source,readonly',
               '--mount', 'type=bind,src=' + str(data) + ',dst=/data', backend['Image'], '-e', snapshot)
        copy = data / 'app.db'
        before = hashlib.sha256(copy.read_bytes()).hexdigest()
        guard = [*common, '--env', 'STAMP_DB_PATH=/data/app.db',
                 '--mount', 'type=bind,src=' + str(data) + ',dst=/data,readonly',
                 '--mount', 'type=bind,src=' + str(migrations) + ',dst=/recette-migrations,readonly',
                 '--mount', 'type=bind,src=' + str(cli) + ',dst=/app/backend/scripts/migrate-db.js,readonly',
                 backend['Image'], 'scripts/migrate-db.js', '--require-current',
                 '--migrations-dir', '/recette-migrations']
        docker(*guard)
        versions = sorted(int(p.name[:4]) for p in migrations.glob('*.sql'))
        if not versions or versions != list(range(1, len(versions) + 1)):
            raise RuntimeError('Suite de migrations inattendue.')
        pending = migrations / ('%04d_cd46_recette.sql' % (len(versions) + 1))
        pending.write_text('CREATE TABLE cd46_recette_ne_jamais_appliquer (id INTEGER);\n')
        pending.chmod(0o444)
        result = docker(*guard, check=False)
        if result.returncode != 1 or 'requiert une migration SQLite explicite' not in result.stderr:
            raise RuntimeError('Le précontrôle ne refuse pas la migration comme attendu : ' + result.stderr)
        if hashlib.sha256(copy.read_bytes()).hexdigest() != before:
            raise RuntimeError('La copie SQLite a changé pendant le précontrôle.')
        print('SQLITE : copie cohérente, précontrôle accepté puis migration requise refusée, copie inchangée.')
        return {'consistent_copy': True, 'pending_migration_refused': True, 'copy_unchanged': True}
    finally:
        docker('rm', '-f', name, check=False)


def rollback_check(cd, directory, settings, compose_command=None):
    candidate = cd.latest_release(settings)
    if not candidate or candidate['tag_name'] != EXPECTED_TAG:
        raise RuntimeError('La release calendrier de recette n’est plus la dernière publiée.')
    name = 'cd46-rollback-' + uuid4().hex[:10]
    compose = directory / 'compose.json'
    state = directory / 'state'
    state.mkdir(mode=0o700)
    with socket.socket() as port:
        port.bind(('127.0.0.1', 0))
        web_port = port.getsockname()[1]
    service = {'image': PREVIOUS_WEB, 'ports': ['127.0.0.1:%d:8080' % web_port],
               'user': '101:101', 'read_only': True, 'cap_drop': ['ALL'],
               'security_opt': ['no-new-privileges:true'], 'mem_limit': '64m', 'cpu_shares': 128,
               'ulimits': {'nproc': {'soft': 64, 'hard': 64}},
               'tmpfs': ['/tmp:rw,noexec,nosuid,size=16m,mode=1777']}
    cd.save_json(compose, {'version': '2.4', 'services': {'web': service}})
    config = {**settings, 'compose_file': str(compose), 'compose_version': '2.4',
              'require_existing': True, 'health_timeout': 8,
              'probes': ['http://127.0.0.1:%d/' % web_port]}
    project = cd.Project(name, config, compose_command or ['/usr/local/bin/docker-compose'], state)
    cd.run(['docker', 'pull', PREVIOUS_WEB], timeout=900)
    cd.run(['docker', 'pull', candidate['images']['web']], timeout=900)
    candidate_ids = project.expected_image_ids(candidate['images'])

    class Probe(BaseHTTPRequestHandler):
        def do_GET(self):
            try:
                ready = project.current_image_ids()
                status = 503 if not ready or ready == candidate_ids else 200
            except Exception:
                status = 503
            self.send_response(status)
            self.end_headers()

        def log_message(self, *args):
            pass

    probe = HTTPServer(('127.0.0.1', 0), Probe)
    config['probes'].append('http://127.0.0.1:%d/' % probe.server_port)
    thread = Thread(target=probe.serve_forever, daemon=True)
    thread.start()
    original_reader = cd.latest_release
    try:
        project.compose('up', '-d', '--no-build', 'web')
        project.wait_healthy({'web': PREVIOUS_WEB})
        # Freeze the genuine release already fully verified above, only in this test process.
        cd.latest_release = lambda *_: candidate
        try:
            project.deploy(False)
        except cd.DeploymentError as error:
            if str(error) != 'Release rejetée après bascule.':
                raise
        else:
            raise RuntimeError('La sonde simulée n’a pas provoqué le rejet attendu.')
        result = json.loads(project.state_file.read_text())
        if result['pending'] or result['rejected']['id'] != candidate['id'] or result['active']['tag_name'] != 'initial':
            raise RuntimeError('État de récupération inattendu.')
        project.wait_healthy(result['active']['images'])
        containers = project.compose('ps', '-q', 'web', capture=True).split()
        before = [fingerprint(inspect(container)) for container in containers]
        project.deploy(False)
        after = [fingerprint(inspect(container)) for container in project.compose('ps', '-q', 'web', capture=True).split()]
        if before != after:
            raise RuntimeError('La release rejetée a été relancée.')
        print('ROLLBACK : sonde 503 sur candidat, ancienne image rétablie, second passage sans redéploiement.')
        return {'verified_release': candidate['tag_name'], 'probe_failure_rollback': True, 'rejected_not_retried': True}
    finally:
        cd.latest_release = original_reader
        try:
            project.compose('down')
        finally:
            docker('image', 'rm', 'nas-cd-local/' + name + '/web:initial', check=False)
            probe.shutdown()
            probe.server_close()
            thread.join(timeout=10)


def run_checks(cd, directory, settings, backend, frontend, source):
    before = [fingerprint(backend), fingerprint(frontend)]
    result = {'completed': False}
    receipt = directory.parent / (directory.name + '.result.json')
    try:
        result['sqlite'] = sqlite_check(directory, backend, source)
        result['rollback'] = rollback_check(cd, directory, settings)
        b, f, _ = require_production(backend['Id'], frontend['Id'])
        if [fingerprint(b), fingerprint(f)] != before:
            raise RuntimeError('La production a changé pendant la recette. Vérification manuelle requise.')
        result['production_containers_unchanged'] = True
        result['completed'] = True
        print('RECETTE NAS RÉUSSIE. Conteneurs Stamp App de production inchangés. Aucun raccordement production effectué.')
    finally:
        # Keep only non-sensitive assertions; delete the whole private fixture we created.
        try:
            cd.save_json(receipt, result)
            print('Compte rendu sans données clientes : ' + str(receipt))
        finally:
            shutil.rmtree(directory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend-container', required=True)
    parser.add_argument('--frontend-container', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('Exécuter en root sur le NAS.')
    os.umask(0o077)
    os.environ['PATH'] = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
    base = Path('/volume1/docker/nas-cd')
    os.environ['DOCKER_CONFIG'] = str(base / 'credentials/docker')
    script = base / 'nas_cd.py'
    if hashlib.sha256(script.read_bytes()).hexdigest() != CD_SHA:
        raise RuntimeError('Version du déployeur différente de la version auditée.')
    spec = importlib.util.spec_from_file_location('nas_cd_recette', str(script))
    cd = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cd)
    settings = json.loads((base / 'projects.json').read_text())['projects']['calendrier-avent-maman-2026']
    backend, frontend, source = require_production(args.backend_container, args.frontend_container)
    directory = Path(mkdtemp(prefix='recette-cd46-', dir=str(base)))
    print('Dossier privé de recette : ' + str(directory), flush=True)
    run_checks(cd, directory, settings, backend, frontend, source)


if __name__ == '__main__':
    main()
