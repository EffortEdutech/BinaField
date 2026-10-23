import {decideIdempotency,assertExpectedRevision,decideEvent,recordProcessed} from '../../packages/api-contract/src/index';
function eq(a:unknown,b:unknown,m:string){if(a!==b)throw new Error(`${m}: ${String(a)} != ${String(b)}`)}
const existing={organizationId:'org-a',key:'k',operation:'ReceiveSubmissionAttempt',requestHash:'aaa',status:'COMPLETED' as const,resultRef:'s1'};
eq(decideIdempotency(existing,{organizationId:'org-a',key:'k',operation:'ReceiveSubmissionAttempt',requestHash:'aaa'}).kind,'REPLAY','idem replay');
eq(decideIdempotency(existing,{organizationId:'org-a',key:'k',operation:'ReceiveSubmissionAttempt',requestHash:'bbb'}).kind,'CONFLICT','idem conflict');
eq(decideIdempotency(existing,{organizationId:'org-b',key:'k',operation:'ReceiveSubmissionAttempt',requestHash:'aaa'}).kind,'NEW','tenant scoped idem');
assertExpectedRevision('W/"rev-17"',17); let conflict=false; try{assertExpectedRevision('W/"rev-17"',18)}catch(e){conflict=(e as Error).message==='REVISION_CONFLICT'} eq(conflict,true,'revision conflict');
const state={processedEventIds:new Set<string>(),aggregateRevisions:new Map<string,number>()}; const e={eventId:'e1',aggregateId:'a1',aggregateRevision:8}; eq(decideEvent(state,e),'PROCESS','event process');recordProcessed(state,e);eq(decideEvent(state,e),'DUPLICATE','event duplicate');eq(decideEvent(state,{eventId:'e2',aggregateId:'a1',aggregateRevision:7}),'STALE_OR_OUT_OF_ORDER','event stale');
console.log('API_CONTRACT_SMOKE_PASS');
