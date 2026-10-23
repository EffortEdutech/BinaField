package io.binafield.field.sync
import kotlin.math.pow
class RetryPolicy(private val initialMs:Long=1_000, private val multiplier:Double=2.0, private val maxMs:Long=300_000, private val jitterFraction:Double=0.2) {
  fun delayMs(attempt:Int, jitterUnit:Double=0.5):Long {
    require(attempt>=1); require(jitterUnit in 0.0..1.0)
    val raw=(initialMs*multiplier.pow((attempt-1).toDouble())).coerceAtMost(maxMs.toDouble())
    val factor=1.0-jitterFraction + (2*jitterFraction*jitterUnit)
    return (raw*factor).toLong().coerceAtMost(maxMs)
  }
  fun classify(code:String)= when(code){
    "NETWORK_UNAVAILABLE","NETWORK_TIMEOUT","SERVER_TEMPORARY_UNAVAILABLE","RATE_LIMITED","AUTH_REFRESH_REQUIRED","EVIDENCE_UPLOAD_FAILED" -> "RETRYABLE"
    "ASSIGNMENT_CANCELLED","ASSIGNMENT_REASSIGNED","MEMBERSHIP_REVOKED","DEVICE_REVOKED","EVIDENCE_INTEGRITY_FAILED","PAYLOAD_INTEGRITY_FAILED" -> "RECONCILIATION"
    else -> "FINAL_OR_UNKNOWN"
  }
}
