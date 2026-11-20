import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import urllib.request
from uuid import uuid4

root = Path(__file__).resolve().parents[3]
if os.geteuid() not in (0, 1000):
    raise SystemExit('Cette recette locale nécessite UID 1000 ou root pour les volumes Node UID 1000.')
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

driver = load('driver_local', root / 'deploy/maintenance/connect-stamp-rehearsal.py')
recipe = load('recipe_local', root / 'deploy/maintenance/recette-nas-cd46.py')
cd = load('cd_local', root / 'deploy/nas_cd.py')
recipe.DOCKER = shutil.which('docker')
run_original = cd.run
cd.run = lambda args, **kw: None if args[:2] == ['docker', 'pull'] else run_original(args, **kw)
name = 'cd46-stamp-local-' + uuid4().hex[:10]
old_backend, old_frontend = name + ':old-backend', name + ':old-frontend'
backend_image, frontend_image = 'codex-stamp-security-backend:local', 'codex-stamp-security-frontend:local'

with TemporaryDirectory(prefix='cd46-stamp-local-') as temporary:
    folder = Path(temporary)
    source, base = folder / 'production', folder / 'cd'
    source.mkdir()
    base.mkdir()
    data = source / 'db'
    data.mkdir()
    if os.geteuid() == 0:
        os.chown(str(data), 1000, 1000)
    compose = source / 'compose.json'
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1',0))
        port = reservation.getsockname()[1]
    schema_init = """const fs=require('node:fs'), Database=require('better-sqlite3');
    const {initializeSchemaAsCurrent}=require('./src/db/migrations');
    const db=new Database('/data/app.db');
    initializeSchemaAsCurrent(db,fs.readFileSync('/app/db/schema.sql','utf8'));
    db.prepare("INSERT INTO clients (nom,prenom) VALUES ('CD46','Synthetic')").run(); db.close();"""
    cli = ['docker','compose','-p',name,'-f',str(compose)]
    try:
        for target, parent in ((old_backend,backend_image),(old_frontend,frontend_image)):
            subprocess.run(['docker','build','--tag',target,'--provenance=false','--sbom=false','-'],
                           input='FROM '+parent+'\nLABEL cd46.fixture="'+name+'"\n',text=True,check=True,
                           stdout=subprocess.DEVNULL)
        recipe.docker('run','--rm','--network','none','--mount','type=bind,src='+str(data)+',dst=/data',
                      '--entrypoint','node',backend_image,'-e',schema_init)
        value={'version':'2.4','services':{
            'backend':{'image':old_backend,'container_name':name+'-backend',
                'environment':{'STAMP_DB_PATH':'/data/app.db','NODE_ENV':'production'},
                'volumes':['./db:/data'],
                'healthcheck':{'test':['CMD','node','-e',"fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"],
                    'interval':'1s','timeout':'3s','retries':15,'start_period':'1s'}},
            'frontend':{'image':old_frontend,'container_name':name+'-frontend',
                'depends_on':{'backend':{'condition':'service_healthy'}},
                'ports':['127.0.0.1:'+str(port)+':80']}}}
        compose.write_text(json.dumps(value))
        (base/'projects.json').write_text(json.dumps({'compose_command':['docker','compose'],
                                                     'projects':{'unrelated':{'enabled':False}}}))
        subprocess.run([*cli,'up','-d','--no-build'],check=True)
        candidate={'id':200,'tag_name':'nas-'+'2'*40,'published_at':'2026-11-19T18:00:00Z',
                   'images':{'backend':backend_image,'frontend':frontend_image},
                   'verification':{'policy':'LOCAL FIXTURE'}}
        cd.latest_release=lambda *_:candidate
        fail_commit = os.environ.get('CD46_INJECT_COMMIT_FAILURE') == '1'
        save_original = cd.save_json
        failed_once = False
        def save_with_fault(path, payload):
            global failed_once
            entry = payload.get('projects', {}).get(name, {}) if isinstance(payload, dict) else {}
            if fail_commit and not failed_once and path == base / 'projects.json' and entry.get('enabled'):
                failed_once = True
                raise OSError('LOCAL INJECTED ENABLE COMMIT FAILURE')
            return save_original(path, payload)
        cd.save_json = save_with_fault
        args=SimpleNamespace(backend_container=name+'-backend',frontend_container=name+'-frontend',
                             compose_sha256=hashlib.sha256(compose.read_bytes()).hexdigest(),release_commit='2'*40)
        try:
            driver.deliver(base,args,cd,recipe)
        except OSError:
            if not fail_commit or not failed_once:
                raise
        after=json.loads((base/'projects.json').read_text())
        assert after['projects']['unrelated']=={'enabled':False}
        assert name in after['projects']
        assert after['projects'][name]['enabled'] is (not fail_commit)
        with urllib.request.urlopen('http://127.0.0.1:'+str(port)+'/api/clients',timeout=5) as response:
            clients=json.load(response)
        assert any(client['nom']=='CD46' for client in clients)
        state=json.loads((base/'state'/name/'state.json').read_text())
        assert not state['pending']
        if fail_commit:
            assert state['active']['id'] == 0 and state['rejected']['id'] == candidate['id']
            print('LOCAL DOCKER ONLY : injected commit failure compensated, old pair restored, scheduler paused, synthetic client preserved.')
        else:
            assert state['active']['id'] == candidate['id']
            print('LOCAL DOCKER ONLY : candidate pair deployed, copy guard refused pending migration, synthetic client persisted, registration preserved unrelated config.')
    finally:
        subprocess.run([*cli,'down'],capture_output=True)
        for image in (old_backend,old_frontend,'nas-cd-local/'+name+'/backend:initial','nas-cd-local/'+name+'/frontend:initial'):
            recipe.docker('image','rm',image,check=False)
