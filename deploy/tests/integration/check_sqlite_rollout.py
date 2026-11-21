#!/usr/bin/env python3
"""Real Docker/SQLite rollout and failure injection; synthetic data only."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
from urllib.request import Request, urlopen
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import nas_cd
from sqlite_cd import SqliteMaintenance

BACKEND = 'codex-stamp-cd-backend:local'
OLD = 'codex-stamp-cd-backend-v4:local'
FRONTEND = 'codex-stamp-cd-frontend:local'


def execute(*args):
    return subprocess.check_output(args, text=True).strip()


def main():
    assert os.geteuid() in (0, 1000), 'Exécuter la recette avec UID 1000 ou sudo'
    with TemporaryDirectory(prefix='stamp-cd-integration-') as temporary:
        root = Path(temporary)
        (root / 'Dockerfile').write_text('FROM ' + BACKEND + '\nRUN rm /app/db/migrations/0005_papiers_collection.sql\n')
        subprocess.run(['docker', 'build', '-t', OLD, str(root)], check=True)
        for failure in (None, 'health', 'interrupted', 'after-opening'):
            run_case(root, failure)
    print('DOCKER_SQLITE_OK : succès, rollback santé, reprise avant commit et préservation des nouvelles saisies')


def run_case(root, failure):
    name = 'stamp-cd-test-' + uuid4().hex[:10]
    directory = root / name
    directory.mkdir(mode=0o700)
    data = directory / 'db'
    data.mkdir(mode=0o700)
    if os.geteuid() == 0: os.chown(data, 1000, 1000)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    compose = directory / 'compose.json'
    compose.write_text(json.dumps({'services': {
        'backend': {'image': OLD, 'environment': {'STAMP_DB_PATH': '/data/app.db'},
            'volumes': [str(data) + ':/data'], 'restart': 'unless-stopped'},
        'frontend': {'image': FRONTEND, 'ports': ['127.0.0.1:%d:80' % port],
            'depends_on': ['backend'], 'restart': 'unless-stopped'}
    }}))
    config = {'compose_file': str(compose), 'images': {'backend': 'unused', 'frontend': 'unused'},
        'probes': ['http://127.0.0.1:%d/' % port, 'http://127.0.0.1:%d/api/health' % port],
        'health_timeout': 15,
        'sqlite_migrations': {'service': 'backend', 'database_path': '/data/app.db'}}
    state_dir = directory / 'state'
    state_dir.mkdir(mode=0o700)
    project = nas_cd.Project(name, config, ['docker', 'compose'], state_dir)
    previous = {'tag_name': 'v4-test', 'images': {'backend': OLD, 'frontend': FRONTEND}}
    candidate = {'tag_name': 'v5-test', 'images': {'backend': BACKEND, 'frontend': FRONTEND}}
    state = {'active': previous, 'pending': None, 'rejected': None}
    nas_cd.save_json(project.state_file, state)
    engine = SqliteMaintenance(project, nas_cd.run, nas_cd.save_json, nas_cd.DeploymentError)
    try:
        # Créer v4 uniquement sur la base de recette jetable.
        initialize = """const D=require('better-sqlite3'); const {applyMigrations}=require('./src/db/migrations');
        const db=new D('/data/app.db'); applyMigrations(db,{targetVersion:4});
        db.exec("INSERT INTO clients(nom,prenom) VALUES ('Recette','Synthétique')"); db.close();"""
        execute('docker', 'run', '--rm', '--network', 'none', '--mount',
            'type=bind,src=' + str(data) + ',dst=/data', '--entrypoint', 'node', BACKEND, '-e', initialize)
        project.activate(previous['images'])
        if failure == 'health':
            original = project.check_probes
            def check():
                if project.current_image_ids() == project.expected_image_ids(candidate['images']):
                    raise nas_cd.DeploymentError('Sonde candidate en échec')
                original()
            project.check_probes = check
        elif failure == 'interrupted':
            original = engine.record
            def record(state, phase):
                original(state, phase)
                if phase == 'migrated': raise KeyboardInterrupt()
            engine.record = record
        elif failure == 'after-opening':
            original = engine.helper
            def helper(transaction, command, *args, **kwargs):
                result = original(transaction, command, *args, **kwargs)
                if command == 'gate-off':
                    engine.helper = original
                    raise OSError('Coupure après réouverture des saisies')
                return result
            engine.helper = helper
        try:
            engine.deploy(state, candidate)
            assert failure is None
        except (nas_cd.DeploymentError, KeyboardInterrupt, OSError):
            assert failure is not None
        persisted = json.loads(project.state_file.read_text())
        if failure == 'after-opening':
            request = Request('http://127.0.0.1:%d/api/clients' % port,
                data=json.dumps({'nom': 'Après', 'prenom': 'Ouverture'}).encode(),
                headers={'Content-Type': 'application/json'}, method='POST')
            with urlopen(request) as response: assert response.status == 201
        if failure in ('interrupted', 'after-opening'):
            if failure == 'interrupted':
                # Une coupure de Compose peut survenir entre suppression et création.
                removed = project.compose('ps', '--all', '-q', 'backend', capture=True).split()
                for container in removed: execute('docker', 'rm', '-f', container)
            SqliteMaintenance(project, nas_cd.run, nas_cd.save_json, nas_cd.DeploymentError).recover(persisted)
        final = json.loads(project.state_file.read_text())
        assert final.get('maintenance') is None
        wanted = previous if failure in ('health', 'interrupted') else candidate
        assert final['active'] == wanted
        assert project.current_image_ids() == project.expected_image_ids(wanted['images'])
        rows = json.loads(execute('docker', 'exec', engine.containers()['backend']['Id'],
            'node', '-e', "const D=require('better-sqlite3');const db=new D('/data/app.db',{readonly:true});console.log(JSON.stringify({version:db.prepare('SELECT max(version) v FROM schema_migrations').get().v,clients:db.prepare('SELECT count(*) n FROM clients').get().n,integrity:db.pragma('integrity_check',{simple:true})}));db.close();"))
        assert rows['version'] == (4 if wanted == previous else 5)
        assert rows['clients'] == (2 if failure == 'after-opening' else 1)
        assert rows['integrity'] == 'ok'
        assert not (data / '.stamp-maintenance').exists()
        print('DOCKER_CASE_OK', failure or 'success', flush=True)
    finally:
        project.compose('down', '--volumes', '--remove-orphans')
        # Les sauvegardes sont privées root/1000 selon l'UID de Docker.
        if os.geteuid() != 0:
            subprocess.run(['docker', 'run', '--rm', '--user', '0:0', '--network', 'none',
                '--mount', 'type=bind,src=' + str(directory) + ',dst=/cleanup',
                '--entrypoint', 'sh', BACKEND, '-c', 'chown -R 1000:1000 /cleanup'], check=True)


if __name__ == '__main__':
    main()
