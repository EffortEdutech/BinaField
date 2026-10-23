export type MalwareScanResult='CLEAN'|'SUSPECTED'|'UNAVAILABLE';
export interface MalwareScannerPort { scan(bytes:Uint8Array,claimedMimeType:string):Promise<MalwareScanResult>; }
