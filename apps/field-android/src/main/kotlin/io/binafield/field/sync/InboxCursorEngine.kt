package io.binafield.field.sync
class InboxCursorEngine(initialCursor:String="0") {
  var cursor:String=initialCursor; private set
  val assignments=linkedMapOf<String,AssignmentSnapshot>()
  val appliedDeltaIds=linkedSetOf<String>()
  fun applyDurably(batch:InboxBatch, failBeforeCursor:Boolean=false):Boolean {
    require(batch.priorCursor==cursor) { "CURSOR_MISMATCH" }
    batch.state=InboxApplyState.APPLYING
    for(e in batch.entries){
      if(!appliedDeltaIds.add(e.id)) continue
      if(e.entityType=="ASSIGNMENT"){
        val existing=assignments[e.entityId]
        if(e.revision!=null && existing!=null && e.revision < existing.revision) continue
        val state=if(e.changeType=="TOMBSTONE") "TOMBSTONED" else parseState(e.payload)
        val rev=e.revision?:existing?.revision?:0L
        assignments[e.entityId]=AssignmentSnapshot(e.entityId,rev,state,parseTombstone(e.payload))
      }
    }
    batch.state=InboxApplyState.APPLIED
    if(failBeforeCursor) return false
    cursor=batch.nextCursor
    return true
  }
  private fun parseState(p:String)=Regex("\\\"state\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").find(p)?.groupValues?.get(1)?:"UNKNOWN"
  private fun parseTombstone(p:String)=Regex("\\\"tombstone_type\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").find(p)?.groupValues?.get(1)?.let{TombstoneType.valueOf(it)}
}
