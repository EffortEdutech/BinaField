import io.binafield.field.sync.*
import io.binafield.field.evidence.*
import java.io.File
fun checkTrue(v:Boolean,msg:String){ if(!v) error(msg) }
fun main(){
  val out=OutboxEngine()
  val up=OutboxOperation("up","org",OutboxType.EVIDENCE_UPLOAD_FINALIZE,1,1)
  val send=OutboxOperation("send","org",OutboxType.SUBMISSION_ATTEMPT_SEND,1,2,dependencies=linkedSetOf("up"))
  out.put(up); out.put(send); out.refreshDependencyStates()
  checkTrue(out.runnable(0).map{it.id}==listOf("up"),"submission ran before evidence")
  out.markSucceeded("up"); out.refreshDependencyStates(); checkTrue(out.runnable(0).map{it.id}==listOf("send"),"dependency did not release")
  val retry=RetryPolicy(); checkTrue(retry.delayMs(2,0.5)==2000L,"backoff"); checkTrue(retry.classify("ASSIGNMENT_CANCELLED")=="RECONCILIATION","classification")
  val inbox=InboxCursorEngine("c0")
  val b=InboxBatch("b1","org","c0","c1",listOf(DeltaEntry("d1","ASSIGNMENT","a1",9,"TOMBSTONE","{\"state\":\"CANCELLED\",\"tombstone_type\":\"CANCELLED\"}")))
  checkTrue(!inbox.applyDurably(b,true),"failure injection expected"); checkTrue(inbox.cursor=="c0","cursor advanced before durable gate")
  checkTrue(inbox.applyDurably(b,false),"replay failed"); checkTrue(inbox.cursor=="c1","cursor not advanced")
  checkTrue(inbox.assignments["a1"]?.revision==9L,"assignment revision")
  val c=ReconciliationEngine().forServerConflict("r1","a1","ASSIGNMENT_CANCELLED"); checkTrue(c.status==ReconciliationStatus.AWAITING_USER,"reconciliation")
  val f=File.createTempFile("bf-b4",".bin"); f.writeBytes("BinaField evidence fixture".toByteArray()); val h=EvidenceHash.sha256(f); checkTrue(h==EvidenceHash.sha256(f.readBytes()),"hash parity")
  val attempt=SubmissionAttempt("att","idem","a1",8,"payloadHash","manifestHash"); checkTrue(attempt.assignmentRevisionUsed==8L,"attempt frozen revision")
  println("BATCH4_KOTLIN_OFFLINE_EVIDENCE_SMOKE_PASS sha256=$h cursor=${inbox.cursor}")
}
