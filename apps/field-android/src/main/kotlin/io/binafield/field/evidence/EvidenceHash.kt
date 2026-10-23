package io.binafield.field.evidence
import java.io.File
import java.security.MessageDigest
object EvidenceHash {
  fun sha256(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
  fun sha256(file:File)=file.inputStream().use { input ->
    val d=MessageDigest.getInstance("SHA-256"); val b=ByteArray(64*1024); while(true){val n=input.read(b); if(n<0) break; d.update(b,0,n)}; d.digest().joinToString(""){"%02x".format(it)}
  }
}
