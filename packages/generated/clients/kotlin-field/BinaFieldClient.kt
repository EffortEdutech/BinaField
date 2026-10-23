// GENERATED from BF-P1-05/P1-06 machine registries. DO NOT EDIT.
package io.binafield.generated

const val API_SECURITY_CONTRACT_SIGNATURE: String = "9c30bafff38c0eb45b07df84ace1b39e80b54ad980d5b1a9dacef15776179594"
data class OperationSpec(val operationId:String,val method:String,val path:String,val permission:String,val deviceRequired:Boolean,val idempotency:String)
val OPERATIONS: List<OperationSpec> = listOf(
    OperationSpec("listProjects", "GET", "/organizations/{organization_id}/projects", "project.read", false, "NONE"),
    OperationSpec("createProject", "POST", "/organizations/{organization_id}/projects", "project.create", false, "REQUIRED"),
    OperationSpec("getProject", "GET", "/organizations/{organization_id}/projects/{project_id}", "project.read", false, "NONE"),
    OperationSpec("updateProject", "PATCH", "/organizations/{organization_id}/projects/{project_id}", "project.update", false, "RECOMMENDED"),
    OperationSpec("archiveProject", "POST", "/organizations/{organization_id}/projects/{project_id}:archive", "project.archive", false, "REQUIRED"),
    OperationSpec("listTemplates", "GET", "/organizations/{organization_id}/templates", "template.read", false, "NONE"),
    OperationSpec("createTemplate", "POST", "/organizations/{organization_id}/templates", "template.create", false, "REQUIRED"),
    OperationSpec("getTemplate", "GET", "/organizations/{organization_id}/templates/{template_id}", "template.read", false, "NONE"),
    OperationSpec("createTemplateVersion", "POST", "/organizations/{organization_id}/templates/{template_id}/versions", "template.create", false, "REQUIRED"),
    OperationSpec("getTemplateVersion", "GET", "/organizations/{organization_id}/template-versions/{template_version_id}", "template.read", false, "NONE"),
    OperationSpec("updateDraftBlueprint", "PUT", "/organizations/{organization_id}/template-versions/{template_version_id}/blueprint", "template.edit_draft", false, "RECOMMENDED"),
    OperationSpec("validateTemplateVersion", "POST", "/organizations/{organization_id}/template-versions/{template_version_id}:validate", "template.validate", false, "RECOMMENDED"),
    OperationSpec("publishTemplateVersion", "POST", "/organizations/{organization_id}/template-versions/{template_version_id}:publish", "template.publish", false, "REQUIRED"),
    OperationSpec("listDeployments", "GET", "/organizations/{organization_id}/deployments", "deployment.read", false, "NONE"),
    OperationSpec("createDeployment", "POST", "/organizations/{organization_id}/deployments", "deployment.create", false, "REQUIRED"),
    OperationSpec("activateDeployment", "POST", "/organizations/{organization_id}/deployments/{deployment_id}:activate", "deployment.activate", false, "REQUIRED"),
    OperationSpec("pauseDeployment", "POST", "/organizations/{organization_id}/deployments/{deployment_id}:pause", "deployment.pause", false, "REQUIRED"),
    OperationSpec("closeDeployment", "POST", "/organizations/{organization_id}/deployments/{deployment_id}:close", "deployment.close", false, "REQUIRED"),
    OperationSpec("listAssignments", "GET", "/organizations/{organization_id}/assignments", "assignment.read", false, "NONE"),
    OperationSpec("createAssignment", "POST", "/organizations/{organization_id}/assignments", "assignment.create", false, "REQUIRED"),
    OperationSpec("getAssignment", "GET", "/organizations/{organization_id}/assignments/{assignment_id}", "assignment.read", false, "NONE"),
    OperationSpec("issueAssignment", "POST", "/organizations/{organization_id}/assignments/{assignment_id}:issue", "assignment.issue", false, "REQUIRED"),
    OperationSpec("reassignAssignment", "POST", "/organizations/{organization_id}/assignments/{assignment_id}:reassign", "assignment.reassign", false, "REQUIRED"),
    OperationSpec("cancelAssignment", "POST", "/organizations/{organization_id}/assignments/{assignment_id}:cancel", "assignment.cancel", false, "REQUIRED"),
    OperationSpec("listSubmissions", "GET", "/organizations/{organization_id}/submissions", "submission.read", false, "NONE"),
    OperationSpec("getSubmission", "GET", "/organizations/{organization_id}/submissions/{submission_id}", "submission.read", false, "NONE"),
    OperationSpec("listSubmissionEvidence", "GET", "/organizations/{organization_id}/submissions/{submission_id}/evidence", "evidence.read", false, "NONE"),
    OperationSpec("fieldBootstrap", "POST", "/organizations/{organization_id}/field/bootstrap", "assignment.read", true, "NONE"),
    OperationSpec("fieldDelta", "GET", "/organizations/{organization_id}/field/delta", "assignment.read", true, "NONE"),
    OperationSpec("acknowledgeFieldDelta", "POST", "/organizations/{organization_id}/field/acknowledgements", "assignment.execute", true, "REQUIRED"),
    OperationSpec("receiveSubmissionAttempt", "POST", "/organizations/{organization_id}/field/submission-attempts", "submission.create", true, "REQUIRED"),
    OperationSpec("getSubmissionAttemptOutcome", "GET", "/organizations/{organization_id}/field/submission-attempts/{attempt_id}/outcome", "submission.acceptance.read", true, "NONE"),
    OperationSpec("initiateEvidenceUpload", "POST", "/organizations/{organization_id}/evidence/uploads", "evidence.capture", true, "REQUIRED"),
    OperationSpec("finalizeEvidenceUpload", "POST", "/organizations/{organization_id}/evidence/uploads/{upload_id}:finalize", "evidence.capture", true, "REQUIRED"),
    OperationSpec("getEvidenceStatus", "GET", "/organizations/{organization_id}/evidence/{attachment_id}/status", "evidence.read", false, "NONE"),
    OperationSpec("requestEvidenceDownload", "POST", "/organizations/{organization_id}/evidence/{attachment_id}:request-download", "evidence.download", false, "REQUIRED"),
    OperationSpec("listMetrics", "GET", "/organizations/{organization_id}/analytics/metrics", "analytics.read", false, "NONE"),
    OperationSpec("queryMetric", "POST", "/organizations/{organization_id}/analytics/query", "analytics.read", false, "NONE"),
    OperationSpec("drilldownMetric", "POST", "/organizations/{organization_id}/analytics/drilldown", "analytics.read", false, "NONE"),
    OperationSpec("listInsights", "GET", "/organizations/{organization_id}/analytics/insights", "analytics.read", false, "NONE"),
)
interface Transport { fun request(method:String,path:String,headers:Map<String,String>,body:String? = null): TransportResponse }
data class TransportResponse(val status:Int,val headers:Map<String,String>,val body:String?)
class BinaFieldClient(private val transport:Transport) {
  fun call(operationId:String,organizationId:String,pathParams:Map<String,String> = emptyMap(),body:String? = null,idempotencyKey:String? = null,ifMatch:String? = null,correlationId:String? = null):TransportResponse {
    val spec=OPERATIONS.firstOrNull{it.operationId==operationId} ?: error("UNKNOWN_OPERATION")
    if(spec.idempotency=="REQUIRED" && idempotencyKey==null) error("IDEMPOTENCY_KEY_REQUIRED")
    var path="/api/v1"+spec.path.replace("{organization_id}",organizationId)
    for((k,v) in pathParams) path=path.replace("{$k}",v)
    val h=mutableMapOf("Accept" to "application/json")
    if(body!=null) h["Content-Type"]="application/json"
    if(idempotencyKey!=null) h["Idempotency-Key"]=idempotencyKey
    if(ifMatch!=null) h["If-Match"]=ifMatch
    if(correlationId!=null) h["X-Correlation-Id"]=correlationId
    return transport.request(spec.method,path,h,body)
  }
}
