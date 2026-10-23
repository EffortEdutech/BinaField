export type CompatibilityState='COMPATIBLE'|'CONVERTIBLE'|'INCOMPATIBLE'|'UNKNOWN';
export interface SemanticEntry {semantic_key:string;value_type:string;canonical_unit?:string|null;classification_default:string}
export interface CompatibilityEntry {semantic_key:string;source_template_version_id:string;target_template_version_id:string;state:CompatibilityState;conversion_key?:string|null}
export interface ConversionEntry {conversion_key:string;function_id:string;source_unit?:string|null;target_unit?:string|null;precision?:number}
export class SemanticRuntime {
 private semantics=new Map<string,SemanticEntry>(); private compat=new Map<string,CompatibilityEntry>(); private conversions=new Map<string,ConversionEntry>();
 constructor(entries:SemanticEntry[]=[],compat:CompatibilityEntry[]=[],conversions:ConversionEntry[]=[]){for(const e of entries)this.semantics.set(e.semantic_key,e);for(const c of compat)this.compat.set(this.ck(c.semantic_key,c.source_template_version_id,c.target_template_version_id),c);for(const c of conversions)this.conversions.set(c.conversion_key,c)}
 requireSemantic(k:string){const e=this.semantics.get(k);if(!e)throw new Error('SEMANTIC_KEY_UNKNOWN');return e}
 compatibility(k:string,source:string,target:string):CompatibilityEntry{this.requireSemantic(k);if(source===target)return {semantic_key:k,source_template_version_id:source,target_template_version_id:target,state:'COMPATIBLE'};return this.compat.get(this.ck(k,source,target))??{semantic_key:k,source_template_version_id:source,target_template_version_id:target,state:'UNKNOWN'}}
 convert(key:string,value:number){const c=this.conversions.get(key);if(!c)throw new Error('SEMANTIC_CONVERSION_MISSING');let x:number;switch(c.function_id){case 'DIVIDE_1000':x=value/1000;break;case 'MULTIPLY_1000':x=value*1000;break;case 'DIVIDE_60':x=value/60;break;default:throw new Error('SEMANTIC_CONVERSION_MISSING')}const p=c.precision??12;return Number(x.toFixed(p))}
 private ck(k:string,s:string,t:string){return `${k}|${s}|${t}`}
}
