// GENERATED — DO NOT EDIT. Source: packages/domain/registry/*.json
package com.binafield.contracts.domain

const val DOMAIN_CONTRACT_SIGNATURE: String = "2c9476cffd22d9a76d1a0d8b5ed78a10b41230f1abc5944aad526142290781dc"

enum class TemplateState { DRAFT, ACTIVE, SUSPENDED, ARCHIVED }
enum class TemplateVersionState { DRAFT, VALIDATED, PUBLISHED, ACTIVE, SUPERSEDED, ARCHIVED }
enum class DeploymentState { DRAFT, SCHEDULED, ACTIVE, PAUSED, CLOSED, ARCHIVED }
enum class AssignmentState { PLANNED, ASSIGNED, IN_PROGRESS, SUBMITTED, COMPLETED, CANCELLED }
enum class SubmissionSessionState { CREATED, IN_PROGRESS, COMPLETE, SUBMITTED, ABANDONED }
enum class SyncState { LOCAL_ONLY, QUEUED, SYNCING, SYNC_FAILED, RECONCILIATION_REQUIRED, SYNCED }
enum class SubmissionState { RECEIVED, VALIDATING, ACCEPTED, REJECTED }
enum class EvidenceState { LOCAL_ONLY, UPLOAD_PENDING, UPLOADING, UPLOADED, VERIFYING, VERIFIED, BOUND, READY, QUARANTINED, PURGED }
enum class WorkflowRunState { QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED }
enum class AnalyticalProjectionState { PENDING, BUILDING, CURRENT, STALE, FAILED, REBUILDING }
enum class MembershipState { INVITED, ACTIVE, SUSPENDED, REVOKED }
enum class DeviceState { REGISTERED, ACTIVE, SUSPENDED, REVOKED }
enum class ProjectState { DRAFT, ACTIVE, CLOSED, ARCHIVED }

object DomainTransitions {
    val Template: Set<String> = setOf("DRAFT->ACTIVE", "ACTIVE->SUSPENDED", "SUSPENDED->ACTIVE", "ACTIVE->ARCHIVED", "SUSPENDED->ARCHIVED")
    val TemplateVersion: Set<String> = setOf("DRAFT->VALIDATED", "VALIDATED->DRAFT", "VALIDATED->PUBLISHED", "PUBLISHED->ACTIVE", "ACTIVE->SUPERSEDED", "PUBLISHED->ARCHIVED", "SUPERSEDED->ARCHIVED")
    val Deployment: Set<String> = setOf("DRAFT->SCHEDULED", "DRAFT->ACTIVE", "SCHEDULED->ACTIVE", "ACTIVE->PAUSED", "PAUSED->ACTIVE", "ACTIVE->CLOSED", "PAUSED->CLOSED", "CLOSED->ARCHIVED")
    val Assignment: Set<String> = setOf("PLANNED->ASSIGNED", "ASSIGNED->IN_PROGRESS", "IN_PROGRESS->SUBMITTED", "SUBMITTED->COMPLETED", "PLANNED->CANCELLED", "ASSIGNED->CANCELLED", "IN_PROGRESS->CANCELLED")
    val SubmissionSession: Set<String> = setOf("CREATED->IN_PROGRESS", "IN_PROGRESS->COMPLETE", "COMPLETE->IN_PROGRESS", "COMPLETE->SUBMITTED", "CREATED->ABANDONED", "IN_PROGRESS->ABANDONED", "COMPLETE->ABANDONED")
    val Sync: Set<String> = setOf("LOCAL_ONLY->QUEUED", "QUEUED->SYNCING", "SYNCING->SYNCED", "SYNCING->SYNC_FAILED", "SYNC_FAILED->QUEUED", "SYNCING->RECONCILIATION_REQUIRED", "RECONCILIATION_REQUIRED->QUEUED")
    val Submission: Set<String> = setOf("RECEIVED->VALIDATING", "VALIDATING->ACCEPTED", "VALIDATING->REJECTED")
    val Evidence: Set<String> = setOf("LOCAL_ONLY->UPLOAD_PENDING", "UPLOAD_PENDING->UPLOADING", "UPLOADING->UPLOADED", "UPLOADED->VERIFYING", "VERIFYING->VERIFIED", "VERIFYING->QUARANTINED", "VERIFIED->BOUND", "BOUND->READY", "QUARANTINED->PURGED", "READY->PURGED")
    val WorkflowRun: Set<String> = setOf("QUEUED->RUNNING", "RUNNING->SUCCEEDED", "RUNNING->FAILED", "QUEUED->CANCELLED", "RUNNING->CANCELLED")
    val AnalyticalProjection: Set<String> = setOf("PENDING->BUILDING", "BUILDING->CURRENT", "BUILDING->FAILED", "CURRENT->STALE", "STALE->REBUILDING", "FAILED->REBUILDING", "REBUILDING->CURRENT", "REBUILDING->FAILED")
    val Membership: Set<String> = setOf("INVITED->ACTIVE", "INVITED->REVOKED", "ACTIVE->SUSPENDED", "SUSPENDED->ACTIVE", "ACTIVE->REVOKED", "SUSPENDED->REVOKED")
    val Device: Set<String> = setOf("REGISTERED->ACTIVE", "REGISTERED->REVOKED", "ACTIVE->SUSPENDED", "SUSPENDED->ACTIVE", "ACTIVE->REVOKED", "SUSPENDED->REVOKED")
    val Project: Set<String> = setOf("DRAFT->ACTIVE", "ACTIVE->CLOSED", "CLOSED->ARCHIVED")
    fun canTransition(entity: String, from: String, to: String): Boolean { val key="$from->$to"; return when(entity) {
        "Template" -> Template.contains(key)
        "TemplateVersion" -> TemplateVersion.contains(key)
        "Deployment" -> Deployment.contains(key)
        "Assignment" -> Assignment.contains(key)
        "SubmissionSession" -> SubmissionSession.contains(key)
        "Sync" -> Sync.contains(key)
        "Submission" -> Submission.contains(key)
        "Evidence" -> Evidence.contains(key)
        "WorkflowRun" -> WorkflowRun.contains(key)
        "AnalyticalProjection" -> AnalyticalProjection.contains(key)
        "Membership" -> Membership.contains(key)
        "Device" -> Device.contains(key)
        "Project" -> Project.contains(key)
        else -> false
    } }
}
