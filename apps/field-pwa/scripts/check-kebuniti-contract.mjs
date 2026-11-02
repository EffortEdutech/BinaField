import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const file = resolve(import.meta.dirname, '../../../packages/test-fixtures/phase1-gate/vs01/kebuniti-field-data-blueprint.json');
const blueprint = JSON.parse(await readFile(file, 'utf8'));
const components = blueprint.workflow_steps.flatMap((step) => step.sections.flatMap((section) => section.components));
const ids = new Set(components.map((component) => component.field_id));
const required = ['form_id', 'entry_date', 'recording_officer', 'community_group', 'plot_zone', 'state_district', 'activities', 'crop_progress_photo', 'prepared_by_signature', 'doa_verification_signature'];
const checks = [
  ['schema', blueprint.schema === 'bf-blueprint/1.0' && blueprint.schema_version === '1.0'],
  ['visit context', required.slice(0, 6).every((id) => ids.has(id))],
  ['activity repeat group', ids.has('activities') && components.find((c) => c.field_id === 'activities')?.component === 'repeat_group'],
  ['harvest repeat group', ids.has('harvest_records') && components.find((c) => c.field_id === 'harvest_records')?.component === 'repeat_group'],
  ['resource repeat group', ids.has('resource_inputs') && components.find((c) => c.field_id === 'resource_inputs')?.component === 'repeat_group'],
  ['photo evidence', ids.has('crop_progress_photo') && components.find((c) => c.field_id === 'crop_progress_photo')?.component === 'camera'],
  ['prepared and DOA signatures', required.slice(-2).every((id) => components.find((c) => c.field_id === id)?.component === 'signature')],
  ['offline submission and evidence policy', blueprint.sync_policy?.offline_capable === true && blueprint.submission_policy?.allow_offline_submit === true && blueprint.submission_policy?.require_all_required_evidence === true],
];
const result = { pass: checks.every(([, pass]) => pass), checks: checks.map(([name, pass]) => ({ name, pass })) };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
