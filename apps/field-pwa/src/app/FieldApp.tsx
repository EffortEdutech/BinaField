import { useCallback, useEffect, useRef, useState } from "react";
import { loadSettings, type Settings } from "./config";
import { login, logout, hasSession } from "./auth";
import { pull, listAssignments } from "./sync";
import { listOutbox, runOutbox } from "./outbox";
import {
  addPhoto,
  blueprintFor,
  listPhotos,
  missingFields,
  openDraft,
  removePhoto,
  saveDraft,
  submit,
  type Blueprint,
} from "./submit";
import { q } from "./store";
import { files } from "../spikes/fileClient";
import { api } from "./api";
import "./field.css";

type Row = Record<string, any>;
const statusLabel: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED_PENDING_SYNC: "Submitted — waiting to sync",
  SUBMITTED: "Submitted",
  ACCEPTED: "Accepted",
  REJECTED: "Needs correction",
};
const operationLabel: Record<string, string> = {
  EVIDENCE_UPLOAD_INIT: "Photo evidence",
  EVIDENCE_UPLOAD_PART: "Photo evidence",
  EVIDENCE_UPLOAD_FINALIZE: "Photo evidence",
  SUBMISSION_ATTEMPT_SEND: "Field submission",
  SYNC_ACK: "Sync confirmation",
};
const friendlyConflict = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase());

