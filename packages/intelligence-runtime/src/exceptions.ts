import {MetricResult} from './models';import {median} from './util';
export interface ExceptionDefinition{exception_key:string;version:number;source_metric:string;condition:'GT'|'GTE'|'LT'|'LTE'|'EQ'|'NEQ';threshold:number;window:string;minimum_sample?:number;severity:string;message_template:string;active:boolean}
export interface ExceptionOccurrence{exceptionKey:string;version:number;severity:string;observedValue:number;threshold:number;explanation:string;sourceMetric:string;sourceRecordCount:number|null}
function compare(v:number,op:string,t:number){switch(op){case'GT':return v>t;case'GTE':return v>=t;case'LT':return v<t;case'LTE':return v<=t;case'EQ':return v===t;case'NEQ':return v!==t;default:return false}}
export class ExceptionEngine{evaluate(def:ExceptionDefinition,result:MetricResult){if(!def.active||result.metricKey!==def.source_metric||result.value==null)return null;if((result.sourceRecordCount??0)<(def.minimum_sample??1))return null;if(!compare(result.value,def.condition,def.threshold))return null;return {exceptionKey:def.exception_key,version:def.version,severity:def.severity,observedValue:result.value,threshold:def.threshold,explanation:def.message_template.replace('{value}',String(result.value)),sourceMetric:result.metricKey,sourceRecordCount:result.sourceRecordCount} as ExceptionOccurrence}}
export const anomaly={
 threshold:(value:number,operator:string,threshold:number)=>({score:value-threshold,triggered:compare(value,operator,threshold)}),
 percentChange:(current:number,baseline:number)=>baseline===0?null:(current-baseline)/Math.abs(baseline)*100,
 rollingMeanDeviation:(current:number,history:number[])=>{if(history.length<3)return null;const m=history.reduce((a,b)=>a+b,0)/history.length;return (current-m)/(Math.abs(m)||1)},
 rollingMedianDeviation:(current:number,history:number[])=>{if(history.length<3)return null;const m=median(history)!;return (current-m)/(Math.abs(m)||1)},
 zScore:(current:number,history:number[])=>{if(history.length<5)return null;const m=history.reduce((a,b)=>a+b,0)/history.length;const sd=Math.sqrt(history.reduce((s,x)=>s+(x-m)**2,0)/history.length);return sd===0?0:(current-m)/sd},
 robustZScore:(current:number,history:number[])=>{if(history.length<5)return null;const m=median(history)!;const mad=median(history.map(x=>Math.abs(x-m)))!;return mad===0?0:0.6745*(current-m)/mad},
 missingnessSpike:(currentRate:number,baselineRate:number)=>currentRate-baselineRate,
 categoryRateShift:(currentRate:number,baselineRate:number)=>Math.abs(currentRate-baselineRate),
 locationConcentration:(counts:number[])=>{const total=counts.reduce((a,b)=>a+b,0);return total?Math.max(...counts)/total:null}
}
