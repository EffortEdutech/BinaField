export type Classification='PUBLIC_OPERATIONAL'|'INTERNAL'|'CONFIDENTIAL'|'PERSONAL_DATA'|'SENSITIVE_OPERATIONAL';
const required:Record<Classification,string|null>={PUBLIC_OPERATIONAL:null,INTERNAL:null,CONFIDENTIAL:'data.confidential.read',PERSONAL_DATA:'data.personal.read',SENSITIVE_OPERATIONAL:'data.sensitive_operational.read'};
export function fieldVisibility(classification:Classification,permissions:Set<string>):'VISIBLE'|'MASKED'|'OMITTED'{const p=required[classification];if(!p||permissions.has(p))return 'VISIBLE';return classification==='SENSITIVE_OPERATIONAL'?'OMITTED':'MASKED'}
