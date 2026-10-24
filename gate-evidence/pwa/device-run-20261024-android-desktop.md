# PWA local-store gate - real device run, 2026-10-24
URL: https://bina-field.vercel.app/ (Vercel production, commit 2b3a03e)
Reported by operator (screen text pasted, screenshots not yet attached).
Devices: Android phone (browser/model to be recorded) and desktop browser.
Result on both: G1-G6 PASS (SQLite 3.54.1, 22 tables, 3 triggers; reopen persistence; attempt immutability;
outbox dependency + reconciliation persistence; cursor apply-before-advance; evidence identity immutability).
Not yet covered: iPhone/Safari, installed-to-home-screen run, persistent-storage result, the four ADR risk spikes.
Phase 1 formal closure remains open.
