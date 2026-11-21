"""SQLite rollout with a durable HTTP maintenance gate and paired recovery."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import uuid


def sync_directory(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


class SqliteMaintenance:
    def __init__(self, project, run, save, error):
        self.project, self.run, self.save, self.error = project, run, save, error
        self.config = project.config['sqlite_migrations']
        self.service = self.config['service']

    def inspect(self, container):
        return json.loads(self.run(['docker', 'inspect', container], capture=True))[0]

    def containers(self):
        result = {}
        for service in self.project.services:
            ids = self.project.compose('ps', '--all', '-q', service, capture=True).split()
            if len(ids) != 1:
                raise self.error('Un conteneur unique est requis par service pour migrer.')
            result[service] = self.inspect(ids[0])
        return result

    def layout(self, containers):
        backend = containers[self.service]
        if self.config['database_path'] != '/data/app.db':
            raise self.error('La migration automatique Stamp exige /data/app.db.')
        if 'STAMP_DB_PATH=/data/app.db' not in backend['Config'].get('Env', []):
            raise self.error('Le chemin SQLite du conteneur diffère de la configuration CD.')
        mounts = [m for m in backend['Mounts'] if m['Destination'] == '/data']
        if len(mounts) != 1 or mounts[0]['Type'] != 'bind' or not mounts[0]['RW']:
            raise self.error('Un bind inscriptible unique vers /data est requis pour migrer.')
        source = Path(mounts[0]['Source'])
        if source.is_symlink() or not source.is_dir() or (source / 'app.db').is_symlink():
            raise self.error('Le dossier SQLite doit être un dossier réel, sans lien symbolique.')
        return str(source.resolve(strict=True))

    def helper(self, transaction, command, *args, image=None):
        arguments = ['docker', 'run', '--rm', '--name', transaction['container'],
            '--network', 'none', '--read-only', '--user', '1000:1000',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
            '--env', 'STAMP_DB_PATH=/data/app.db',
            '--mount', 'type=bind,src=' + transaction['source'] + ',dst=/data',
            '--mount', 'type=bind,src=' + transaction['backup'] + '/data,dst=/stamp-cd-backup',
            '--entrypoint', 'node', image or transaction['candidate']['images'][self.service],
            'scripts/cd-sqlite.js', command, *args]
        return json.loads(self.run(arguments, capture=True) or '{}')

    def http_gate(self, closed):
        containers = self.containers()
        self.run(['docker', 'exec', containers[self.service]['Id'], 'node',
            'scripts/cd-sqlite.js', 'http-gate', 'closed' if closed else 'open'], capture=True)

    def record(self, state, phase):
        state['maintenance']['phase'] = phase
        self.save(self.project.state_file, state)

    def stop(self, transaction):
        # La politique Docker est persistante : une coupure du NAS ne doit pas
        # relancer les écrivains pendant la migration ou la restauration.
        ids = []
        for service in self.project.services:
            ids += self.project.compose('ps', '--all', '-q', service, capture=True).split()
        if ids:
            self.run(['docker', 'update', '--restart=no', *ids], capture=True)
        self.project.compose('stop', *self.project.services)
        for container in ids:
            if self.inspect(container)['State']['Running']:
                raise self.error('Un service est encore actif pendant la maintenance.')
        source = Path(transaction['source'])
        for container in self.run(['docker', 'ps', '-q'], capture=True).split():
            for mount in self.inspect(container)['Mounts']:
                if not mount.get('RW') or not mount.get('Source'):
                    continue
                path = Path(mount['Source']).resolve()
                if source == path or source in path.parents or path in source.parents:
                    raise self.error('Un autre conteneur peut écrire dans la base SQLite.')

    def deploy(self, state, candidate):
        if not state.get('active'):
            raise self.error('Une paire déjà en service est requise pour une migration automatique.')
        containers = self.containers()
        source = self.layout(containers)
        self.http_gate(False)  # Refuse les anciennes images sans garde HTTP.
        ticket = uuid.uuid4().hex
        directory = self.project.state_file.parent / 'backups' / ticket
        directory.mkdir(mode=0o700, parents=True)
        data = directory / 'data'
        data.mkdir(mode=0o700)
        if os.geteuid() == 0:
            os.chown(data, 1000, 1000)
        elif os.geteuid() != 1000:
            raise self.error('La maintenance exige root ou UID 1000.')
        # Synchroniser aussi les entrées des parents : fsync(before.db) seul
        # ne rend pas durable un dossier de sauvegarde nouvellement créé.
        for path in (data, directory, directory.parent, directory.parent.parent):
            sync_directory(path)
        required = 4 * sum(p.stat().st_size for p in Path(source).glob('app.db*')) + 64 * 1024 * 1024
        if any(shutil.disk_usage(path).free < required for path in (source, data)):
            raise self.error('Espace libre insuffisant pour sauvegarder et migrer SQLite.')
        transaction = {'ticket': ticket, 'phase': 'preparing', 'source': source,
            'backup': str(directory), 'container': 'stamp-cd-sqlite-' + ticket,
            'candidate': candidate, 'previous': state['active'],
            'config': self.config, 'restore_required': False,
            'compose_path': str(self.project.file),
            'compose_sha256': hashlib.sha256(self.project.file.read_bytes()).hexdigest(),
            'compose_config_sha256': hashlib.sha256(self.project.compose('config', capture=True).encode()).hexdigest()}
        self.save(directory / 'previous.json', state)
        shutil.copy2(self.project.file, directory / 'compose.before.yaml')
        state['maintenance'] = transaction
        self.record(state, 'preparing')
        try:
            self.helper(transaction, 'gate-on', ticket)
            self.http_gate(True)
            self.record(state, 'gated')
            self.stop(transaction)
            self.record(state, 'stopped')
            transaction['backup_sha256'] = self.helper(transaction, 'backup')['sha256']
            self.record(state, 'backed-up')
            result = self.helper(transaction, 'rehearse')
            if result['pending']:
                raise self.error('La copie migrée contient encore des migrations en attente.')
            transaction['restore_required'] = True
            self.record(state, 'migrating')
            self.helper(transaction, 'migrate', ticket)
            self.record(state, 'migrated')
            self.project.activate(candidate['images'])
            self.http_gate(True)
            state.update(active=candidate, pending=None, rejected=None)
            # Après ce commit, aucune restauration v4 automatique n'est permise,
            # même si l'ouverture du garde ou l'écriture suivante échoue.
            self.record(state, 'committed')
        except Exception:
            # Un save_json peut avoir remplacé le fichier avant une erreur fsync.
            # Relire le disque avant de décider si restaurer reste autorisé.
            persisted = json.loads(self.project.state_file.read_text())
            if persisted.get('maintenance', {}).get('phase') == 'committed':
                self.finish(persisted)
                return
            self.rollback(persisted)
            raise self.error('Release rejetée ; base et images précédentes restaurées.') from None
        self.finish(state)

    def finish(self, state):
        transaction = state['maintenance']
        images = state['active']['images']
        if self.project.current_image_ids() != self.project.expected_image_ids(images):
            self.project.activate(images)
        else:
            self.project.check_probes()
        self.helper(transaction, 'gate-off', transaction['ticket'])
        state['maintenance'] = None
        self.save(self.project.state_file, state)
        print(f'[{self.project.name}] Maintenance SQLite terminée : {state["active"]["tag_name"]}.', flush=True)

    def rollback(self, state):
        transaction = state['maintenance']
        self.record(state, 'rolling-back')
        self.helper(transaction, 'gate-on', transaction['ticket'])
        self.stop(transaction)
        if transaction['restore_required']:
            self.helper(transaction, 'restore', transaction['ticket'], transaction['backup_sha256'])
        self.project.activate(transaction['previous']['images'])
        self.http_gate(True)
        state.update(active=transaction['previous'], pending=None, rejected=transaction['candidate'])
        self.record(state, 'rollback-committed')
        self.finish(state)

    def recover(self, state):
        transaction = state['maintenance']
        if transaction['config'] != self.config:
            raise self.error('Configuration SQLite modifiée : reprise manuelle requise.')
        if (str(self.project.file) != transaction['compose_path']
            or hashlib.sha256(self.project.file.read_bytes()).hexdigest() != transaction['compose_sha256']
            or hashlib.sha256(self.project.compose('config', capture=True).encode()).hexdigest() != transaction['compose_config_sha256']):
            raise self.error('Compose modifié : reprise SQLite manuelle requise.')
        source = Path(transaction['source'])
        if not source.is_dir() or str(source.resolve(strict=True)) != transaction['source']:
            raise self.error('Dossier SQLite modifié : reprise manuelle requise.')
        # Compose peut avoir supprimé un conteneur sans créer son remplaçant.
        # Valider ceux qui existent, puis laisser activate() reconstruire la paire.
        for container in self.project.compose('ps', '--all', '-q', self.service, capture=True).split():
            if self.layout({self.service: self.inspect(container)}) != transaction['source']:
                raise self.error('Montage SQLite modifié : reprise manuelle requise.')
        # Un client Docker tué peut laisser son conteneur ponctuel actif.
        try:
            self.run(['docker', 'rm', '-f', transaction['container']], capture=True)
        except self.error:
            pass
        if transaction['phase'] in ('committed', 'rollback-committed'):
            self.finish(state)
        else:
            self.rollback(state)
