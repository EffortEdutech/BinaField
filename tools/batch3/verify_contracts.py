#!/usr/bin/env python3
from pathlib import Path
import json, yaml, re, hashlib, sys
from jsonschema.validators import Draft202012Validator
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def ck(name,cond,detail=''):
    checks.append({'name':name,'pass':bool(cond),'detail':detail})
def load(p): return json.loads((ROOT/p).read_text())
# schemas
for p in sorted(ROOT.glob('packages/contracts/**/*.schema.json')):
    try: Draft202012Validator.check_schema(json.loads(p.read_text())); ck('schema:'+str(p.relative_to(ROOT)),True)
    except Exception as e: ck('schema:'+str(p.relative_to(ROOT)),False,str(e))
perms=load('packages/contracts/security/permission-registry.v1.json')['permissions']; pkeys={x['permission_key'] for x in perms}
roles=load('packages/contracts/security/role-registry.v1.json')['roles']
ck('canonical organization spelling', 'organization.read' in pkeys and 'organisation.read' not in pkeys)
ck('all role permissions exist', all(set(r['permissions'])<=pkeys for r in roles))
ck('standard 11 roles', {r['role_key'] for r in roles}=={'ORG_OWNER','ORG_ADMIN','SECURITY_ADMIN','TEMPLATE_DESIGNER','PROJECT_ADMIN','OPERATIONS_MANAGER','SUPERVISOR_REVIEWER','FIELD_WORKER','ANALYST','AUDITOR_READONLY','INTEGRATION_SERVICE'})
ck('analyst no submission.read', 'submission.read' not in next(r for r in roles if r['role_key']=='ANALYST')['permissions'])
ck('field worker has execute+submit+capture', {'assignment.execute','submission.create','evidence.capture'}<=set(next(r for r in roles if r['role_key']=='FIELD_WORKER')['permissions']))
# openapi
spec=yaml.safe_load((ROOT/'packages/contracts/api/openapi.v1.yaml').read_text()); ck('openapi 3.1',str(spec.get('openapi','')).startswith('3.1'))
ops=[]
for path,item in spec.get('paths',{}).items():
  for method,o in item.items():
    if method.lower() not in {'get','post','put','patch','delete'}: continue
    ops.append((path,method,o))
oids=[o['operationId'] for _,_,o in ops]
ck('unique operationIds',len(oids)==len(set(oids)))
ck('all operations secured',all(o.get('security') for _,_,o in ops))
ck('all operations permission extension',all(o.get('x-binafield-permission') in pkeys for _,_,o in ops))
# every relative OpenAPI $ref must resolve locally
refs=[]
def walk(v):
  if isinstance(v,dict):
    for k,x in v.items():
      if k=='$ref' and isinstance(x,str) and not x.startswith('#'): refs.append(x)
      walk(x)
  elif isinstance(v,list):
    for x in v: walk(x)