export default function FieldApp() {
  const [set] = useState<Settings>(loadSettings());
  const [signedIn, setSignedIn] = useState(hasSession());
  const [online, setOnline] = useState(navigator.onLine);
  const [msg, setMsg] = useState("");
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [outbox, setOutbox] = useState<Row[]>([]);
  const [cases, setCases] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED">("ALL");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [deviceState, setDeviceState] = useState<"ACTIVE" | "PENDING" | "SUSPENDED" | "REVOKED" | "UNKNOWN">("UNKNOWN");
  const verifyIdentity = useCallback(async () => {
    const result = await api<Row>(set, "GET", "/me");
    if (result.status !== 200 || !result.body) {
      if (result.status === 401) {
        setSignedIn(false);
        setDeviceState("UNKNOWN");
        setMsg("Your session expired. Please sign in again.");
      }
      setDeviceState(result.status === 403 ? "PENDING" : "UNKNOWN");
      return false;
    }
    const state = String(result.body.device_state ?? "NOT_REGISTERED");
    setDeviceState(state === "ACTIVE" ? "ACTIVE" : state === "SUSPENDED" ? "SUSPENDED" : state === "REVOKED" ? "REVOKED" : "PENDING");
    return state === "ACTIVE";
  }, [set]);
  const refresh = useCallback(async () => {
    setAssignments(await listAssignments());
    setOutbox(await listOutbox());
    setCases(
      await q(
        "SELECT case_id, conflict_type, entity_id, status FROM reconciliation_case WHERE status IN ('OPEN','AWAITING_USER') ORDER BY created_at DESC",
      ),
    );
  }, []);
  const syncNow = useCallback(async () => {
    if (!hasSession()) return;
    if (deviceState !== "ACTIVE" && !(await verifyIdentity())) {
      setMsg("This device is not ready yet. Ask your organisation administrator to activate it.");
      return;
    }
    setMsg("Syncing…");
    const p = await pull(set);
    const o = await runOutbox(set);
    setMsg(
      p.ok
        ? o.failed
          ? `${o.succeeded} sent, ${o.failed} need retry.`
          : o.succeeded
            ? `${o.succeeded} item${o.succeeded === 1 ? "" : "s"} synced successfully.`
            : "Everything is up to date."
        : `Sync needs attention: ${p.reason ?? "try again when online"}`,
    );
    await refresh();
  }, [set, refresh, deviceState, verifyIdentity]);
  const flush = useCallback(async () => {
    if (hasSession()) {
      await runOutbox(set);
      await refresh();
    }
  }, [set, refresh]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const on = () => {
        setOnline(true);
        void syncNow();
      },
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const t = setInterval(() => {
      if (navigator.onLine) void flush();
    }, 15000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(t);
    };
  }, [syncNow, flush]);
  const doLogin = async () => {
    try {
      await login(set, email, pw);
      setSignedIn(true);
      setPw("");
      const ready = await verifyIdentity();
      setMsg(ready ? "Signed in. Device ready." : "Signed in. Device registration is waiting for administrator activation.");
      if (ready) void syncNow();
    } catch (e: any) {
      setMsg(`Sign-in failed: ${e.message}`);
    }
  };
  const pending = outbox.filter(
    (o) =>
      !["SUCCEEDED", "FAILED_FINAL", "CANCELLED_BY_POLICY"].includes(o.state),
  ).length;
  const visibleAssignments = assignments.filter((assignment) => assignmentFilter === "ALL" || assignment.local_execution_status === assignmentFilter);
  const notStarted = assignments.filter((assignment) => assignment.local_execution_status === "NOT_STARTED").length;
  const inProgress = assignments.filter((assignment) => assignment.local_execution_status === "IN_PROGRESS").length;
  const submitted = assignments.filter((assignment) => ["SUBMITTED", "SUBMITTED_PENDING_SYNC", "ACCEPTED"].includes(assignment.local_execution_status)).length;
  return (
    <main className="field-shell">
      <header className="field-header">
        <div>
          <p className="brand-kicker">BinaField</p>
          <h1>Field workspace</h1>
          <p className="muted">
            Your assigned jobsheets and field evidence.
          </p>
        </div>
        <span className={`status-pill ${deviceState !== "ACTIVE" && signedIn ? "alert" : "ready"}`}>{signedIn ? deviceState === "ACTIVE" ? "Ready to work" : "Setup needed" : "Field PWA"}</span>
      </header>
      <div className="status-bar" aria-live="polite">
        <span
          data-testid="status"
          className={`status-pill ${online ? "" : "offline"}`}
        >
          <span aria-hidden="true">{online ? "●" : "○"}</span>{" "}
          {online ? "Online" : "Offline"}
        </span>
        <span className="status-pill">
          <span data-testid="pending">{pending}</span> {pending === 1 ? "item" : "items"} waiting to sync
        </span>
        {msg && (
          <span data-testid="msg" className="muted">
            {msg}
          </span>
        )}
      </div>
      {!signedIn ? (
        <section className="card">
          <h2>Sign in to your organisation</h2>
          <label className="field">
            Email
            <input
              data-testid="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            Password
            <input
              data-testid="password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button data-testid="login" onClick={doLogin}>
            Sign in
          </button>
        </section>
      ) : (
        <>
          <section className="welcome-strip"><div><p className="eyebrow">Field work</p><h2>Good to see you back</h2><p className="muted">Complete your assigned jobsheets. Your progress saves automatically.</p></div><span className="welcome-icon">✓</span></section>
          <div className="actions">
            <button data-testid="sync" onClick={syncNow}>
              Check for new work
            </button>
            <button
              className="secondary"
              onClick={() => {
                logout();
                setSignedIn(false);
              }}
            >
              Sign out
            </button>
          </div>
          {deviceState !== "ACTIVE" && (
            <section className="card notice" data-testid="device-onboarding">
              <h2>Device setup</h2>
              <p>{deviceState === "SUSPENDED" ? "This device is suspended. Contact your administrator." : deviceState === "REVOKED" ? "This device is no longer authorised. Contact your administrator." : "Your account is signed in. An administrator must activate this device before assignments can sync."}</p>
                <p className="muted">No technical keys or device codes are required. Ask your organisation administrator to activate this device.</p>
            </section>
          )}
          {cases.length > 0 && (
            <section className="card notice error" data-testid="cases">
              <h2>Needs your attention ({cases.length})</h2>
              {cases.map((c) => (
                <p key={c.case_id}>
                  <strong>{c.conflict_type.replaceAll("_", " ")}</strong>
                  <br />
                    <small>{friendlyConflict(c.conflict_type)} needs your attention. We will keep the rest of your work safe.</small>
                </p>
              ))}
            </section>
          )}
          <section className="work-summary" aria-label="Work summary">
            <div><small>To start</small><strong>{notStarted}</strong><span>new jobsheets</span></div>
            <div><small>In progress</small><strong>{inProgress}</strong><span>continue when ready</span></div>
            <div><small>Submitted</small><strong>{submitted}</strong><span>sent for review</span></div>
          </section>
          <section aria-labelledby="assignments-heading">
            <div className="section-head"><div><p className="eyebrow">Your work</p><h2 id="assignments-heading">Jobsheets</h2></div><span className="muted">{assignments.length} total</span></div>
            {assignments.length > 0 && <div className="filter-tabs" role="group" aria-label="Filter jobsheets">{([["ALL", "All"], ["NOT_STARTED", "To start"], ["IN_PROGRESS", "In progress"], ["SUBMITTED", "Submitted"]] as const).map(([value, label]) => <button key={value} type="button" className={assignmentFilter === value ? "selected" : ""} onClick={() => setAssignmentFilter(value)}>{label}</button>)}</div>}
            {assignments.length === 0 && (
              <p className="card muted" data-testid="no-assignments">
                No assignments on this device yet. Sync while online to check
                for new work.
              </p>
            )}
            {assignments.length > 0 && visibleAssignments.length === 0 && <p className="card muted">No jobsheets match this view.</p>}
            {visibleAssignments.map((a) => (
              <Assignment
                key={a.assignment_id}
                set={set}
                assignment={a}
                open={open === a.assignment_id}
                onOpen={() =>
                  setOpen(open === a.assignment_id ? null : a.assignment_id)
                }
                onDone={async () => {
                  setOpen(null);
                  await refresh();
                  void flush();
                }}
              />
            ))}
          </section>
          <section className="card sync-card">
            <div className="section-head"><div><p className="eyebrow">Background sync</p><h2>Sync status</h2></div><span className="status-pill">{online ? "Connected" : "Offline safe"}</span></div>
            {outbox.length === 0 ? (
              <p className="muted">Everything is up to date. New work will appear when it is assigned to you.</p>
            ) : (
              <ul className="outbox" data-testid="outbox">
                {outbox.map((o) => (
                  <li
                    key={o.operation_id}
                    data-state={o.state}
                    data-type={o.operation_type}
                  >
                    <strong>
                      {operationLabel[o.operation_type] ??
                        o.operation_type.replaceAll("_", " ")}
                    </strong>{" "}
                    ·{" "}
                    {o.state === "SUCCEEDED"
                      ? "Complete"
                      : o.state === "FAILED_FINAL"
                        ? "Failed permanently"
                        : o.state === "QUEUED"
                          ? "Waiting for connection"
                          : o.state === "RUNNING"
                            ? "In progress"
                            : "Will retry"}
                    {o.state === "FAILED_FINAL" ? " · Please contact your administrator" : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Assignment({
  set,
  assignment,
  open,
  onOpen,
  onDone,
}: {
  set: Settings;
  assignment: Row;
  open: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  const subject = JSON.parse(assignment.subject_json);
  const status =
    statusLabel[assignment.local_execution_status] ??
    assignment.local_execution_status;
  return (
    <article className="card" data-testid="assignment">
      <div className="assignment-head">
        <div>
          <h3>
            {subject.name ??
              subject.label ??
              "Assigned field work"}
          </h3>
          <p className="muted">Jobsheet ready on this device</p>
        </div>
        <span data-testid="exec-status" className="status-pill">
          {status}
        </span>
      </div>
      {assignment.local_execution_status === "NOT_STARTED" ||
      assignment.local_execution_status === "IN_PROGRESS" ? (
        <div className="actions">
          <button data-testid="open-form" onClick={onOpen}>
            {open
              ? "Close assignment"
              : assignment.local_execution_status === "IN_PROGRESS"
                ? "Continue"
                : "Start assignment"}
          </button>
        </div>
      ) : null}
      {open && <Form set={set} assignment={assignment} onDone={onDone} />}
    </article>
  );
}

function Form({
  set,
  assignment,
  onDone,
}: {
  set: Settings;
  assignment: Row;
  onDone: () => void;
}) {
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [sid, setSid] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const photoField = useRef("");
  useEffect(() => {
    (async () => {
      const b = await blueprintFor(assignment.template_version_id);
      setBp(b?.bp ?? null);
      const d = await openDraft(set, assignment.assignment_id);
      setSid(d.session.session_id);
      setPayload(d.payload);
      setPhotos(await listPhotos(d.session.session_id));
    })();
  }, [assignment.assignment_id, assignment.template_version_id, set]);
  const change = (id: string, v: unknown) => {
    const n = { ...payload, [id]: v };
    setPayload(n);
    void saveDraft(set, sid, n);
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await addPhoto(set, sid, assignment.assignment_id, photoField.current, f);
    setPhotos(await listPhotos(sid));
    e.target.value = "";
  };
  const send = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await submit(set, sid);
      if (r.missing.length) setErr(`Please complete: ${r.missing.join(", ")}`);
      else onDone();
    } catch (e: any) {
      setErr(`Could not save submission: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  if (!sid) return <p className="muted">Opening assignment…</p>;
  if (!bp)
    return (
      <p className="notice error">
        This form is not on the device yet. Connect and press Sync now.
      </p>
    );
  const miss = missingFields(
    bp,
    payload,
    photos.map((p) => p.field_id),
  );
  return (
    <div data-testid="form">
      <h3>{bp.title}</h3>
      <p className="muted">
        Your answers save automatically. You can submit when all required fields
        are complete.
      </p>
      <input
        ref={file}
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="file"
        style={{ display: "none" }}
        onChange={onFile}
      />
      {bp.fields.map((f) => (
        <div className="field" key={f.id}>
          <label htmlFor={`f-${f.id}`}>
            {f.label}
            {f.required ? " *" : ""}
          </label>
          {f.type === "select" && (
            <select
              id={`f-${f.id}`}
              data-testid={`f-${f.id}`}
              value={String(payload[f.id] ?? "")}
              onChange={(e) => change(f.id, e.target.value)}
            >
              <option value="">Select an option</option>
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
          {f.type === "date" && (
            <input
              id={`f-${f.id}`}
              data-testid={`f-${f.id}`}
              type="date"
              value={String(payload[f.id] ?? "")}
              onChange={(e) => change(f.id, e.target.value)}
            />
          )}
          {f.type === "number" && (
            <input
              id={`f-${f.id}`}
              data-testid={`f-${f.id}`}
              type="number"
              min="0"
              value={String(payload[f.id] ?? "")}
              onChange={(e) => change(f.id, e.target.value)}
            />
          )}
          {f.type === "repeat_group" && (
            <RepeatGroup
              field={f}
              value={payload[f.id]}
              onChange={(value) => change(f.id, value)}
            />
          )}
          {(f.type === "text" || f.type === "signature") && (
            <textarea
              id={`f-${f.id}`}
              data-testid={`f-${f.id}`}
              placeholder={f.type === "signature" ? "Type your name to sign this declaration." : undefined}
              value={String(payload[f.id] ?? "")}
              onChange={(e) => change(f.id, e.target.value)}
            />
          )}
          {f.type === "photo" && (
            <>
              <button
                type="button"
                className="secondary"
                data-testid={`add-${f.id}`}
                onClick={() => {
                  photoField.current = f.id;
                  file.current?.click();
                }}
              >
                {photos.some((p) => p.field_id === f.id)
                  ? "Add another photo"
                  : "Take / choose photo"}
              </button>
              <div className="photo-grid">
                {photos
                  .filter((p) => p.field_id === f.id)
                  .map((p) => (
                    <Photo
                      key={p.attachment_id}
                      photo={p}
                      onRemove={async () => {
                        await removePhoto(p.attachment_id);
                        setPhotos(await listPhotos(sid));
                      }}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      ))}
      {miss.length > 0 && (
        <p className="field-error" role="status">
          Still required: {miss.join(", ")}
        </p>
      )}
      {err && (
        <p className="notice error" data-testid="form-error" role="alert">
          {err}
        </p>
      )}
      <div className="actions">
        <button
          data-testid="submit"
          disabled={miss.length > 0 || busy}
          onClick={send}
        >
          {busy ? "Saving…" : "Submit assignment"}
        </button>
      </div>
    </div>
  );
}

function RepeatGroup({ field, value, onChange }: { field: import("./submit").Field; value: unknown; onChange: (value: unknown) => void }) {
  const columns = field.config?.columns ?? [];
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const add = () => onChange([...rows, Object.fromEntries(columns.map((column: string) => [column, ""]))]);
  const update = (index: number, column: string, next: string) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [column]: next } : row));
  return <div className="repeat-group" data-testid={`repeat-${field.id}`}><p className="muted">Add one row for each record.</p>{rows.map((row, index) => <div className="repeat-row" key={index}>{columns.map((column: string) => <label key={column}>{column.replaceAll("_", " ")}<input value={String(row[column] ?? "")} onChange={(e) => update(index, column, e.target.value)} /></label>)}<button type="button" className="danger" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Remove row</button></div>)}<button type="button" className="secondary" onClick={add}>Add row</button></div>;
}

function Photo({ photo, onRemove }: { photo: Row; onRemove: () => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let url = "";
    files
      .read(photo.local_file_path)
      .then(({ bytes }) => {
        url = URL.createObjectURL(
          new Blob([bytes], { type: photo.claimed_mime_type || "image/jpeg" }),
        );
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.local_file_path, photo.claimed_mime_type]);
  return (
    <div className="photo-card" data-testid="photo">
      {src ? (
        <img src={src} alt="Captured evidence preview" />
      ) : (
        <div className="photo-meta">Preview loading…</div>
      )}
      <div className="photo-meta">{(photo.byte_size / 1024).toFixed(0)} KB</div>
      <button
        type="button"
        className="danger"
        onClick={onRemove}
        aria-label="Remove photo"
      >
        Remove
      </button>
    </div>
  );
}
