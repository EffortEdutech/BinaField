#!/usr/bin/env python3
from pathlib import Path
import shutil,subprocess,json,os
ROOT=Path(__file__).resolve().parents[2]
psql=shutil.which('psql');postgres=shutil.which('postgres');docker=shutil.which('docker');podman=shutil.which('podman');url=os.environ.get('DATABASE_URL')
status='PENDING_ENVIRONMENT';detail='No live PostgreSQL execution path is available in this runtime.';version=None
if psql and url:
 try:
  version=subprocess.check_output([psql,url,'-Atqc','select version()'],text=True,timeout=15).strip();status='AVAILABLE';detail='psql and DATABASE_URL are available; run scripts/gate/postgres16-postgis-gate.sh for authoritative proof.'
 except Exception as e: detail=f'psql present but database probe failed: {e}'
out={'status':status,'detail':detail,'tools':{'psql':psql,'postgres':postgres,'docker':docker,'podman':podman},'database_url_present':bool(url),'database_version':version,'required_reference':'PostgreSQL 16 + PostGIS 3.4'}
p=ROOT/'artefacts/phase1/security-results/batch06-postgres-environment-probe.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
