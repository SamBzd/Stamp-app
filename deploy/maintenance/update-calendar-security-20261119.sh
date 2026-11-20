#!/bin/sh
# One-time migration from the initial port-80 image, with the DSM task disabled.
set -eu
umask 077
test "$(id -u)" = 0 || { echo 'Lancer avec sudo /bin/sh.' >&2; exit 1; }
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
BASE=/volume1/docker/nas-cd
PROJECT=calendrier-avent-maman-2026
export DOCKER_CONFIG="$BASE/credentials/docker"
export CD_COMMIT=61928f728b5bd99289e0e643b0590378007e4460
export CD_SHA256=6a5d9f8eac3636566188b82c5d5ada8eff1da614b8a6daaaec7db11cbd5b3b20
export CALENDAR_COMMIT=5a8847d4883cf6c5f9aab666c99e60871da697a4
export CALLER_SHA256=857572bb3ac6def11bcb6dbc10cc3a0c7e887442b2b43d03db1d24174810be4c
export CI_SHA256=5ceae0ef33a5e8fadc6cf2cc1fd959ab86ea1dbe8660865611560ed9a66d821d
export PUBLISHER_SHA256=63db3a8c657d4f1c898cfb7ab6573c188b3c791606dfc9e5d05b9aaabe72e0c8

test -f "$BASE/state/$PROJECT/state.json"
test -f "$BASE/state/$PROJECT/images.compose.json"
backup="$BASE/calendar-security-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -m 700 "$backup"
cp -p "$BASE/nas_cd.py" "$backup/nas_cd.py"
cp -p "$BASE/projects.json" "$backup/projects.json"
cp -p "$BASE/calendrier/compose.yaml" "$backup/compose.yaml"
cp -a "$BASE/state/$PROJECT" "$backup/state"
echo "Sauvegarde conservée dans $backup"
changed=0
rollback() {
  result=$?
  trap - EXIT HUP INT TERM
  if [ "$result" -ne 0 ] && [ "$changed" -eq 1 ]; then
    set +e
    echo 'Échec de la mise à jour. Restauration de la configuration précédente.' >&2
    restored=1
    cp -p "$backup/nas_cd.py" "$BASE/nas_cd.py" || restored=0
    cp -p "$backup/projects.json" "$BASE/projects.json" || restored=0
    cp -p "$backup/compose.yaml" "$BASE/calendrier/compose.yaml" || restored=0
    if [ -d "$BASE/state/$PROJECT" ]; then
      mv "$BASE/state/$PROJECT" "$backup/failed-state" || restored=0
    fi
    cp -a "$backup/state" "$BASE/state/$PROJECT" || restored=0
    if [ "$restored" -eq 1 ] && docker-compose -p "$PROJECT" -f "$BASE/calendrier/compose.yaml" \
      -f "$BASE/state/$PROJECT/images.compose.json" up -d --no-build --force-recreate web \
      && curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:8086/ >/dev/null; then
      echo 'Ancienne version rétablie.' >&2
    else
      echo "RESTAURATION À VÉRIFIER. Sauvegarde disponible dans $backup" >&2
    fi
  fi
  exit "$result"
}
trap rollback EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

curl --fail --show-error --location \
  "https://raw.githubusercontent.com/SamBzd/Stamp-app/$CD_COMMIT/deploy/nas_cd.py" \
  --output "$backup/nas_cd.next.py"
printf '%s  %s\n' "$CD_SHA256" "$backup/nas_cd.next.py" | sha256sum --check

export UPDATE_BACKUP="$backup"
PYTHONDONTWRITEBYTECODE=1 /bin/python3 - <<'PY'
import importlib.util
import json
import os
from pathlib import Path

base = Path('/volume1/docker/nas-cd')
backup = Path(os.environ['UPDATE_BACKUP'])

def resource_limits(info):
    # This Synology kernel supports memory and CPU shares, not CFS or cgroup PIDs.
    # Fail before any switch if the required supported controls are unavailable.
    if info.get('MemoryLimit') is not True or info.get('CPUShares') is not True:
        raise SystemExit('Limites mémoire ou priorité CPU non disponibles. Aucune bascule effectuée.')
    return {'mem_limit': '64m', 'cpu_shares': 128,
            'ulimits': {'nproc': {'soft': 64, 'hard': 64}}}

spec = importlib.util.spec_from_file_location('nas_cd_next', str(backup / 'nas_cd.next.py'))
cd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cd)
config = json.loads((base / 'projects.json').read_text())
name = 'calendrier-avent-maman-2026'
settings = config['projects'][name]
if (settings['repository'] != 'SamBzd/calendrier-avent-maman-2026'
    or settings['compose_file'] != str(base / 'calendrier/compose.yaml')
    or settings['images'] != {'web': 'ghcr.io/sambzd/calendrier-avent-maman-2026-web'}):
    raise SystemExit('Configuration locale inattendue. Aucune bascule effectuée.')
state = json.loads((base / 'state' / name / 'state.json').read_text())
if state.get('pending') or not state.get('active'):
    raise SystemExit('État incomplet. Terminer la livraison précédente avant cette mise à jour.')
