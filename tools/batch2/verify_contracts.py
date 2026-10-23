#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
from typing import Any
from jsonschema import Draft202012Validator, FormatChecker

ROOT=Path(__file__).resolve().parents[2]
BP=ROOT/'packages/contracts/blueprint'
DOMAIN=ROOT/'packages/domain'
REPORT=ROOT/'artefacts/phase1/test-results/batch02-contract-verification.json'
checks=[]

def check(name: str, ok: bool, detail: str=''):
    checks.append({'name':name,'ok':bool(ok),'detail':detail})
    if not ok:
        print(f'FAIL {name}: {detail}', file=sys.stderr)

def load(p: Path): return json.loads(p.read_text(encoding='utf-8'))

def canonical(o: Any): return json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False)

# Schema meta-validation
schema_files=sorted((BP).rglob('*.schema.json'))
for p in schema_files:
    try:
        Draft202012Validator.check_schema(load(p)); check(f'schema-valid:{p.relative_to(ROOT)}',True)
    except Exception as e: check(f'schema-valid:{p.relative_to(ROOT)}',False,str(e))

root_schema=load(BP/'schema/bf-blueprint.schema.json')
root_validator=Draft202012Validator(root_schema,format_checker=FormatChecker())
registry=load(BP/'components/registry.json')
component_types=[x['type'] for x in registry['components']]
expected_components=['text','paragraph','number','integer','currency','numeric_stepper','single_select','multi_select','toggle','date','time','datetime','gps','camera','file_attachment','signature','barcode_qr','instruction','repeat_group','computed_field']
check('component-registry-exact-v1-set',component_types==expected_components,f'{component_types}')
check('component-registry-unique',len(component_types)==len(set(component_types)))
for c in registry['components']:
    check(f'component-config-exists:{c["type"]}',(BP/c['config_schema']).exists())
    check(f'component-value-exists:{c["type"]}',(BP/c['value_schema']).exists())

allowed_actions={'SHOW','HIDE','ENABLE','DISABLE','REQUIRE','OPTIONAL','WARN','BLOCK_COMPLETE'}
actions=set(root_schema['$defs']['rule']['properties']['action']['enum'])
check('rule-actions-exact',actions==allowed_actions,f'{sorted(actions)}')
check('prohibited-rule-actions-absent',not ({'SET_VALUE','CALCULATE','START_WORKFLOW','BLOCK_SUBMIT'} & actions))

# Domain registries and signature
reg_names=['lifecycles.json','transitions.json','errors.json','idempotency.json','events.json']
regs=[load(DOMAIN/'registry'/n) for n in reg_names]
sig=hashlib.sha256(''.join(canonical(x) for x in regs).encode()).hexdigest()
recorded=(DOMAIN/'registry/contract-signature.txt').read_text().strip()
check('domain-signature-current',sig==recorded,f'computed={sig} recorded={recorded}')
life,trans=regs[0],regs[1]
for entity,meta in life['entities'].items():
    states=set(meta['states']); terminal=set(meta.get('terminal',[])); pairs=trans['transitions'].get(entity,[])
    check(f'lifecycle-transition-registry:{entity}',entity in trans['transitions'])
    for a,b in pairs: check(f'transition-state-known:{entity}:{a}->{b}',a in states and b in states)
    for t in terminal:
        outgoing=[x for x in pairs if x[0]==t]
        check(f'terminal-no-outgoing:{entity}:{t}',len(outgoing)==0,f'{outgoing}')
check('overdue-not-assignment-state','OVERDUE' not in life['entities']['Assignment']['states'])
check('overdue-derived-condition','OVERDUE' in life['entities']['Assignment']['derived_conditions'])

# Helpers for publication validation
def walk_components(bp):
    for step in bp.get('workflow_steps',[]):
        for sec in step.get('sections',[]):
            for c in sec.get('components',[]): yield c

def condition_refs(cond):
    if not isinstance(cond,dict): return set()
    if 'field_id' in cond: return {cond['field_id']}
    if cond.get('op') in ('AND','OR'):
        out=set()
        for x in cond.get('conditions',[]): out |= condition_refs(x)
        return out
    if cond.get('op')=='NOT': return condition_refs(cond.get('condition'))
    return set()

def expr_refs(expr):
    if not isinstance(expr,dict): return set()
    if 'field' in expr: return {expr['field']}
    out=set()
    for a in expr.get('args',[]): out |= expr_refs(a)
    return out

