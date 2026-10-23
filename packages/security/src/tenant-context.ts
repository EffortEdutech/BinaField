export interface SqlExecutor { query(sql:string,params?:readonly unknown[]):Promise<unknown> }
export interface DbTenantContext { organizationId:string; principalType:'HUMAN'|'SERVICE'|'SYSTEM'; membershipId?:string|null; correlationId:string }
export async function setTransactionTenantContext(db:SqlExecutor,c:DbTenantContext):Promise<void>{
  // Values are passed as parameters into set_config; do not interpolate request values into SQL. The third argument true = transaction-local.
  await db.query("SELECT set_config('app.organization_id', $1, true), set_config('app.principal_type', $2, true), set_config('app.membership_id', $3, true), set_config('app.correlation_id', $4, true)",[c.organizationId,c.principalType,c.membershipId??'',c.correlationId]);
}
export interface TenantRepository<T>{ getById(organizationId:string,id:string):Promise<T|null>; list(scope:{organizationId:string;projectIds?:readonly string[]}):Promise<readonly T[]> }
