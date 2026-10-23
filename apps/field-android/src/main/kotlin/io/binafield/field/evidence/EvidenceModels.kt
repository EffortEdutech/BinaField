package io.binafield.field.evidence
enum class LocalEvidenceState { LOCAL_CAPTURED, QUEUED_FOR_UPLOAD, UPLOADING, UPLOADED, BOUND, PROCESSING, READY, FAILED, RETAINED, PURGED }
data class LocalEvidence(val attachmentId:String,val organizationId:String,val filePath:String,val byteSize:Long,val sha256:String,val required:Boolean,var state:LocalEvidenceState=LocalEvidenceState.LOCAL_CAPTURED,var uploadId:String?=null,var cleanupEligible:Boolean=false)
