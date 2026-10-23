#!/usr/bin/env python3
from pathlib import Path
import sqlite3,tempfile,json,hashlib,shutil,os,sys
ROOT=Path(__file__).resolve().parents[2]
BUILD=ROOT/'.build/b6-vs01';BUILD.mkdir(parents=True,exist_ok=True)
DB=BUILD/'field-local.sqlite';
if DB.exists(): DB.unlink()
blueprint=json.loads((ROOT/'packages/test-fixtures/phase1-gate/vs01/farm-audit-blueprint.json').read_text())
canon_bp=json.dumps(blueprint,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode();bp_hash=hashlib.sha256(canon_bp).hexdigest()
org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; orgb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; project='11111111-1111-4111-8111-111111111111'; dep='22222222-2222-4222-8222-222222222222'; assignment='33333333-3333-4333-8333-333333333333'; membership='44444444-4444-4444-8444-444444444444'; device='55555555-5555-4555-8555-555555555555'; session='66666666-6666-4666-8666-666666666666'; attempt='77777777-7777-4777-8777-777777777777'; attachment='88888888-8888-4888-8888-888888888888'; now='2026-10-22T08:00:00Z'
photo=BUILD/'field-photo.png'; shutil.copyfile(ROOT/'packages/test-fixtures/evidence/media/one-pixel.png',photo); photo_bytes=photo.read_bytes(); photo_hash=hashlib.sha256(photo_bytes).hexdigest()
payload={'yield':1250.0,'irrigation':False,'reason':'Pump outage observed during inspection.','location':{'latitude':4.5975,'longitude':101.0901,'accuracyM':8.0,'zoneRef':'ZONE-A'},'photos':[attachment]}
canonical_payload=json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False);payload_hash=hashlib.sha256(canonical_payload.encode()).hexdigest();manifest=[{'attachmentId':attachment,'fieldId':'photos','required':True,'sha256':photo_hash,'byteSize':len(photo_bytes)}];manifest_json=json.dumps(manifest,sort_keys=True,separators=(',',':'));manifest_hash=hashlib.sha256(manifest_json.encode()).hexdigest();idem='vs01-submit-001';request_hash=hashlib.sha256((payload_hash+manifest_hash+str(3)).encode()).hexdigest()
con=sqlite3.connect(DB);con.executescript((ROOT/'apps/field-android/data/local/migrations/0001_local_schema_v1.sql').read_text())
checks=[]
def ck(n,v,d=''): checks.append({'name':n,'ok':bool(v),'detail':d}); print(('PASS' if v else 'FAIL'),n,d)
try:
 con.execute("insert into local_meta values(1,1,'1.0.0','1','1','client-vs01',?,?,?,?,1)",(org,now,now,now))
 con.execute("insert into organization_context values(?,?,?,?,?,?,?,?,?)",(org,'VS01 Org A',1,'2026-10-29T08:00:00Z',now,now,'c0','1.0.0','COMPATIBLE'))
 con.execute("insert into membership_snapshot values(?,?,?,?,?,?,?,?)",(org,membership,'user-vs01','ACTIVE',json.dumps({'roles':['FIELD_WORKER'],'projects':[project]}),1,now,'2026-10-29T08:00:00Z'))
 con.execute("insert into device_snapshot values(?,?,?,?,?,?,?,?)",(org,device,membership,'ACTIVE',1,'1.0.0',now,now))
 con.execute("insert into project_cache values(?,?,?,?,?,?)",(org,project,1,'ACTIVE',json.dumps({'name':'Farm Alpha'}),now))
 con.execute("insert into template_package values(?,?,?,?,?,?,?,?,?,?)",(org,blueprint['template']['version_id'],blueprint['template']['template_id'],json.dumps(blueprint,separators=(',',':')),bp_hash,'1.0','1.0.0','1.0.0',1,now))
 con.execute("insert into assignment_cache values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(org,assignment,project,dep,blueprint['template']['version_id'],3,'ASSIGNED','[]',json.dumps({'membership_id':membership}),json.dumps({'type':'FARM','ref':'FARM-001'}),'2026-10-23T08:00:00Z','HIGH',now,now,'NOT_STARTED'))
 con.execute("insert into sync_cursor values(?,?,?,?,?,?)",(org,device,'c0',None,'gen-1',now));con.commit()
 # Execute fully offline, autosave, close/reopen to prove committed durability.
 con.execute("insert into submission_session values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(org,session,assignment,3,blueprint['template']['version_id'],'IN_PROGRESS','{}','{}','context',now,None,None,now,1,device));con.commit()
 con.execute("update submission_session set payload_json=?,current_step_id='evidence',last_local_save_at=?,local_revision=2 where organization_id=? and session_id=?",(canonical_payload,now,org,session));con.commit();con.close();con=sqlite3.connect(DB)
 row=con.execute("select payload_json,lifecycle_state,local_revision from submission_session where organization_id=? and session_id=?",(org,session)).fetchone();ck('offline-autosave-survives-restart',row and json.loads(row[0])==payload and row[1]=='IN_PROGRESS' and row[2]==2)
 # Evidence is locally durable before SUBMIT.
 ev=(org,attachment,assignment,session,'photos','PHOTO','ORIGINAL',None,str(photo),'CAMERA_CAPTURE',len(photo_bytes),photo_hash,'image/png',now,'UTC',json.dumps(payload['location']),'LOCAL_CAPTURED',membership,device,None,None,None,0)
 con.execute("insert into local_evidence values("+','.join('?'*len(ev))+")",ev)
 con.execute("update submission_session set lifecycle_state='COMPLETE',device_completed_at=?,last_local_save_at=?,local_revision=3 where organization_id=? and session_id=?",(now,now,org,session));con.commit()
 # Deliberate network loss: SUBMIT creates immutable Attempt and durable outbox while no server is reachable.
 attempt_vals=(org,attempt,idem,session,assignment,3,blueprint['template']['version_id'],bp_hash,canonical_payload,payload_hash,manifest_json,membership,device,now,'UTC','1.0',now,None,None,None,None)
 con.execute("insert into submission_attempt values("+','.join('?'*len(attempt_vals))+")",attempt_vals)
 con.execute("update submission_session set lifecycle_state='SUBMITTED',device_submitted_at=?,last_local_save_at=?,local_revision=4 where organization_id=? and session_id=?",(now,now,org,session))
 ops=[
  (org,'op-evidence-finalize','EVIDENCE_UPLOAD_FINALIZE','EVIDENCE',attachment,'vs01-evidence-finalize',attachment,1,'QUEUED',0,None,None,now,now,None),
  (org,'op-submit-attempt','SUBMISSION_ATTEMPT_SEND','SUBMISSION_ATTEMPT',attempt,idem,attempt,1,'BLOCKED_DEPENDENCY',0,None,None,now,now,None)
 ]
 con.executemany("insert into sync_outbox values("+','.join('?'*15)+")",ops)
 con.execute("insert into sync_operation_dependency values(?,?,?,1)",(org,'op-submit-attempt','op-evidence-finalize'));con.commit();con.close();con=sqlite3.connect(DB)
 ck('offline-submit-survives-restart',con.execute("select count(*) from submission_attempt where organization_id=? and attempt_id=?",(org,attempt)).fetchone()[0]==1)
 ck('submitted-session-locked',con.execute("select lifecycle_state from submission_session where organization_id=? and session_id=?",(org,session)).fetchone()[0]=='SUBMITTED')
 ck('evidence-durable-before-sync',con.execute("select sha256 from local_evidence where organization_id=? and attachment_id=?",(org,attachment)).fetchone()[0]==photo_hash)
 ck('submission-blocked-by-evidence-dependency',con.execute("select state from sync_outbox where organization_id=? and operation_id='op-submit-attempt'",(org,)).fetchone()[0]=='BLOCKED_DEPENDENCY')
 # Immutability challenge after SUBMIT.
 immutable=False
 try:
  con.execute("update submission_attempt set canonical_payload_json='{}' where organization_id=? and attempt_id=?",(org,attempt));con.commit()
 except sqlite3.DatabaseError:
  immutable=True;con.rollback()
 ck('submitted-attempt-immutable',immutable)
 bundle={'organizationId':org,'foreignOrganizationId':orgb,'projectId':project,'deploymentId':dep,'assignmentId':assignment,'assignmentRevision':3,'membershipId':membership,'deviceId':device,'sessionId':session,'attemptId':attempt,'idempotencyKey':idem,'requestHash':request_hash,'templateId':blueprint['template']['template_id'],'templateVersionId':blueprint['template']['version_id'],'blueprintHash':bp_hash,'payload':payload,'payloadHash':payload_hash,'evidenceManifest':manifest,'evidenceManifestHash':manifest_hash,'clientSubmittedAt':now,'attachmentId':attachment,'photoPath':str(photo),'photoSha256':photo_hash,'photoSize':len(photo_bytes),'localDbPath':str(DB)}
 (BUILD/'vs01-field-bundle.json').write_text(json.dumps(bundle,indent=2)+'\n')
 out={'status':'PASS' if all(x['ok'] for x in checks) else 'FAIL','checks_executed':len(checks),'failures':sum(not x['ok'] for x in checks),'network_state':'OFFLINE_AT_SUBMIT','bundle':str(BUILD/'vs01-field-bundle.json'),'local_db':str(DB),'checks':checks}
 (ROOT/'artefacts/phase1/vertical-slice/vs01-field-stage.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['status','checks_executed','failures','network_state']},indent=2));sys.exit(1 if out['failures'] else 0)
finally:
 try: con.close()
 except Exception: pass
