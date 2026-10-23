package io.binafield.field.sync

enum class OutboxState { QUEUED, RUNNING, RETRY_WAIT, BLOCKED_DEPENDENCY, RECONCILIATION_REQUIRED, SUCCEEDED, FAILED_FINAL, CANCELLED_BY_POLICY }
enum class OutboxType { EVIDENCE_UPLOAD_INIT, EVIDENCE_UPLOAD_PART, EVIDENCE_UPLOAD_FINALIZE, SUBMISSION_ATTEMPT_SEND, SYNC_ACK, RECONCILIATION_RESPONSE, DIAGNOSTIC_UPLOAD }
enum class InboxApplyState { RECEIVED, VALIDATED, APPLYING, APPLIED, FAILED }
enum class ReconciliationStatus { OPEN, AWAITING_USER, AWAITING_SERVER, RESOLVED, CLOSED_NO_ACTION, ESCALATED }
enum class TombstoneType { CANCELLED, REASSIGNED, ACCESS_REMOVED, COMPLETED_ELSEWHERE, DELETED_REFERENCE }

data class OutboxOperation(val id:String,val organizationId:String,val type:OutboxType,val priority:Int,val createdOrder:Long,var state:OutboxState=OutboxState.QUEUED,var attemptCount:Int=0,var nextAttemptAtMs:Long?=null,val idempotencyKey:String?=null,val dependencies:MutableSet<String> = linkedSetOf(),var lastErrorCode:String?=null)
data class DeltaEntry(val id:String,val entityType:String,val entityId:String,val revision:Long?,val changeType:String,val payload:String="{}")
data class InboxBatch(val id:String,val organizationId:String,val priorCursor:String,val nextCursor:String,val entries:List<DeltaEntry>,var state:InboxApplyState=InboxApplyState.RECEIVED)
data class AssignmentSnapshot(val id:String,var revision:Long,var state:String,var tombstone:TombstoneType?=null)
data class ReconciliationCase(val id:String,val conflictType:String,val entityId:String,var status:ReconciliationStatus=ReconciliationStatus.OPEN,val actions:List<String>)
data class SubmissionAttempt(val attemptId:String,val idempotencyKey:String,val assignmentId:String,val assignmentRevisionUsed:Long,val payloadHash:String,val evidenceManifestHash:String)
