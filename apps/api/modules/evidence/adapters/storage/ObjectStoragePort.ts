export interface StoredObjectHead { key:string; size:number; contentType:string; }
export interface ObjectStoragePort {
  putObject(key:string, bytes:Uint8Array, contentType:string):Promise<{etag:string}>;
  putPart(uploadRef:string, partNumber:number, bytes:Uint8Array):Promise<{etag:string}>;
  completeMultipart(uploadRef:string, orderedParts:Array<{partNumber:number,etag:string}>, destinationKey:string, contentType:string):Promise<void>;
  headObject(key:string):Promise<StoredObjectHead|null>;
  readObject(key:string):Promise<Uint8Array>;
  deleteObject(key:string):Promise<void>;
  copyObjectVerified(sourceKey:string,destKey:string):Promise<void>;
}
