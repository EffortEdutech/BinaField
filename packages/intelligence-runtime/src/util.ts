import {createHash} from 'crypto';
export function sha256Text(v:string){return createHash('sha256').update(v).digest('hex')}
export function deterministicFactId(sourceIdentity:string,projectionVersion:string){return sha256Text(`${projectionVersion}|${sourceIdentity}`).slice(0,32)}
export function getPath(obj:any,path:string):any{let cur:any=obj;for(const part of path.split('.')){if(cur==null)return undefined;cur=cur[part]}return cur}
export function percentile(values:number[],p:number){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y);const idx=(a.length-1)*p;const lo=Math.floor(idx),hi=Math.ceil(idx);if(lo===hi)return a[lo];return a[lo]+(a[hi]-a[lo])*(idx-lo)}
export function median(values:number[]){return percentile(values,0.5)}
