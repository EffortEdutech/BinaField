package io.binafield.field.sync
class OutboxEngine {
  private val operations = linkedMapOf<String,OutboxOperation>()
  fun put(op:OutboxOperation) { require(op.priority in 0..3); operations[op.id]=op }
  fun get(id:String)=operations[id]
  fun markSucceeded(id:String){ operations.getValue(id).state=OutboxState.SUCCEEDED }
  fun markRetry(id:String, error:String, nextAt:Long){ operations.getValue(id).apply { state=OutboxState.RETRY_WAIT; attemptCount++; lastErrorCode=error; nextAttemptAtMs=nextAt } }
  fun runnable(nowMs:Long):List<OutboxOperation>{
    val success=operations.filterValues{it.state==OutboxState.SUCCEEDED}.keys
    return operations.values.filter { op ->
      (op.state==OutboxState.QUEUED || (op.state==OutboxState.RETRY_WAIT && (op.nextAttemptAtMs?:0)<=nowMs)) && op.dependencies.all{it in success}
    }.sortedWith(compareBy<OutboxOperation>{it.priority}.thenBy{it.createdOrder})
  }
  fun refreshDependencyStates(){
    val success=operations.filterValues{it.state==OutboxState.SUCCEEDED}.keys
    operations.values.filter{it.state==OutboxState.QUEUED || it.state==OutboxState.BLOCKED_DEPENDENCY}.forEach{op->
      op.state=if(op.dependencies.all{it in success}) OutboxState.QUEUED else OutboxState.BLOCKED_DEPENDENCY
    }
  }
}
