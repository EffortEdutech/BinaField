from pathlib import Path
import sqlite3,tempfile,json,hashlib,sys,os
root=Path(__file__).resolve().parents[2]; sql=(root/'apps/field-android/data/local/migrations/0001_local_schema_v1.sql').read_text(); checks=[]
def ck(n,c):checks.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n)
fd,path=tempfile.mkstemp(suffix='.sqlite');os.close(fd)
try:
 con=sqlite3.connect(path);con.executescript(sql)
 tables={r[0] for r in con.execute("select name from sqlite_master where type='table'")}; manifest=json.loads((root/'apps/field-android/data/local/local-schema-manifest.json').read_text()); ck('sqlite-all-tables',set(manifest['tables'])<=tables)
 org='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';dev='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; now='2026-10-22T00:00:00Z'
 con.execute("insert into sync_cursor values(?,?,?,?,?,?)",(org,dev,'c0',None,None,now));con.commit()
 # inbox transaction + crash simulation: apply business row, rollback cursor update -> stays c0
 con.execute('begin'); con.execute("insert into sync_inbox values(?,?,?,?,?,?,?,?)",(org,'b1','c0','c1','h',now,'APPLIED',None)); con.execute("insert into assignment_cache values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(org,'a1','p','dep','tv',9,'CANCELLED','[]','{}','{}',None,'HIGH',now,now,'BLOCKED')); con.rollback(); ck('rollback-preserves-old-cursor',con.execute('select current_cursor from sync_cursor').fetchone()[0]=='c0'); ck('rollback-business-row-not-partial',con.execute('select count(*) from assignment_cache').fetchone()[0]==0)
 # durable apply then cursor in same transaction
 con.execute('begin'); con.execute("insert into sync_inbox values(?,?,?,?,?,?,?,?)",(org,'b1','c0','c1','h',now,'APPLIED',None)); con.execute("insert into assignment_cache values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(org,'a1','p','dep','tv',9,'CANCELLED','[]','{}','{}',None,'HIGH',now,now,'BLOCKED')); con.execute("update sync_cursor set current_cursor='c1',last_applied_delta_id='d1' where organization_id=? and device_id=?",(org,dev));con.commit();ck('durable-cursor-after-apply',con.execute('select current_cursor from sync_cursor').fetchone()[0]=='c1')
 # immutable attempt via app convention: unique idem same tenant
 vals=(org,'att1','idem1','sess','a1',8,'tv','b'*64,'{}','p'*64,'[]',None,dev,now,'UTC','1.0',now,None,None,None,None)
 con.execute("insert into submission_attempt values("+','.join('?'*len(vals))+")",vals);con.commit();
 dup=False
 try: con.execute("insert into submission_attempt values("+','.join('?'*len(vals))+")",vals);con.commit()
 except sqlite3.IntegrityError: dup=True; con.rollback()
 ck('attempt-idempotency-unique',dup)
 # immutable attempt fields may not be edited, but server outcome columns may be updated
 frozen=False
 try: con.execute("update submission_attempt set canonical_payload_json='changed' where organization_id=? and attempt_id='att1'",(org,));con.commit()
 except sqlite3.DatabaseError: frozen=True; con.rollback()
 ck('attempt-payload-immutable',frozen)
 con.execute("update submission_attempt set server_submission_state='RECEIVED' where organization_id=? and attempt_id='att1'",(org,));con.commit();ck('attempt-server-outcome-mutable',con.execute("select server_submission_state from submission_attempt where organization_id=? and attempt_id='att1'",(org,)).fetchone()[0]=='RECEIVED')
 # submitted session cannot reopen or mutate payload
 con.execute("insert into submission_session values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(org,'sess2','a1',8,'tv','SUBMITTED','{\"v\":1}','{}',None,now,now,now,now,1,dev));con.commit()
 blocked=False
 try: con.execute("update submission_session set lifecycle_state='IN_PROGRESS' where organization_id=? and session_id='sess2'",(org,));con.commit()
 except sqlite3.DatabaseError: blocked=True;con.rollback()
 ck('submitted-session-no-reopen',blocked)

 # evidence original/derivative relation constraint
 ev=(org,'e1','a1','sess','proof','FILE_ATTACHMENT','ORIGINAL',None,'/private/e1','FILE_IMPORT',5,'0'*64,'application/octet-stream',now,'UTC',None,'LOCAL_CAPTURED',None,dev,None,None,None,0)
 con.execute("insert into local_evidence values("+','.join('?'*len(ev))+")",ev);con.commit();ck('original-stored',con.execute('select count(*) from local_evidence').fetchone()[0]==1)
 bad=list(ev);bad[1]='e2';bad[6]='DERIVATIVE';bad[7]=None
 failed=False
 try:con.execute("insert into local_evidence values("+','.join('?'*len(bad))+")",bad);con.commit()
 except sqlite3.IntegrityError:failed=True;con.rollback()
 ck('derivative-requires-parent',failed)
 result={'total':len(checks),'passed':sum(v for _,v in checks),'failed':sum(not v for _,v in checks)};(root/'artefacts/batch04-local-store-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(result);sys.exit(1 if result['failed'] else 0)
finally:
 try:con.close()
 except:pass
 os.unlink(path)
