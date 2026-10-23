package io.binafield.field.sync
class ReconciliationEngine {
  fun forServerConflict(caseId:String, entityId:String, code:String)= when(code){
    "ASSIGNMENT_CANCELLED" -> ReconciliationCase(caseId,code,entityId,ReconciliationStatus.AWAITING_USER,listOf("ACKNOWLEDGE_SERVER_STATE","KEEP_LOCAL_FOR_REFERENCE","CONTACT_SUPERVISOR"))
    "ASSIGNMENT_REASSIGNED" -> ReconciliationCase(caseId,code,entityId,ReconciliationStatus.AWAITING_USER,listOf("ACKNOWLEDGE_SERVER_STATE","KEEP_LOCAL_FOR_REFERENCE","CONTACT_SUPERVISOR"))
    "CURSOR_INVALID" -> ReconciliationCase(caseId,code,entityId,ReconciliationStatus.AWAITING_SERVER,listOf("RETRY_AFTER_REFRESH"))
    else -> ReconciliationCase(caseId,code,entityId,ReconciliationStatus.OPEN,listOf("CONTACT_SUPERVISOR"))
  }
  fun resolve(c:ReconciliationCase, action:String){ require(action in c.actions); c.status=ReconciliationStatus.RESOLVED }
}
