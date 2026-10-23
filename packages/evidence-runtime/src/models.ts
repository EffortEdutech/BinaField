export type EvidenceState='LOCAL_CAPTURED'|'QUEUED_FOR_UPLOAD'|'UPLOADING'|'UPLOADED'|'BOUND'|'PROCESSING'|'READY'|'FAILED'|'RETAINED'|'PURGED';
export type IntegrityState='PENDING'|'VERIFIED'|'FAILED'|'QUARANTINED';
export type UploadState='INITIALISED'|'UPLOADING'|'UPLOAD_COMPLETE'|'VERIFYING'|'VERIFIED'|'FAILED'|'EXPIRED'|'ABORTED';
export interface Attachment { attachmentId:string; organizationId:string; evidenceRole:'ORIGINAL'|'DERIVATIVE'; parentAttachmentId?:string; evidenceType:'PHOTO'|'SIGNATURE'|'FILE_ATTACHMENT'; expectedSha256:string; byteSize:number; claimedMimeType:string; storageKey?:string; storageProvider?:string; state:EvidenceState; integrityState:IntegrityState; bindingState:'UNBOUND'|'BOUND'; classification:'INTERNAL'|'CONFIDENTIAL'|'PERSONAL_DATA'|'SENSITIVE_OPERATIONAL'; }
export interface UploadSession { uploadId:string; attachmentId:string; organizationId:string; expectedSha256:string; expectedSize:number; strategy:'SINGLE_PUT'|'MULTIPART'; state:UploadState; expiresAt:number; parts:Map<number,{bytes:number,etag:string}>; }
export interface ManifestEntry {attachmentId:string;fieldId:string;required:boolean;sha256:string;byteSize:number;}
