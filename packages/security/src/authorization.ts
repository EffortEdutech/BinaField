export type PrincipalType='HUMAN'|'SERVICE'|'SYSTEM';
export type ScopeMode='ORG_WIDE'|'PROJECT_RESTRICTED';
export type PrincipalState='ACTIVE'|'INACTIVE'|'REVOKED';
export type DeviceState='ACTIVE'|'SUSPENDED'|'REVOKED'|'NOT_REGISTERED';
export interface ScopeBinding { scopeMode:ScopeMode; projectIds:string[] }
export interface PrincipalContext { principalType:PrincipalType; organizationId:string; membershipState?:PrincipalState; serviceState?:PrincipalState; deviceId?:string|null; deviceState?:DeviceState; permissions:Set<string>; scopes:ScopeBinding[]; recentAuth:boolean; authenticationStrength:string; securityPolicyVersion:string; correlationId:string }
export interface AuthorizationRequest { organizationId:string; permission:string; projectId?:string|null; deviceRequired?:boolean; stepUpRequired?:boolean; resourceEligible?:boolean; entityStateAllowed?:boolean; classificationPermission?:string|null }
export interface Decision { decision:'ALLOW'|'DENY'; reasonCode:string; policyVersion:string }
function deny(reasonCode:string,ctx:PrincipalContext):Decision{return {decision:'DENY',reasonCode,policyVersion:ctx.securityPolicyVersion}}
export function authorize(ctx:PrincipalContext,req:AuthorizationRequest):Decision {
  if(ctx.principalType==='HUMAN' && ctx.membershipState!=='ACTIVE') return deny(ctx.membershipState==='REVOKED'?'MEMBERSHIP_REVOKED':'MEMBERSHIP_INACTIVE',ctx);
  if(ctx.principalType==='SERVICE' && ctx.serviceState!=='ACTIVE') return deny('PERMISSION_DENIED',ctx);
  if(req.deviceRequired){ if(!ctx.deviceId||ctx.deviceState==='NOT_REGISTERED'||ctx.deviceState===undefined) return deny('DEVICE_NOT_REGISTERED',ctx); if(ctx.deviceState==='SUSPENDED') return deny('DEVICE_SUSPENDED',ctx); if(ctx.deviceState==='REVOKED') return deny('DEVICE_REVOKED',ctx); }
  if(ctx.organizationId!==req.organizationId) return deny('TENANT_MISMATCH',ctx);
  if(!ctx.permissions.has(req.permission)) return deny('PERMISSION_DENIED',ctx);
  if(req.projectId){ const ok=ctx.scopes.some(s=>s.scopeMode==='ORG_WIDE'||(s.scopeMode==='PROJECT_RESTRICTED'&&s.projectIds.includes(req.projectId!))); if(!ok) return deny('SCOPE_DENIED',ctx); }
  if(req.resourceEligible===false) return deny('RESOURCE_NOT_FOUND',ctx);
  if(req.entityStateAllowed===false) return deny('ENTITY_STATE_DENIED',ctx);
  if(req.classificationPermission && !ctx.permissions.has(req.classificationPermission)) return deny('CLASSIFICATION_RESTRICTED',ctx);
  if(req.stepUpRequired && !ctx.recentAuth) return deny('STEP_UP_REQUIRED',ctx);
  return {decision:'ALLOW',reasonCode:'ALLOW',policyVersion:ctx.securityPolicyVersion};
}
export interface AuthorizedQueryScope { organizationId:string; orgWide:boolean; projectIds:string[]; permissions:Set<string> }
export function buildAuthorizedQueryScope(ctx:PrincipalContext,permission:string):AuthorizedQueryScope {
  const d=authorize(ctx,{organizationId:ctx.organizationId,permission}); if(d.decision==='DENY') throw new Error(d.reasonCode);
  const orgWide=ctx.scopes.some(s=>s.scopeMode==='ORG_WIDE'); const projectIds=orgWide?[]:[...new Set(ctx.scopes.flatMap(s=>s.projectIds))].sort(); return {organizationId:ctx.organizationId,orgWide,projectIds,permissions:ctx.permissions};
}
