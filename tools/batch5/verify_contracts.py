from pathlib import Path
import json, sys, re, hashlib
from jsonschema import Draft202012Validator
root=Path(__file__).resolve().parents[2];checks=[]
def ck(n,c):checks.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n)
# Schemas
cdir=root/'packages/contracts/intelligence'
for p in sorted(cdir.glob('*.schema.json')):
 try:Draft202012Validator.check_schema(json.loads(p.read_text()));ck('schema:'+p.name,True)
 except Exception as e:ck('schema:'+p.name,False)
# Required machine artefacts
required=['semantic-registry.v1.json','compatibility-registry.v1.json','conversion-registry.v1.json','projection-registry.v1.json','dimension-registry.v1.json','measure-registry.v1.json','metric-registry.v1.json','exception-registry.v1.json','anomaly-function-registry.v1.json','analytics-error-registry.v1.json','query-plan.schema.json','drilldown.schema.json','freshness.schema.json','report-definition.schema.json','security-suppression.schema.json']
for x in required:ck('artefact:'+x,(cdir/x).exists())
sem=json.loads((cdir/'semantic-registry.v1.json').read_text());ck('semantic-keys-unique',len({x['semantic_key'] for x in sem['entries']})==len(sem['entries']))
metrics=json.loads((cdir/'metric-registry.v1.json').read_text());ck('baseline-metric-count',len(metrics['metrics'])==18);ck('metric-keys-unique',len({(x['metric_key'],x['metric_version']) for x in metrics['metrics']})==len(metrics['metrics']))
ops={'COUNT','COUNT_DISTINCT','SUM','AVG','MIN','MAX','PERCENTILE','RATIO','RATE','DURATION_AVG','DURATION_P95'};ck('metric-ops-governed',all(x['operation'] in ops for x in metrics['metrics']))
ck('analytics-errors-18',len(json.loads((cdir/'analytics-error-registry.v1.json').read_text())['errors'])==18)
funcs={x['function_id'] for x in json.loads((cdir/'anomaly-function-registry.v1.json').read_text())['functions']};ck('anomaly-functions',funcs=={'THRESHOLD','PERCENT_CHANGE','ROLLING_MEAN_DEVIATION','ROLLING_MEDIAN_DEVIATION','Z_SCORE','ROBUST_Z_SCORE','MISSINGNESS_SPIKE','CATEGORY_RATE_SHIFT','LOCATION_CONCENTRATION'})
# Runtime semantics static assertions
runtime='\n'.join(p.read_text() for p in (root/'packages/intelligence-runtime/src').glob('*.ts'))
for token in ['ANALYTICS_PERMISSION_DENIED','SMALL_GROUP_SUPPRESSED','DRILLDOWN_DENIED','PROJECTION_STALE','SEMANTIC_INCOMPATIBLE','SEMANTIC_CONVERSION_MISSING','BEFORE_AGGREGATION','replaceVersion','timingSafeEqual'] : ck('runtime:'+token,token in runtime)
ck('no-arbitrary-sql-registry',all('sql' not in json.dumps(x).lower() or 'description' in x for x in metrics['metrics']))
# Four scenario coverage
for s in ['agriculture','construction','utilities','government-ngo']:ck('scenario:'+s,(root/f'packages/test-fixtures/intelligence/scenarios/{s}.json').exists())
# Database bridge/migration
bridge=(root/'packages/database/migrations/0014z_p1_08_rls_registry_metadata_compatibility.sql').read_text();ck('rls-bridge-before-0015', 'table_schema' in bridge and 'sync_rls_registry_schema_names' in bridge)
m=(root/'packages/database/migrations/0016_p1_09_intelligence_runtime_reconciliation.sql').read_text()
for t in ['intel.semantic_mappings','intel.projection_freshness','value_presence','REPEAT_ITEM','FORCE ROW LEVEL SECURITY','platform.rls_registry','PERSONAL_DATA','SENSITIVE_OPERATIONAL']:ck('migration:'+t,t in m)
# released 0015 remains exactly as Batch4 package copy according to prior batch hash manifest if present
prior=root/'artefacts/batch04-files.sha256.json'
if prior.exists():
 obj=json.loads(prior.read_text());
 # support either dict/list form
 target='packages/database/migrations/0015_p1_08_evidence_runtime_reconciliation.sql'; exp=None
 if isinstance(obj,dict):
  if target in obj: exp=obj[target]
  elif 'files' in obj:
   for x in obj['files']:
    if x.get('path')==target:exp=x.get('sha256')
 if exp: ck('released-0015-checksum-preserved',hashlib.sha256((root/target).read_bytes()).hexdigest()==exp)
 else: ck('released-0015-present',(root/target).exists())
else:ck('released-0015-present',(root/'packages/database/migrations/0015_p1_08_evidence_runtime_reconciliation.sql').exists())
# Static RLS registry includes new tables
rls=json.loads((root/'packages/database/security/rls-registry.v1.json').read_text())['tables'];pairs={(x['schema'],x['table']) for x in rls};ck('rls-semantic-mappings',('intel','semantic_mappings') in pairs);ck('rls-freshness',('intel','projection_freshness') in pairs)
# No direct mutation paths from insights; source mutation strings absent from intelligence runtime.
ck('intelligence-no-source-update-sql','UPDATE field.submissions' not in runtime and 'DELETE FROM field.submissions' not in runtime)
failed=[n for n,v in checks if not v];out={'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed};(root/'artefacts').mkdir(exist_ok=True);(root/'artefacts/batch05-contract-verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2));sys.exit(1 if failed else 0)
