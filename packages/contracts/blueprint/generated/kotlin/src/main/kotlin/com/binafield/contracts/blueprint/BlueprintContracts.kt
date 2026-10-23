// GENERATED BASELINE BINDING — DO NOT EDIT
package com.binafield.contracts.blueprint
const val BLUEPRINT_CONTRACT_SIGNATURE: String = "d3c82c04e7af6a56d45b2168acc9916d5b9b7f62818b8ab8aaf2f9030514db7f"
enum class ComponentType { TEXT, PARAGRAPH, NUMBER, INTEGER, CURRENCY, NUMERIC_STEPPER, SINGLE_SELECT, MULTI_SELECT, TOGGLE, DATE, TIME, DATETIME, GPS, CAMERA, FILE_ATTACHMENT, SIGNATURE, BARCODE_QR, INSTRUCTION, REPEAT_GROUP, COMPUTED_FIELD }
enum class RuleAction { SHOW, HIDE, ENABLE, DISABLE, REQUIRE, OPTIONAL, WARN, BLOCK_COMPLETE }
data class AnalyticsField(val enabled:Boolean, val semanticKey:String?=null, val classification:String?=null, val unit:String?=null)
data class ComponentInstance(val fieldId:String,val component:ComponentType,val label:String,val required:Boolean=false,val config: Map<String, Any?> = emptyMap(),val analytics: AnalyticsField = AnalyticsField(false))
data class Section(val sectionId:String,val title:String,val components:List<ComponentInstance>)
data class WorkflowStep(val stepId:String,val title:String,val sections:List<Section>)