old = cd.Project(name, settings, config['compose_command'], base / 'state' / name)
old.wait_healthy(state['active']['images'])
resources = resource_limits(json.loads(cd.run(['docker', 'info', '--format', '{{json .}}'], capture=True)))
settings['trusted_workflows'] = {
    'SamBzd/calendrier-avent-maman-2026/.github/workflows/nas-release.yml': os.environ['CALLER_SHA256'],
    'SamBzd/calendrier-avent-maman-2026/.github/workflows/ci.yml': os.environ['CI_SHA256'],
    'SamBzd/Stamp-app/.github/workflows/nas-publish.yml': os.environ['PUBLISHER_SHA256'],
}
cd.validate(name, settings)
candidate = cd.latest_release(settings)
if not candidate or candidate['tag_name'] != 'nas-' + os.environ['CALENDAR_COMMIT']:
    raise SystemExit('La release attendue doit être la dernière release NAS publiée.')
image = candidate['images']['web']
cd.run(['docker', 'pull', image], timeout=900)
compose = {'version': '2.4', 'services': {'web': {
    'image': image, 'ports': ['0.0.0.0:8086:8080'], 'restart': 'unless-stopped',
    'user': '101:101', 'read_only': True, 'cap_drop': ['ALL'],
    'security_opt': ['no-new-privileges:true'],
    'tmpfs': ['/tmp:rw,noexec,nosuid,size=16m,mode=1777'],
    **resources,
    'logging': {'driver': 'json-file', 'options': {'max-size': '1m', 'max-file': '3'}},
}}}
settings['enabled'] = True
cd.save_json(backup / 'projects.next.json', config)
cd.save_json(backup / 'compose.next.json', compose)
print('Origine Actions, empreintes des workflows et image vérifiées.')
print('Profil NAS : RAM 64 Mio, priorité CPU relative 128, nproc 64 par UID ; aucun plafond CPU strict.')
PY

docker-compose -p "$PROJECT" -f "$backup/compose.next.json" config --quiet
changed=1
cp "$backup/compose.next.json" "$BASE/calendrier/compose.yaml"
chmod 600 "$BASE/calendrier/compose.yaml"
docker-compose -p "$PROJECT" -f "$BASE/calendrier/compose.yaml" up -d --no-build --force-recreate web
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:8086/ >/dev/null
mv "$BASE/state/$PROJECT" "$backup/state-before-adoption"
cp "$backup/projects.next.json" "$BASE/projects.json"
cp "$backup/nas_cd.next.py" "$BASE/nas_cd.py"
chmod 600 "$BASE/projects.json" "$BASE/nas_cd.py"
/bin/python3 "$BASE/nas_cd.py" "$BASE/projects.json" --state-dir "$BASE/state" --project "$PROJECT"
/bin/python3 "$BASE/nas_cd.py" "$BASE/projects.json" --state-dir "$BASE/state" --project "$PROJECT"
/bin/python3 - <<'PY'
import json
import re
import subprocess
from pathlib import Path

project = 'calendrier-avent-maman-2026'
ids = subprocess.check_output(['docker', 'ps', '-q', '--filter', 'label=com.docker.compose.project=' + project,
                               '--filter', 'label=com.docker.compose.service=web'], universal_newlines=True).split()
assert len(ids) == 1, 'Un seul conteneur web doit être actif.'
item = json.loads(subprocess.check_output(['docker', 'inspect', ids[0]], universal_newlines=True))[0]
host = item['HostConfig']
assert item['Config']['User'] == '101:101'
assert host['Privileged'] is False and host['ReadonlyRootfs'] is True
assert host['CapDrop'] == ['ALL']
assert any(option.startswith('no-new-privileges') for option in host['SecurityOpt'])
assert host['Memory'] == 64 * 1024 * 1024
assert host.get('PidsLimit') in (None, 0, -1)
assert host['NanoCpus'] == 0 and host['CpuShares'] == 128
limits = {limit['Name']: limit for limit in host['Ulimits']}
assert limits['nproc']['Soft'] == 64 and limits['nproc']['Hard'] == 64
effective = subprocess.check_output(['docker', 'exec', ids[0], 'cat', '/proc/1/limits'], universal_newlines=True)
assert re.search(r'^Max processes\s+64\s+64\s+processes\s*$', effective, re.M)
assert host['PortBindings'] == {'8080/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '8086'}]}
assert not any(mount['Type'] in ('bind', 'volume') for mount in item['Mounts'])
state = json.loads((Path('/volume1/docker/nas-cd/state') / project / 'state.json').read_text())
assert item['Config']['Image'] == state['active']['images']['web']
assert state['active']['verification']['run_id'] > 0
print('Conteneur vérifié : UID 101, lecture seule, capacités supprimées, privilèges et ressources limités.')
print('CPU : priorité relative 128 sans plafond strict. Processus : limite Unix nproc 64 par UID.')
print('Release active : ' + state['active']['tag_name'])
PY
echo 'Sécurité du calendrier mise à jour. La tâche automatique DSM reste désactivée.'