def publication_errors(bp):
    errors=[]
    schema_errors=sorted(root_validator.iter_errors(bp),key=lambda e:list(e.path))
    if schema_errors:
        return [('BLUEPRINT_SCHEMA_INVALID',schema_errors[0].message)]
    comps=list(walk_components(bp)); ids=[c['field_id'] for c in comps]; idset=set(ids)
    if len(ids)!=len(idset): errors.append(('BLUEPRINT_DUPLICATE_FIELD_ID','field_id must be globally unique'))
    # component config schema dispatch
    regmap={x['type']:x for x in registry['components']}
    for c in comps:
        entry=regmap.get(c['component'])
        if not entry: errors.append(('BLUEPRINT_UNKNOWN_COMPONENT',c['component'])); continue
        v=Draft202012Validator(load(BP/entry['config_schema']),format_checker=FormatChecker())
        ce=next(v.iter_errors(c.get('config',{})),None)
        if ce: errors.append(('BLUEPRINT_COMPONENT_CONFIG_INVALID',f"{c['field_id']}: {ce.message}"))
        a=c.get('analytics',{})
        if a.get('enabled') and not a.get('semantic_key'):
            errors.append(('BLUEPRINT_SCHEMA_INVALID',f"{c['field_id']}: analytics-enabled field requires semantic_key"))
    # rule refs
    for r in bp.get('rules',[]):
        refs=condition_refs(r.get('when')) | {r.get('target_field_id')}
        missing={x for x in refs if x and x not in idset}
        if missing: errors.append(('BLUEPRINT_UNRESOLVED_REFERENCE',','.join(sorted(missing))))
    # calculations refs + cycle through computed targets
    calcs=bp.get('calculations',[]); targets={c['target_field_id']:c for c in calcs}
    for c in calcs:
        refs=expr_refs(c.get('expression')) | {c.get('target_field_id')}
        missing={x for x in refs if x and x not in idset}
        if missing: errors.append(('BLUEPRINT_UNRESOLVED_REFERENCE',','.join(sorted(missing))))
    graph={target:{r for r in expr_refs(c['expression']) if r in targets} for target,c in targets.items()}
    visiting=set(); visited=set()
    def dfs(n):
        if n in visiting: return True
        if n in visited: return False
        visiting.add(n)
        for m in graph.get(n,set()):
            if dfs(m): return True
        visiting.remove(n); visited.add(n); return False
    if any(dfs(n) for n in graph): errors.append(('BLUEPRINT_CALCULATION_CYCLE','cycle detected'))
    # processing route secret/url hardening at contract level
    for route in bp.get('processing_routes',[]):
        raw=canonical(route).lower()
        if 'http://' in raw or 'https://' in raw or any(k in raw for k in ['password','secret','api_key','token']):
            errors.append(('BLUEPRINT_PROHIBITED_RUNTIME_BEHAVIOUR','raw URL/secret prohibited'))
    return errors

# Valid fixtures
valid_files=sorted((BP/'fixtures/valid').glob('*.json'))
for p in valid_files:
    errs=publication_errors(load(p)); check(f'valid-fixture:{p.name}',not errs,str(errs[:2]))

# Invalid fixtures
expected=load(BP/'fixtures/invalid/expected-errors.json')
for name,code in sorted(expected.items()):
    errs=publication_errors(load(BP/'fixtures/invalid'/name)); codes=[x[0] for x in errs]
    check(f'invalid-fixture:{name}',code in codes,f'expected={code}, actual={codes}')

# Component value schemas preserve false and zero semantics where applicable
for c,val in [('toggle',False),('number',0),('integer',0),('numeric_stepper',0)]:
    entry=next(x for x in registry['components'] if x['type']==c)
    v=Draft202012Validator(load(BP/entry['value_schema']),format_checker=FormatChecker())
    check(f'value-valid:{c}:{val!r}',v.is_valid(val))

# Evidence value contract is references-only, no embedded bytes
for c in ['camera','file_attachment','signature']:
    entry=next(x for x in registry['components'] if x['type']==c)
    raw=(BP/entry['value_schema']).read_text().lower()
    check(f'evidence-no-binary-field:{c}',not any(k in raw for k in ['base64','binary_data','bytes_payload']))

# Binding signatures present
for p in [DOMAIN/'generated/typescript/domain-contracts.ts', DOMAIN/'generated/kotlin/src/main/kotlin/com/binafield/contracts/domain/DomainContracts.kt']:
    check(f'domain-binding-signature:{p.suffix}',sig in p.read_text())
bp_sig=(BP/'manifests/blueprint-contract-signature.txt').read_text().strip()
for p in [BP/'generated/typescript/blueprint-contracts.ts', BP/'generated/kotlin/src/main/kotlin/com/binafield/contracts/blueprint/BlueprintContracts.kt']:
    check(f'blueprint-binding-signature:{p.suffix}',bp_sig in p.read_text())

failed=[x for x in checks if not x['ok']]
report={'status':'PASS' if not failed else 'FAIL','checks_executed':len(checks),'failures':len(failed),'checks':checks}
REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['status','checks_executed','failures']},indent=2))
sys.exit(1 if failed else 0)
