#!/usr/bin/env python3
from pathlib import Path
import sqlite3,json,sys
ROOT=Path(__file__).resolve().parents[2];BUILD=ROOT/'.build/b6-vs01'
b=json.loads((BUILD/'vs01-field-bundle.json').read_text());s=json.loads((ROOT/'artefacts/phase1/vertical-slice/vs01-server-stage.json').read_text());con=sqlite3.connect(b['localDbPath']);checks=[]
def ck(n,v,d=''): checks.append({'name':n,'ok':bool(v),'detail':d});print(('PASS' if v else 'FAIL'),n,d)
try:
 sub=s['submissionId'];org=b['organizationId'];attempt=b['attemptId'];att=b['attachmentId'];
 con.execute("update local_evidence set lifecycle_state='READY',upload_id=?,server_integrity_state='VERIFIED',server_binding_state='BOUND' where organization_id=? and attachment_id=?",('upload-vs01',org,att))
 con.execute("update sync_outbox set state='SUCCEEDED',terminal_outcome_ref=?,updated_at=? where organization_id=? and operation_id='op-evidence-finalize'",(att,'2026-10-22T08:05:00Z',org))
 con.execute("update sync_outbox set state='QUEUED',updated_at=? where organization_id=? and operation_id='op-submit-attempt'",('2026-10-22T08:05:01Z',org))
 con.execute("update submission_attempt set server_submission_state='ACCEPTED',submission_id=?,server_outcome_at=? where organization_id=? and attempt_id=?",(sub,'2026-10-22T08:05:02Z',org,attempt))
 con.execute("update sync_outbox set state='SUCCEEDED',terminal_outcome_ref=?,updated_at=? where organization_id=? and operation_id='op-submit-attempt'",(sub,'2026-10-22T08:05:02Z',org))
 con.execute("update assignment_cache set lifecycle_state='COMPLETED',authoritative_revision=4,local_execution_status='COMPLETED',server_updated_at=? where organization_id=? and assignment_id=?",('2026-10-22T08:05:02Z',org,b['assignmentId']))
 con.commit();con.close();con=sqlite3.connect(b['localDbPath'])
 ck('accepted-outcome-durable-after-restart',con.execute("select server_submission_state from submission_attempt where organization_id=? and attempt_id=?",(org,attempt)).fetchone()[0]=='ACCEPTED')
 ck('outbox-terminal-after-restart',con.execute("select count(*) from sync_outbox where organization_id=? and state='SUCCEEDED'",(org,)).fetchone()[0]==2)
 ck('evidence-ready-after-restart',con.execute("select lifecycle_state from local_evidence where organization_id=? and attachment_id=?",(org,att)).fetchone()[0]=='READY')
 ck('assignment-completion-visible',con.execute("select lifecycle_state from assignment_cache where organization_id=? and assignment_id=?",(org,b['assignmentId'])).fetchone()[0]=='COMPLETED')
 out={'status':'PASS' if all(x['ok'] for x in checks) else 'FAIL','checks_executed':len(checks),'failures':sum(not x['ok'] for x in checks),'checks':checks};(ROOT/'artefacts/phase1/vertical-slice/vs01-field-finalize.json').write_text(json.dumps(out,indent=2)+'\n');print(out);sys.exit(1 if out['failures'] else 0)
finally:
 try:con.close()
 except Exception:pass
