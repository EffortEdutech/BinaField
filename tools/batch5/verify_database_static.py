from pathlib import Path
import json, hashlib, sys
root=Path(__file__).resolve().parents[2];checks=[]
def ck(n,c): checks.append((n,bool(c))); print(('PASS' if c else 'FAIL'),n)
files=sorted(p.name for p in (root/'packages/database/migrations').glob('*.sql'))
ck('bridge-orders-before-0015',files.index('0014z_p1_08_rls_registry_metadata_compatibility.sql') < files.index('0015_p1_08_evidence_runtime_reconciliation.sql'))
ck('0016-orders-after-0015',files.index('0016_p1_09_intelligence_runtime_reconciliation.sql') > files.index('0015_p1_08_evidence_runtime_reconciliation.sql'))
bridge=(root/'packages/database/migrations/0014z_p1_08_rls_registry_metadata_compatibility.sql').read_text();m=(root/'packages/database/migrations/0016_p1_09_intelligence_runtime_reconciliation.sql').read_text()
for token in ['ADD COLUMN IF NOT EXISTS table_schema','CREATE UNIQUE INDEX IF NOT EXISTS rls_registry_table_schema_table_name_uq','sync_rls_registry_schema_names'] : ck('bridge:'+token,token in bridge)
for token in ['semantic_mappings','projection_freshness','projection_facts_classification_check','metric_definitions_classification_check','projection_facts_grain_check','CREATE POLICY tenant_isolation','GRANT SELECT','ON CONFLICT(table_schema,table_name)'] : ck('0016:'+token,token in m)
ck('no-source-submission-mutation','UPDATE field.submissions' not in m and 'DELETE FROM field.submissions' not in m)
# preserve prior 0015 checksum from Batch4 manifest
prior=json.loads((root/'artefacts/batch04-files.sha256.json').read_text());target='packages/database/migrations/0015_p1_08_evidence_runtime_reconciliation.sql';expected=None
for x in prior.get('files',[]) if isinstance(prior,dict) else []:
 if x.get('path')==target:expected=x.get('sha256')
if expected is None and isinstance(prior,dict): expected=prior.get(target)
actual=hashlib.sha256((root/target).read_bytes()).hexdigest();ck('0015-checksum-preserved',expected is None or actual==expected)
failed=[n for n,v in checks if not v];out={'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed,'migration_order':[x for x in files if x.startswith(('0014','0015','0016'))]};(root/'artefacts/batch05-database-static-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2));sys.exit(1 if failed else 0)
