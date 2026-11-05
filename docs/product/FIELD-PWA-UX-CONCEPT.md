# BinaField Field PWA — Field-first UX concept

Date: 2026-11-05  
Status: implementation direction

## Product understanding

BinaField is a report-to-jobsheet operating system. The field PWA is not an analytics dashboard or a settings console. It is the worker's execution surface in this pipeline:

`assigned work → prepare → capture → review → submit → synced`

The report contract is the source of truth. The worker should see only the work needed to complete that contract: the assignment context, required questions, evidence, signatures, and a clear handoff state.

## UX principles

- **One next action:** every screen answers “what do I do now?”
- **Progressive disclosure:** show the current step; do not force a long report onto one screen.
- **Field conditions first:** large touch targets, readable labels, camera-first evidence, offline confidence, and recovery language.
- **Pipeline visibility:** the worker can see where the jobsheet is: Ready, In progress, Ready to submit, Submitted, or Synced.
- **No system language:** API URLs, UUIDs, bearer tokens, queue terminology, and developer settings stay hidden.
- **Safe interruption:** autosave and offline state are visible before the worker leaves or submits.

## Screen model

1. **My work** — a short queue grouped by To start, In progress, Submitted; the next assignment is prominent.
2. **Assignment briefing** — assignment name, project/site context, due information, required evidence, and a single Start/Continue action.
3. **Jobsheet steps** — one step at a time with a progress rail, required count, inline validation, and Back/Next actions.
4. **Evidence & sign-off** — camera/photo capture, signature declarations, and a completion checklist.
5. **Review & submit** — a concise summary of missing items, autosave/offline state, and one Submit action.
6. **Handoff** — Submitted, Sending, Synced, or Needs attention, with plain-language next steps.

## Acceptance outcomes

- A field worker can start without reading a manual.
- A worker can tell the current step and the next action without scrolling the whole report.
- Required fields and evidence are obvious before submission.
- Offline work is safe and recoverable without exposing technical details.
- The submitted jobsheet remains traceable to the final report contract.
