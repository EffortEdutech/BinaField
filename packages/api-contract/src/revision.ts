export function parseWeakRevisionEtag(value:string):number{const m=/^W\/"rev-([1-9][0-9]*)"$/.exec(value);if(!m)throw new Error('INVALID_ETAG');return Number(m[1]);}
export function assertExpectedRevision(etag:string,currentRevision:number):void{if(parseWeakRevisionEtag(etag)!==currentRevision)throw new Error('REVISION_CONFLICT');}
