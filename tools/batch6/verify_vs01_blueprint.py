#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[2]
bp=json.loads((ROOT/'packages/test-fixtures/phase1-gate/vs01/farm-audit-blueprint.json').read_text())
schema=json.loads((ROOT/'packages/contracts/blueprint/schema/bf-blueprint.schema.json').read_text())
errs=sorted(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(bp),key=lambda e:list(e.path))
reg=json.loads((ROOT/'packages/contracts/blueprint/components/registry.json').read_text());rm={x['type']:x for x in reg['components']}
checks=[]
def ck(n,v,d=''): checks.append({'name':n,'ok':bool(v),'detail':d})
ck('root-schema-valid',not errs,errs[0].message if errs else '')
ids=[]
for st in bp['workflow_steps']:
 for sec in st['sections']:
  for c in sec['components']:
   ids.append(c['field_id']); ent=rm.get(c['component']); ck(f'component-known:{c["field_id"]}',ent is not None,c['component'])
   if ent:
    cfg=json.loads((ROOT/'packages/contracts/blueprint'/ent['config_schema']).read_text()); e=next(Draft202012Validator(cfg).iter_errors(c.get('config',{})),None);ck(f'component-config:{c["field_id"]}',e is None,e.message if e else '')
ck('field-ids-unique',len(ids)==len(set(ids)))
ck('offline-capable',bp['sync_policy']['offline_capable'] is True)
ck('offline-submit-enabled',bp['submission_policy']['allow_offline_submit'] is True)
ck('required-evidence-gate',bp['submission_policy']['require_all_required_evidence'] is True)
ck('strict-rule-action',all(r['action'] in {'SHOW','HIDE','ENABLE','DISABLE','REQUIRE','OPTIONAL','WARN','BLOCK_COMPLETE'} for r in bp['rules']))
ck('analytics-enabled',bp['analytics']['enabled'] is True)
canon=json.dumps(bp,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode();h=hashlib.sha256(canon).hexdigest()
out={'status':'PASS' if all(x['ok'] for x in checks) else 'FAIL','checks_executed':len(checks),'failures':sum(not x['ok'] for x in checks),'blueprint_hash':h,'checks':checks}
p=ROOT/'artefacts/phase1/gate-results/batch06-vs01-blueprint-verification.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['status','checks_executed','failures','blueprint_hash']},indent=2));sys.exit(1 if out['failures'] else 0)
