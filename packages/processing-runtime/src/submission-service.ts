import {createHash} from 'crypto';
import {decideIdempotency,IdempotencyRecord} from '../../api-contract/src/idempotency';
import {AssignmentSnapshot,SubmissionAttemptInput,AcceptedSubmission,ProcessingResult,ProcessingEvent} from './models';
function deterministic(prefix:string,value:string){return `${prefix}-${createHash('sha256').update(value).digest('hex').slice(0,24)}`}
export class SubmissionProcessingService {
 readonly idempotency=new Map<string,IdempotencyRecord>();
 readonly attempts=new Map<string,SubmissionAttemptInput>();
 readonly submissions=new Map<string,AcceptedSubmission>();
 readonly events:ProcessingEvent[]=[];
 constructor(private now:()=>string=()=>new Date().toISOString()){}
 process(attempt:SubmissionAttemptInput,assignment:AssignmentSnapshot,evidenceSatisfied:boolean):ProcessingResult{
  if(attempt.organizationId!==assignment.organizationId)return {kind:'RECONCILIATION',code:'TENANT_MISMATCH',replayed:false};
  if(attempt.assignmentId!==assignment.assignmentId)return {kind:'RECONCILIATION',code:'ASSIGNMENT_MISMATCH',replayed:false};
  if(assignment.state==='CANCELLED')return {kind:'RECONCILIATION',code:'ASSIGNMENT_CANCELLED',replayed:false};
  if(attempt.assignmentRevisionUsed!==assignment.revision)return {kind:'RECONCILIATION',code:'ASSIGNMENT_REVISION_STALE',replayed:false};
  const idemKey=`${attempt.organizationId}:${attempt.idempotencyKey}:ReceiveSubmissionAttempt`;
  const existing=this.idempotency.get(idemKey);
  const decision=decideIdempotency(existing,{organizationId:attempt.organizationId,key:attempt.idempotencyKey,operation:'ReceiveSubmissionAttempt',requestHash:attempt.requestHash});
  if(decision.kind==='CONFLICT')return {kind:'BLOCKED',code:'IDEMPOTENCY_KEY_REUSE',replayed:false};
  if(decision.kind==='REPLAY'){
   const sub=decision.record.resultRef?[...this.submissions.values()].find(s=>s.submissionId===decision.record.resultRef):undefined;
   return sub?{kind:'REPLAY',submission:sub,replayed:true}:{kind:'BLOCKED',code:'IDEMPOTENCY_INCOMPLETE',replayed:true};
  }
  const frozen=structuredClone(attempt);this.attempts.set(`${attempt.organizationId}:${attempt.attemptId}`,frozen);
  const receivedAt=this.now();this.events.push({eventId:deterministic('evt-received',attempt.attemptId),eventType:'SubmissionReceived',organizationId:attempt.organizationId,aggregateId:attempt.attemptId,aggregateRevision:1,occurredAt:receivedAt,payload:{assignmentId:attempt.assignmentId}});
  const record:IdempotencyRecord={organizationId:attempt.organizationId,key:attempt.idempotencyKey,operation:'ReceiveSubmissionAttempt',requestHash:attempt.requestHash,status:'IN_PROGRESS'};this.idempotency.set(idemKey,record);
  if(!evidenceSatisfied){record.status='FAILED';return {kind:'BLOCKED',code:'EVIDENCE_REQUIRED_NOT_READY',replayed:false};}
  const submissionId=deterministic('sub',`${attempt.organizationId}:${attempt.attemptId}`);const acceptedAt=this.now();
  const submission:AcceptedSubmission={organizationId:attempt.organizationId,projectId:attempt.projectId,assignmentId:attempt.assignmentId,attemptId:attempt.attemptId,submissionId,state:'ACCEPTED',templateId:attempt.templateId,templateVersionId:attempt.templateVersionId,blueprintHash:attempt.blueprintHash,payload:structuredClone(attempt.payload),acceptedAt,clientSubmittedAt:attempt.clientSubmittedAt,deviceId:attempt.deviceId};
  this.submissions.set(`${attempt.organizationId}:${submissionId}`,submission);record.status='COMPLETED';record.resultRef=submissionId;
  this.events.push({eventId:deterministic('evt-accepted',submissionId),eventType:'SubmissionAccepted',organizationId:attempt.organizationId,aggregateId:submissionId,aggregateRevision:1,occurredAt:acceptedAt,payload:{assignmentId:attempt.assignmentId,attemptId:attempt.attemptId}});
  this.events.push({eventId:deterministic('evt-assignment',assignment.assignmentId),eventType:'AssignmentCompleted',organizationId:attempt.organizationId,aggregateId:assignment.assignmentId,aggregateRevision:assignment.revision+1,occurredAt:acceptedAt,payload:{submissionId}});
  return {kind:'ACCEPTED',submission,replayed:false};
 }
}
