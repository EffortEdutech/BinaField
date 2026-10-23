import {MalwareScannerPort,MalwareScanResult} from '../../../../../../packages/evidence-runtime/src/scanner';
/** Conformance/dev-only scanner. Production must replace this with a real isolated malware scanner integration. */
export class AllowAllConformanceScanner implements MalwareScannerPort { async scan(_bytes:Uint8Array,_claimedMimeType:string):Promise<MalwareScanResult>{return 'CLEAN';} }
