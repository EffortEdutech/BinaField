package io.binafield.generated
fun main() {
 require(API_SECURITY_CONTRACT_SIGNATURE == "9c30bafff38c0eb45b07df84ace1b39e80b54ad980d5b1a9dacef15776179594")
 require(OPERATIONS.isNotEmpty())
 require(OPERATIONS.all { it.permission.isNotBlank() })
 require(Permissions.PROJECT_READ == "project.read")
 println("API_SECURITY_PARITY_PASS:" + API_SECURITY_CONTRACT_SIGNATURE)
}