walk(spec)
base=ROOT/'packages/contracts/api'
ck('all local OpenAPI refs resolve',all((base/r).resolve().exists() for r in refs),','.join([r for r in refs if not (base/r).resolve().exists()]))
profiles=load('packages/contracts/security/operation-security-map.v1.json')['operations']; pm={x['operation_id']:x for x in profiles}
ck('operation/security profile exact parity',set(oids)==set(pm))
ck('operation permission parity',all(pm[o['operationId']]['permission_key']==o['x-binafield-permission'] for _,_,o in ops))
# command/query registries
cmds=load('packages/contracts/commands/registry.v1.json')['commands']; qs=load('packages/contracts/queries/registry.v1.json')['queries']
ck('command permissions exist',all(c['permission_key'] in pkeys for c in cmds))
ck('query permissions exist',all(q['permission_key'] in pkeys for q in qs))
public_cmd={c['public_operation_id'] for c in cmds if c['public_operation_id']}; public_q={q['public_operation_id'] for q in qs if q['public_operation_id']}
ck('all OpenAPI ops registry-backed',set(oids)==public_cmd|public_q)
ck('internal-only commands absent from OpenAPI',all(c['command_type'] not in oids for c in cmds if not c['public_operation_id']))
# event parity
domain=set(load('packages/domain/registry/events.json')['events']); er=load('packages/contracts/events/registry.v1.json')['events']; ev={e['event_type'] for e in er}
ck('event registry exact P1-03 parity',domain==ev)
ck('event payload schemas exist',all((ROOT/f"packages/contracts/events/{e}.event.schema.json").exists() for e in ev))
# manifest hashes
m=load('packages/contracts/api/manifests/manifest.json')
def h(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
ck('manifest openapi hash',m['openapi_sha256']==h('packages/contracts/api/openapi.v1.yaml'))
ck('manifest command hash',m['commands_sha256']==h('packages/contracts/commands/registry.v1.json'))
ck('manifest query hash',m['queries_sha256']==h('packages/contracts/queries/registry.v1.json'))
ck('manifest event hash',m['events_sha256']==h('packages/contracts/events/registry.v1.json'))
# DB forward-correction + static RLS properties
mig=(ROOT/'packages/database/migrations/0014_p1_06_security_registry_reconciliation.sql').read_text()
ck('forward migration canonical scope', "scope_mode='ORG_WIDE'" in mig and "('ORG_WIDE','PROJECT_RESTRICTED')" in mig)
ck('scope migration drops old check before update', mig.index('DROP CONSTRAINT IF EXISTS membership_roles_scope_mode_check') < mig.index("UPDATE iam.membership_roles SET scope_mode='ORG_WIDE'"))
ck('forward migration canonical permission', "'organization.read'" in mig and "'organisation.read'" in mig and 'DELETE FROM iam.permissions' in mig)
m11=(ROOT/'packages/database/migrations/0011_runtime_roles_and_grants.sql').read_text().upper(); ck('runtime roles NOBYPASSRLS',m11.count('NOBYPASSRLS')>=3)
m12=(ROOT/'packages/database/migrations/0012_rls_tenant_isolation.sql').read_text().upper(); ck('force rls present', 'FORCE ROW LEVEL SECURITY' in m12)
rls=load('packages/database/security/rls-registry.v1.json')['tables']; ck('rls registry nonempty',len(rls)>=30)
# generated signatures
sig=(ROOT/'packages/contracts/api/manifests/api-security-contract-signature.txt').read_text().strip()
ck('ts generated signature',sig in (ROOT/'packages/generated/clients/typescript-admin/binafield-client.ts').read_text())
ck('kt generated signature',sig in (ROOT/'packages/generated/clients/kotlin-field/BinaFieldClient.kt').read_text())
# no obvious secrets in generated/config files
secret_re=re.compile(r'(?i)(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|aws_secret_access_key\s*=\s*[^$<]|password\s*=\s*["\'][^$<])')
bad=[]
for p in ROOT.rglob('*'):
  if p.is_file() and p.suffix.lower() in {'.ts','.kt','.json','.yaml','.yml','.sql','.md','.env'}:
    try:
      if secret_re.search(p.read_text(errors='ignore')): bad.append(str(p.relative_to(ROOT)))
    except: pass
ck('no embedded obvious secrets',not bad,','.join(bad))
# fixture families
for rel in ['packages/test-fixtures/api-events/idempotency-same-request.json','packages/test-fixtures/api-events/idempotency-mismatch.json','packages/test-fixtures/security/cross-tenant/foreign-organization.json','packages/test-fixtures/security/scopes/project-outside-binding.json','packages/test-fixtures/security/device-offline/revoked-device.json']:
  ck('fixture:'+rel,(ROOT/rel).exists())
result={'status':'PASS' if all(x['pass'] for x in checks) else 'FAIL','checks_executed':len(checks),'failures':sum(not x['pass'] for x in checks),'checks':checks}
out=ROOT/'artefacts/phase1/test-results/batch03-contract-security-verification.json'; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','checks_executed','failures']},indent=2))
if result['status']!='PASS':
  for x in checks:
    if not x['pass']: print('FAIL',x)
  sys.exit(1)
