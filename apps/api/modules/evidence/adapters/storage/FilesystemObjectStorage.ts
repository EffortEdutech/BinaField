import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { ObjectStoragePort, StoredObjectHead } from './ObjectStoragePort';
export class FilesystemObjectStorage implements ObjectStoragePort {
  constructor(private readonly root:string){}
  private safe(key:string){ if(key.includes('..')||path.isAbsolute(key)) throw new Error('UNSAFE_OBJECT_KEY'); return path.join(this.root,key); }
  async putObject(key:string,bytes:Uint8Array,contentType:string){const p=this.safe(key);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,bytes);await fs.writeFile(p+'.meta.json',JSON.stringify({contentType}));return {etag:createHash('sha256').update(bytes).digest('hex')};}
  async putPart(uploadRef:string,partNumber:number,bytes:Uint8Array){return this.putObject(`.multipart/${uploadRef}/${partNumber}.part`,bytes,'application/octet-stream');}
  async completeMultipart(uploadRef:string,parts:Array<{partNumber:number,etag:string}>,destinationKey:string,contentType:string){const ordered=[...parts].sort((a,b)=>a.partNumber-b.partNumber); const chunks:Buffer[]=[];for(const p of ordered)chunks.push(Buffer.from(await this.readObject(`.multipart/${uploadRef}/${p.partNumber}.part`))); await this.putObject(destinationKey,Buffer.concat(chunks),contentType);for(const p of ordered)await this.deleteObject(`.multipart/${uploadRef}/${p.partNumber}.part`);}
  async headObject(key:string):Promise<StoredObjectHead|null>{try{const st=await fs.stat(this.safe(key));const meta=JSON.parse(await fs.readFile(this.safe(key)+'.meta.json','utf8').catch(()=>'{"contentType":"application/octet-stream"}'));return {key,size:st.size,contentType:meta.contentType};}catch{return null}}
  async readObject(key:string){return new Uint8Array(await fs.readFile(this.safe(key)));}
  async deleteObject(key:string){await fs.rm(this.safe(key),{force:true});await fs.rm(this.safe(key)+'.meta.json',{force:true});}
  async copyObjectVerified(sourceKey:string,destKey:string){const bytes=await this.readObject(sourceKey);const head=await this.headObject(sourceKey);await this.putObject(destKey,bytes,head?.contentType||'application/octet-stream');}
}
