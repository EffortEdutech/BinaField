export interface EventReceiptState{processedEventIds:Set<string>;aggregateRevisions:Map<string,number>}
export interface IncomingEvent{eventId:string;aggregateId:string;aggregateRevision:number}
export type EventDecision='PROCESS'|'DUPLICATE'|'STALE_OR_OUT_OF_ORDER';
export function decideEvent(s:EventReceiptState,e:IncomingEvent):EventDecision{if(s.processedEventIds.has(e.eventId))return'DUPLICATE';const seen=s.aggregateRevisions.get(e.aggregateId);if(seen!==undefined&&e.aggregateRevision<=seen)return'STALE_OR_OUT_OF_ORDER';return'PROCESS';}
export function recordProcessed(s:EventReceiptState,e:IncomingEvent):void{s.processedEventIds.add(e.eventId);s.aggregateRevisions.set(e.aggregateId,e.aggregateRevision);}
