export interface IdempotencyRecord { organizationId:string; key:string; operation:string; requestHash:string; status:'IN_PROGRESS'|'COMPLETED'|'FAILED'; resultRef?:string }
export type ReplayDecision={kind:'NEW'}|{kind:'REPLAY';record:IdempotencyRecord}|{kind:'CONFLICT'};
export function decideIdempotency(existing:IdempotencyRecord|undefined,incoming:{organizationId:string;key:string;operation:string;requestHash:string}):ReplayDecision{
 if(!existing)return{kind:'NEW'};
 if(existing.organizationId!==incoming.organizationId)return{kind:'NEW'}; // tenant-scoped key space
 if(existing.key!==incoming.key||existing.operation!==incoming.operation)return{kind:'NEW'};
 if(existing.requestHash!==incoming.requestHash)return{kind:'CONFLICT'};
 return{kind:'REPLAY',record:existing};
}
