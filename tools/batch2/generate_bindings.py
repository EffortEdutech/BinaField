#!/usr/bin/env python3
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[2]
DOMAIN=ROOT/'packages/domain'
BP=ROOT/'packages/contracts/blueprint'

def load(p): return json.loads(p.read_text())
def canonical(o): return json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False)

# Domain signature and bindings
reg_names=['lifecycles.json','transitions.json','errors.json','idempotency.json','events.json']
regs=[load(DOMAIN/'registry'/n) for n in reg_names]
sig=hashlib.sha256(''.join(canonical(x) for x in regs).encode()).hexdigest()
(DOMAIN/'registry/contract-signature.txt').write_text(sig+'\n')
life,trans=regs[0],regs[1]
entity_states={k:v['states'] for k,v in life['entities'].items()}
trans_map=trans['transitions']
ts=["// GENERATED — DO NOT EDIT. Source: packages/domain/registry/*.json",f"export const DOMAIN_CONTRACT_SIGNATURE = '{sig}' as const;",""]
for ent,states in entity_states.items(): ts.append(f"export type {ent}State = {' | '.join(repr(x) for x in states)};")
ts += ["\nexport const LIFECYCLE_STATES = "+json.dumps(entity_states,indent=2)+" as const;","\nexport const ALLOWED_TRANSITIONS = "+json.dumps(trans_map,indent=2)+" as const;","\nexport function canTransition(entity: keyof typeof ALLOWED_TRANSITIONS, from: string, to: string): boolean { return ALLOWED_TRANSITIONS[entity].some(([a,b]) => a===from && b===to); }"]
(DOMAIN/'generated/typescript/domain-contracts.ts').write_text('\n'.join(ts)+'\n')
kt=["// GENERATED — DO NOT EDIT. Source: packages/domain/registry/*.json","package com.binafield.contracts.domain","",f"const val DOMAIN_CONTRACT_SIGNATURE: String = \"{sig}\"",""]
for ent,states in entity_states.items(): kt.append(f"enum class {ent}State {{ {', '.join(states)} }}")
kt.append("\nobject DomainTransitions {")
for ent,pairs in trans_map.items(): kt.append(f"    val {ent}: Set<String> = setOf({', '.join(f'\"{a}->{b}\"' for a,b in pairs)})")
kt.append("    fun canTransition(entity: String, from: String, to: String): Boolean { val key=\"$from->$to\"; return when(entity) {")
for ent in trans_map: kt.append(f'        "{ent}" -> {ent}.contains(key)')
kt.append('        else -> false\n    } }\n}')
(DOMAIN/'generated/kotlin/src/main/kotlin/com/binafield/contracts/domain/DomainContracts.kt').write_text('\n'.join(kt)+'\n')

# Blueprint signature and baseline bindings
schema=load(BP/'schema/bf-blueprint.schema.json'); registry=load(BP/'components/registry.json'); validators=load(BP/'validators/registry.json')
bpsig=hashlib.sha256(''.join(canonical(x) for x in [schema,registry,validators]).encode()).hexdigest()
(BP/'manifests/blueprint-contract-signature.txt').write_text(bpsig+'\n')
ct=[x['type'] for x in registry['components']]; actions=schema['$defs']['rule']['properties']['action']['enum']
ts=f'''// GENERATED BASELINE BINDING — DO NOT EDIT
export const BLUEPRINT_CONTRACT_SIGNATURE = '{bpsig}' as const;
export type ComponentType = {' | '.join(repr(x) for x in ct)};
export type RuleAction = {' | '.join(repr(x) for x in actions)};
export interface AnalyticsField {{ enabled: boolean; semantic_key?: string; classification?: 'PUBLIC_OPERATIONAL'|'INTERNAL'|'CONFIDENTIAL'|'PERSONAL_DATA'|'SENSITIVE_OPERATIONAL'; unit?: string }}
export interface ComponentInstance {{ field_id:string; component:ComponentType; label:string; required?:boolean; config:Record<string,unknown>; analytics:AnalyticsField }}
export interface Section {{ section_id:string; title:string; components:ComponentInstance[] }}
export interface WorkflowStep {{ step_id:string; title:string; sections:Section[] }}
export interface Blueprint {{ schema:'bf-blueprint/1.0'; schema_version:'1.0'; compatibility:{{min_runtime_version:string; component_registry_version:'1.0.0'}}; template:{{template_id:string;version_id:string;name:string}}; settings:{{locale?:string;on_hide?:'clear'|'retain'}}; workflow_steps:WorkflowStep[]; validations:Record<string,unknown>[]; rules:Record<string,unknown>[]; calculations:Record<string,unknown>[]; submission_policy:{{allow_offline_submit:boolean;require_all_required_evidence?:boolean}}; sync_policy:{{offline_capable:boolean;reference_dataset_ids?:string[]}}; processing_routes:{{route_id:string;connector_id:string;action:string}}[]; analytics:Record<string,unknown>; }}
'''
(BP/'generated/typescript/blueprint-contracts.ts').write_text(ts)
kt=f'''// GENERATED BASELINE BINDING — DO NOT EDIT
package com.binafield.contracts.blueprint
const val BLUEPRINT_CONTRACT_SIGNATURE: String = "{bpsig}"
enum class ComponentType {{ {', '.join(x.upper() for x in ct)} }}
enum class RuleAction {{ {', '.join(actions)} }}
data class AnalyticsField(val enabled:Boolean, val semanticKey:String?=null, val classification:String?=null, val unit:String?=null)
data class ComponentInstance(val fieldId:String,val component:ComponentType,val label:String,val required:Boolean=false,val config: Map<String, Any?> = emptyMap(),val analytics: AnalyticsField = AnalyticsField(false))
data class Section(val sectionId:String,val title:String,val components:List<ComponentInstance>)
data class WorkflowStep(val stepId:String,val title:String,val sections:List<Section>)
'''
(BP/'generated/kotlin/src/main/kotlin/com/binafield/contracts/blueprint/BlueprintContracts.kt').write_text(kt)
print(json.dumps({'domain_signature':sig,'blueprint_signature':bpsig},indent=2))
