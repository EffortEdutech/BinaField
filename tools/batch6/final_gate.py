#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[2]
def load(rel):
 p=ROOT/rel
 if not p.exists(): return None
 try:return json.loads(p.read_text())
 except:return None
art=load('artefacts/phase1/gate-results/batch06-p1b-artifact-audit.json')
pgprobe=load('artefacts/phase1/security-results/batch06-postgres-environment-probe.json')
pglive=load('artefacts/phase1/security-results/batch06-postgres-live-summary.json')
android=load('artefacts/phase1/gate-results/batch06-android-live-summary.json')
reg=load('artefacts/phase1/gate-results/batch06-cumulative-local-regression.json')
bp=load('artefacts/phase1/gate-results/batch06-vs01-blueprint-verification.json')
field=load('artefacts/phase1/vertical-slice/vs01-field-stage.json')
server=load('artefacts/phase1/vertical-slice/vs01-server-stage.json')
fieldfinal=load('artefacts/phase1/vertical-slice/vs01-field-finalize.json')
fail=load('artefacts/phase1/gate-results/batch06-failure-injection.json')
local_ok=all(x and x.get('status')=='PASS' for x in [reg,bp,field,server,fieldfinal,fail])
pg_ok=bool(pglive and pglive.get('status')=='PASS')
android_ok=bool(android and android.get('status')=='PASS')
p1b='PASS' if local_ok and pg_ok and android_ok and art and art.get('blocking_failures')==0 else 'PENDING_EXTERNAL_PROOF'
p1c_criteria={
 'C1_P1B_PASS':'PASS' if p1b=='PASS' else 'PENDING_P1B',
 'C2_CRITICAL_POSITIVE_FIXTURES':'PASS_LOCAL' if local_ok else 'FAIL',
 'C3_CRITICAL_NEGATIVE_FIXTURES':'PASS_LOCAL' if local_ok else 'FAIL',
 'C4_TENANT_RLS_BLOCKERS_ABSENT':'PASS' if pg_ok else 'PENDING_LIVE_POSTGRESQL',
 'C5_IMMUTABILITY_GUARDS':'PASS_LOCAL' if local_ok else 'FAIL',
 'C6_OFFLINE_CRASH_RESTART_DURABILITY':'PASS_LOCAL' if field and field.get('status')=='PASS' and fieldfinal and fieldfinal.get('status')=='PASS' else 'FAIL',
 'C7_DUPLICATE_ATTEMPT_NO_DUPLICATE_ACCEPTANCE':'PASS_LOCAL' if server and server.get('failureInjection',{}).get('lost_ack_replay') else 'FAIL',
 'C8_CANCELLATION_REASSIGNMENT_RECONCILIATION':'PASS_LOCAL' if server and server.get('failureInjection',{}).get('offline_cancel_reconciled') and server.get('failureInjection',{}).get('stale_revision_reconciled') else 'FAIL',
 'C9_REQUIRED_EVIDENCE_GATE':'PASS_LOCAL' if server and server.get('failureInjection',{}).get('corrupted_evidence_blocked') else 'FAIL',
 'C10_ORIGINALS_NOT_OVERWRITTEN':'PASS_LOCAL' if reg else 'FAIL',
 'C11_PROJECTION_RECONCILES_TO_SOURCE':'PASS_LOCAL' if server and server.get('metrics',{}).get('accepted_submissions')==1 else 'FAIL',
 'C12_SCOPE_BEFORE_AGGREGATION':'PASS_LOCAL' if server and server.get('security',{}).get('cross_tenant_metric_records')==0 else 'FAIL',
 'C13_VS01_END_TO_END':'PASS_LOCAL_INTEGRATED' if field and server and fieldfinal and all(x.get('status')=='PASS' for x in [field,server,fieldfinal]) else 'FAIL',
 'C14_NO_UNRESOLVED_CRITICAL_DEFECT':'PENDING_LIVE_SECURITY' if not pg_ok else 'PASS',
 'C15_GATE_EVIDENCE_RETAINED':'PASS' if all(x is not None for x in [art,reg,bp,field,server,fieldfinal,fail,pgprobe]) else 'FAIL'
}
failures=[k for k,v in p1c_criteria.items() if v=='FAIL']
pending=[k for k,v in p1c_criteria.items() if v.startswith('PENDING')]
p1c='PASS' if p1b=='PASS' and not failures and not pending else ('FAIL' if failures else 'PENDING_EXTERNAL_PROOF')
out={'phase':'Phase 1 Implementation','batch':'Batch 6','gate_model':'BF-P1-10','p1a':'PASS','p1b':p1b,'p1c':p1c,'phase1_executable_implementation':'COMPLETE' if p1b=='PASS' and p1c=='PASS' else 'NOT_YET_CLOSED','local_integrated_gate':'PASS' if local_ok else 'FAIL','postgres_live_gate':'PASS' if pg_ok else 'PENDING','android_instrumentation_gate':'PASS' if android_ok else 'PENDING','p1c_criteria':p1c_criteria,'blocking_failures':failures,'pending_proofs':pending,'closure_statement':'Phase 1 may be formally closed only after P1-B and P1-C both PASS. This environment does not convert unavailable live infrastructure into a simulated pass.'}
p=ROOT/'artefacts/phase1/gate-results/BF-P1-B06-FINAL-GATE-DECISION.json';p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2));sys.exit(1 if failures else 0)
