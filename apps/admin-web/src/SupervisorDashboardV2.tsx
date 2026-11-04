import { useEffect, useState } from "react";
import { loadSession, login, logout, refreshSession } from "./auth";
const API = "https://binafield-api.vercel.app/api";
const downloadText = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const reportCsv = (report: any) => {
  const rows: string[][] = [];
  const add = (section: string, item: any) => Object.entries(item ?? {}).forEach(([key, value]) => rows.push([section, key, String(value ?? "")]));
  add("identity", report.identity);
  for (const [i, item] of (report.sections?.activities ?? []).entries()) add(`activity_${i + 1}`, item);
  for (const [i, item] of (report.sections?.harvest_records ?? []).entries()) add(`harvest_${i + 1}`, item);
  for (const [i, item] of (report.sections?.resource_inputs ?? []).entries()) add(`resource_${i + 1}`, item);
  add("calculations", report.calculations); add("validation", report.sections?.validation); add("provenance", report.provenance);
  return ["section,key,value", ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
};
function ReportTable({ rows, columns }: { rows?: any[]; columns: [string, string][] }) {
  return rows?.length ? <div className="data-table-wrap report-table"><table className="data-table"><thead><tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{columns.map(([key]) => <td key={key}>{String(row?.[key] ?? "—")}</td>)}</tr>)}</tbody></table></div> : <p className="muted">No records submitted.</p>;
}
export default function SupervisorDashboardV2() {
  const [org, setOrg] = useState(""),
    [organisations, setOrganisations] = useState<any[]>([]),
    [token, setToken] = useState(loadSession()?.accessToken ?? ""),
    [email, setEmail] = useState(loadSession()?.email ?? ""),
    [password, setPassword] = useState(""),
    [context, setContext] = useState<any>(),
    [submissions, setSubmissions] = useState<any[]>([]),
    [assignments, setAssignments] = useState<any[]>([]),
    [audit, setAudit] = useState<any[]>([]),
    [projects, setProjects] = useState<any[]>([]),
    [memberships, setMemberships] = useState<any[]>([]),
    [roles, setRoles] = useState<any[]>([]),
    [devices, setDevices] = useState<any[]>([]),
    [deployments, setDeployments] = useState<any[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [history, setHistory] = useState<any[]>([]),
    [kebunitiReport, setKebunitiReport] = useState<any>(null),
    [filter, setFilter] = useState("ALL"),
    [project, setProject] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [assignmentSearch, setAssignmentSearch] = useState(""),
    [assignmentState, setAssignmentState] = useState("ALL"),
    [assignmentPage, setAssignmentPage] = useState(0),
    [workspaceView, setWorkspaceView] = useState<"workspace" | "reports">("workspace"),
    [roleMember, setRoleMember] = useState(""),
    [roleId, setRoleId] = useState(""),
    [roleScope, setRoleScope] = useState<"ORG_WIDE" | "PROJECT_RESTRICTED">(
      "ORG_WIDE",
    ),
    [scopeProject, setScopeProject] = useState("");
  const h = () => ({ authorization: `Bearer ${token}` });
  const loadOrganisations = async (accessToken = token) => {
    const data = await read(await fetch(`${API}/organizations`, { headers: { authorization: `Bearer ${accessToken}` } }));
    const items = data.items ?? [];
    setOrganisations(items);
    setOrg((current) => current && items.some((item: any) => item.id === current) ? current : items[0]?.id ?? "");
    return items;
  };
  const signIn = async () => { try { const session = await login(email, password); setToken(session.accessToken); setPassword(""); const items = await loadOrganisations(session.accessToken); setMessage(items.length ? "Signed in. Choose an organisation to continue." : "Signed in, but no active organisation membership was found."); } catch (e) { setMessage(`Sign-in failed: ${String(e)}`); } };
  const signOut = () => { logout(); setToken(""); setContext(undefined); setOrganisations([]); setOrg(""); setMessage("Signed out."); };
  useEffect(() => { const timer = window.setInterval(async () => { const session = loadSession(); if (!session) return; if (session.expiresAt - Date.now() < 120000) { try { const next = await refreshSession(session); setToken(next.accessToken); } catch { signOut(); setMessage("Your session expired. Please sign in again."); } } }, 60000); return () => window.clearInterval(timer); }, []);
  const read = async (r: Response) => {
    const b = await r.json();
    if (!r.ok) throw new Error(`${b.code ?? r.status}: ${b.detail ?? ""}`);
    return b;
  };
  const refresh = async () => {
    if (!org) { setMessage("Choose an organisation first."); return; }
    setLoading(true);
    setMessage("Loading organisation data…");
    try {
      const me = await read(
        await fetch(`${API}/organizations/${org}/me`, { headers: h() }),
      );
      setContext(me);
      const [a, s, e, p, m, r, d, dp] = await Promise.all([
        fetch(`${API}/organizations/${org}/assignments`, { headers: h() }),
        fetch(`${API}/organizations/${org}/submissions`, { headers: h() }),
        fetch(`${API}/organizations/${org}/audit-events?limit=100`, {
          headers: h(),
        }),
        fetch(`${API}/organizations/${org}/projects`, { headers: h() }),
        fetch(`${API}/organizations/${org}/memberships`, { headers: h() }),
        fetch(`${API}/organizations/${org}/roles`, { headers: h() }),
        fetch(`${API}/organizations/${org}/devices`, { headers: h() }),
        fetch(`${API}/organizations/${org}/deployments`, { headers: h() }),
      ]);
      setAssignments((await read(a)).items ?? []);
      setSubmissions((await read(s)).items ?? []);
      setAudit((await read(e)).items ?? []);
      setProjects((await read(p)).items ?? []);
      setMemberships((await read(m)).items ?? []);
      setRoles((await read(r)).items ?? []);
      setDevices((await read(d)).items ?? []);
      setDeployments((await read(dp)).items ?? []);
      setMessage("Organisation data refreshed");
    } catch (e) {
      setMessage(`Could not load Admin Studio data: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };
  const lifecycle = async (path: string, body: unknown) => {
    try {
      await read(
        await fetch(`${API}${path}`, {
          method: "PATCH",
          headers: { ...h(), "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      await refresh();
    } catch (e) {
      setMessage(`Action failed: ${String(e)}`);
    }
  };
  const assignRole = async (membershipId?: string, selectedRoleId?: string) => {
    const member = membershipId ?? roleMember,
      role = selectedRoleId ?? roleId;
    if (
      !member ||
      !role ||
      (roleScope === "PROJECT_RESTRICTED" && !scopeProject)
    )
      return setMessage("Choose a member, role, and required project scope.");
    try {
      await read(
        await fetch(`${API}/organizations/${org}/memberships/${member}/roles`, {
          method: "POST",
          headers: {
            ...h(),
            "content-type": "application/json",
            "idempotency-key": `admin-role-${crypto.randomUUID()}`,
          },
          body: JSON.stringify({
            role_id: role,
            scope_mode: roleScope,
            project_ids:
              roleScope === "PROJECT_RESTRICTED" ? [scopeProject] : [],
          }),
        }),
      );
      setMessage("Role assigned successfully.");
      await refresh();
    } catch (e) {
      setMessage(`Role assignment failed: ${String(e)}`);
    }
  };
  const review = async (id: string, decision: "ACCEPT" | "REJECT") => {
    try {
      await read(
        await fetch(`${API}/organizations/${org}/submissions/${id}/review`, {
          method: "POST",
          headers: { ...h(), "content-type": "application/json" },
          body: JSON.stringify({ decision }),
        }),
      );
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  };
  const bulkReview = async (decision: "ACCEPT" | "REJECT") => {
    if (!selected.length) return;
    try {
      await read(
        await fetch(`${API}/organizations/${org}/submissions:bulk-review`, {
          method: "POST",
          headers: { ...h(), "content-type": "application/json" },
          body: JSON.stringify({ submission_ids: selected, decision }),
        }),
      );
      setSelected([]);
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  };
  const showHistory = async (id: string) => {
    try {
      const b = await read(
        await fetch(`${API}/organizations/${org}/submissions/${id}/history`, {
          headers: h(),
        }),
      );
      setHistory(b.items ?? []);
    } catch (e) {
      setMessage(String(e));
    }
  };
  const showKebunitiReport = async (id: string) => {
    try {
      setMessage("Loading Kebuniti report…");
      const b = await read(await fetch(`${API}/organizations/${org}/reports/kebuniti/${id}`, { headers: h() }));
      setKebunitiReport(b);
      setMessage("Kebuniti report loaded");
      window.location.hash = "reports";
    } catch (e) { setMessage(`Could not load Kebuniti report: ${String(e)}`); }
  };
  const exportData = (resource: string, format: string) =>
    window.open(
      `${API}/organizations/${org}/exports/${resource}?format=${format}&limit=5000`,
      "_blank",
      "noopener,noreferrer",
    );
  const exportKebuniti = (format: "json" | "csv") => {
    if (!kebunitiReport) return;
    const body = format === "json" ? JSON.stringify(kebunitiReport, null, 2) : reportCsv(kebunitiReport);
    downloadText(`kebuniti-${kebunitiReport.identity?.form_id ?? "report"}.${format}`, body, format === "json" ? "application/json" : "text/csv");
  };
  const filtered = submissions.filter(
    (s) =>
      (filter === "ALL" || s.status === filter) &&
      (!project || s.project_id === project),
  );
  const canReview = context?.permissions?.includes("submission.review");
  const metrics = {
    assigned: assignments.filter((a) => a.lifecycle_state === "ASSIGNED").length,
    inProgress: assignments.filter((a) => a.lifecycle_state === "IN_PROGRESS").length,
    submitted: assignments.filter((a) => a.lifecycle_state === "SUBMITTED").length,
    accepted: submissions.filter((s) => s.status === "ACCEPTED").length,
    rejected: submissions.filter((s) => s.status === "REJECTED").length,
    overdue: assignments.filter((a) => a.due_at && new Date(a.due_at).getTime() < Date.now() && !["COMPLETED", "CANCELLED"].includes(a.lifecycle_state)).length,
  };
  const latestActivity = [...submissions].sort((a, b) => new Date(b.received_at ?? 0).getTime() - new Date(a.received_at ?? 0).getTime()).slice(0, 5);
  const projectActivity = projects.map((p) => ({
    ...p,
    assigned: assignments.filter((a) => a.project_id === p.id).length,
    submitted: submissions.filter((s) => s.project_id === p.id).length,
  }));
  const attention = [
    ...(metrics.overdue ? [{ label: `${metrics.overdue} overdue assignment${metrics.overdue === 1 ? "" : "s"}`, href: "#administration" }] : []),
    ...(submissions.filter((s) => s.status === "RECEIVED").length ? [{ label: `${submissions.filter((s) => s.status === "RECEIVED").length} submission${submissions.filter((s) => s.status === "RECEIVED").length === 1 ? "" : "s"} awaiting review`, href: "#review" }] : []),
  ];
  const assignmentRows = assignments.filter((a) => (assignmentState === "ALL" || a.lifecycle_state === assignmentState) && (!assignmentSearch || `${a.id} ${a.operational_subject_ref?.label ?? ""}`.toLowerCase().includes(assignmentSearch.toLowerCase()))).sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
  const visibleAssignments = assignmentRows.slice(assignmentPage * 8, assignmentPage * 8 + 8);
  return (
    <main className="shell">
      <div className="app-frame">
        <aside className="sidebar" aria-label="Primary navigation">
          <div className="brand-lockup"><span className="brand-mark">BF</span><span><strong>BinaField</strong><small>Admin Studio</small></span></div>
          <nav>
            <a className="nav-item active" href="#overview">⌂ <span>Overview</span></a>
            <a className="nav-item" href="#administration">▦ <span>Administration</span></a>
            <a className="nav-item" href="#review">✓ <span>Review queue</span></a>
            <a className="nav-item" href="#reports">◒ <span>Reports & exports</span></a>
            <a className="nav-item" href="#audit">◌ <span>Audit trail</span></a>
          </nav>
          <div className="sidebar-foot"><span className="status-dot" /> Pilot workspace<br /><small>Protected session</small></div>
        </aside>
        <div className="workspace">
      <header id="overview">
        <div>
          <p className="eyebrow">BinaField</p>
          <h1>Admin Studio</h1>
          <p className="muted">
            The calm command centre for field operations
          </p>
        </div>
        <div className="header-actions"><span className="live-pill"><span className="status-dot" /> Live workspace</span><span className="badge">Goal 15</span></div>
      </header>
      <section className="card">
        <h2>Organisation context</h2>
        {!token ? <><label>Email<input aria-label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button onClick={signIn} disabled={!email || !password}>Sign in</button></> : <><label>Organisation<select aria-label="Organisation" value={org} onChange={(e) => setOrg(e.target.value)}><option value="">Choose an organisation</option>{organisations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={refresh} disabled={loading || !org}>{loading ? "Loading…" : "Open Admin Studio"}</button><button className="secondary" onClick={signOut}>Sign out</button></>}
        {message && (
          <p
            className={
              message.startsWith("Could") ||
              message.startsWith("Action") ||
              message.startsWith("Role")
                ? "error"
                : "message"
            }
            role="status"
          >
            {message}
          </p>
        )}
      </section>
      {context?.organization_id && (
        <>
          <section className="overview-hero" aria-labelledby="today-heading">
            <div>
              <p className="eyebrow">Operations overview</p>
              <h2 id="today-heading">Today’s operations</h2>
              <p className="muted">A live view of work moving through your organisation.</p>
            </div>
            <div className="freshness"><span className="status-dot" /> <strong>Live data</strong><small>Updated just now · {assignments.length + submissions.length} records loaded</small></div>
          </section>
          <section className="metric-grid" aria-label="Operational counts">
            {[['Assigned', metrics.assigned, 'assigned', '#087e83'], ['In progress', metrics.inProgress, 'administration', '#3b73a8'], ['Submitted', metrics.submitted, 'review', '#8065b5'], ['Accepted', metrics.accepted, 'review', '#2b9868'], ['Rejected', metrics.rejected, 'review', '#c65353'], ['Overdue', metrics.overdue, 'administration', '#d58b22']].map(([label, value, href, color]) => <a className="metric-card" href={`#${href}`} key={String(label)}><span className="metric-accent" style={{ background: color as string }} /><small>{label}</small><strong>{value}</strong><span>View details →</span></a>)}
          </section>
          <section className="overview-grid">
            <section className="card project-cards"><div className="section-heading"><div><p className="eyebrow">Portfolio pulse</p><h2>Project activity</h2></div><a href="#administration">View all →</a></div>{projectActivity.length ? <div className="project-list">{projectActivity.slice(0, 4).map((p) => <a href="#administration" className="project-card" key={p.id}><span className="project-icon">{(p.name ?? "P").slice(0, 1).toUpperCase()}</span><span><strong>{p.name}</strong><small>{p.lifecycle_state} · {p.assigned} assigned · {p.submitted} submitted</small></span><span className="chevron">→</span></a>)}</div> : <p className="empty-state">No projects are available in this workspace yet.</p>}</section>
            <section className="card attention-card"><div className="section-heading"><div><p className="eyebrow">Needs attention</p><h2>Keep work moving</h2></div><span className="attention-count">{attention.length}</span></div>{attention.length ? <ul>{attention.map((item) => <li key={item.label}><span className="attention-icon">!</span><a href={item.href}>{item.label}<small>Open workspace →</small></a></li>)}</ul> : <div className="clear-state"><span>✓</span><strong>Everything is on track</strong><small>No urgent actions detected in the loaded records.</small></div>}</section>
          </section>
          <section className="card recent-card"><div className="section-heading"><div><p className="eyebrow">Activity stream</p><h2>Recent submissions</h2></div><a href="#review">Open review queue →</a></div>{latestActivity.length ? <div className="recent-list">{latestActivity.map((s) => <a href="#review" key={s.attempt_id}><span className={`status-chip ${String(s.status).toLowerCase()}`}>{s.status}</span><span><strong>{s.attempt_id.slice(0, 8)}</strong><small>{s.project_id ? `Project ${s.project_id.slice(0, 8)}` : "Organisation submission"}</small></span><time>{s.received_at ? new Date(s.received_at).toLocaleString() : "Time unavailable"}</time><span className="chevron">→</span></a>)}</div> : <div className="empty-state"><strong>No submissions yet</strong><span>When field work arrives, the latest activity will appear here.</span><a href="#administration">View assignments →</a></div>}</section>
          <section className="card workspace-panel" id="workspace"><div className="section-heading"><div><p className="eyebrow">Operations workspace</p><h2>Assignments & submissions</h2><p className="muted">Search, filter, and move directly to the work record.</p></div></div><div className="workspace-filters"><input aria-label="Search assignments" placeholder="Search assignment ID or subject" value={assignmentSearch} onChange={(e) => { setAssignmentSearch(e.target.value); setAssignmentPage(0); }} /><select aria-label="Filter assignment state" value={assignmentState} onChange={(e) => { setAssignmentState(e.target.value); setAssignmentPage(0); }}><option>ALL</option><option>ASSIGNED</option><option>IN_PROGRESS</option><option>SUBMITTED</option><option>COMPLETED</option><option>CANCELLED</option></select><a href="#review">Review submissions →</a></div>{visibleAssignments.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Assignment</th><th>Project</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{visibleAssignments.map((a) => <tr key={a.id}><td><strong>{a.id.slice(0, 8)}</strong><small>{a.operational_subject_ref?.label ?? "Field assignment"}</small></td><td>{a.project_id?.slice(0, 8) ?? "—"}</td><td><span className={`status-chip ${String(a.lifecycle_state).toLowerCase()}`}>{a.lifecycle_state}</span></td><td>{a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "—"}</td><td><a href="#administration">Open →</a></td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No assignments match your filters</strong><span>Try clearing the search or selecting another status.</span></div>}<div className="timeline"><h3>Submission timeline</h3>{latestActivity.length ? latestActivity.slice(0, 3).map((s) => <div className="timeline-item" key={s.attempt_id}><span className="timeline-dot" /><span><strong>{s.status}</strong><small>{s.attempt_id.slice(0, 8)} · {s.received_at ? new Date(s.received_at).toLocaleString() : "time unavailable"}</small></span></div>) : <p className="muted">No submission events yet.</p>}</div></section>
          <section className="grid" id="administration">
            <section className="card">
              <h2>Organisation administration</h2>
              <p>
                <strong>{projects.length}</strong> projects ·{" "}
                <strong>{memberships.length}</strong> memberships ·{" "}
                <strong>{devices.length}</strong> devices
              </p>
              <h3>Projects</h3>
              {projects.length ? (
                <ul>
                  {projects.map((p) => (
                    <li key={p.id}>
                      {p.name} · {p.lifecycle_state}{" "}
                      <button
                        onClick={() =>
                          lifecycle(`/organizations/${org}/projects/${p.id}`, {
                            lifecycle_state:
                              p.lifecycle_state === "ACTIVE"
                                ? "CLOSED"
                                : "ACTIVE",
                          })
                        }
                      >
                        {p.lifecycle_state === "ACTIVE" ? "Close" : "Activate"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No projects found.</p>
              )}
              <h3>Memberships and roles</h3>
              {memberships.length ? (
                <ul>
                  {memberships.map((m) => (
                    <li key={m.id}>
                      {m.display_name ?? m.email} · {m.lifecycle_state}{" "}
                      <button
                        onClick={() =>
                          lifecycle(
                            `/organizations/${org}/memberships/${m.id}`,
                            {
                              lifecycle_state:
                                m.lifecycle_state === "ACTIVE"
                                  ? "SUSPENDED"
                                  : "ACTIVE",
                            },
                          )
                        }
                      >
                        {m.lifecycle_state === "ACTIVE"
                          ? "Suspend"
                          : "Activate"}
                      </button>
                      <select
                        aria-label={`Role for ${m.email}`}
                        defaultValue=""
                        onChange={(e) => assignRole(m.id, e.target.value)}
                      >
                        <option value="">Assign role…</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name ?? r.role_key}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No memberships found.</p>
              )}
              <h3>Assign role with project scope</h3>
              <label>
                Membership
                <select value={roleMember} onChange={(e) => setRoleMember(e.target.value)}>
                  <option value="">Select membership</option>
                  {memberships.map((m) => <option key={m.id} value={m.id}>{m.display_name ?? m.email}</option>)}
                </select>
              </label>
              <label>
                Role
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">Select role</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name ?? r.role_key}</option>)}
                </select>
              </label>
              <label>
                Scope
                <select value={roleScope} onChange={(e) => setRoleScope(e.target.value as "ORG_WIDE" | "PROJECT_RESTRICTED")}>
                  <option value="ORG_WIDE">Organisation-wide</option>
                  <option value="PROJECT_RESTRICTED">Project-restricted</option>
                </select>
              </label>
              {roleScope === "PROJECT_RESTRICTED" && <label>Project scope<select value={scopeProject} onChange={(e) => setScopeProject(e.target.value)}><option value="">Select project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
              <button onClick={() => assignRole()}>Assign selected role</button>
              <p className="muted">
                Role assignments are audited and take effect on the next authorised request.
              </p>
            </section>
            <section className="card">
              <h2>Devices</h2>
              {devices.length ? (
                <ul>
                  {devices.map((d) => (
                    <li key={d.id}>
                      {d.platform} · {d.app_version ?? "unknown"} ·{" "}
                      {d.lifecycle_state}{" "}
                      <button
                        onClick={() =>
                          lifecycle(`/organizations/${org}/devices/${d.id}`, {
                            lifecycle_state:
                              d.lifecycle_state === "ACTIVE"
                                ? "SUSPENDED"
                                : "ACTIVE",
                          })
                        }
                      >
                        {d.lifecycle_state === "ACTIVE"
                          ? "Suspend"
                          : "Activate"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No registered devices.</p>
              )}
              <h2>Deployments</h2>
              {deployments.length ? <ul>{deployments.slice(0, 20).map((d) => <li key={d.id}>{d.name} · {d.lifecycle_state} <button onClick={() => lifecycle(`/organizations/${org}/deployments/${d.id}`, { lifecycle_state: d.lifecycle_state === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>{d.lifecycle_state === "ACTIVE" ? "Pause" : "Activate"}</button></li>)}</ul> : <p className="muted">No deployments found.</p>}
              <h2>Assignments</h2>
              {assignments.length ? (
                <ul>
                  {assignments.slice(0, 20).map((a) => (
                    <li key={a.id}>
                      {a.id.slice(0, 8)} · {a.lifecycle_state}{" "}
                      <button
                        onClick={() =>
                          lifecycle(
                            `/organizations/${org}/assignments/${a.id}`,
                            {
                              lifecycle_state:
                                a.lifecycle_state === "ASSIGNED"
                                  ? "CANCELLED"
                                  : "ASSIGNED",
                            },
                          )
                        }
                      >
                        {a.lifecycle_state === "ASSIGNED"
                          ? "Cancel"
                          : "Reassign"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No assignments found.</p>
              )}
            </section>
          </section>
          <section className="card" id="reports">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Reporting</p>
                <h2>Activity summary</h2>
              </div>
              <button type="button" onClick={() => window.print()} aria-label="Print activity report">
                Print report
              </button>
            </div>
            <p>
              <strong>
                {
                  assignments.filter((a) => a.lifecycle_state === "ASSIGNED")
                    .length
                }
              </strong>{" "}
              assigned ·{" "}
              <strong>
                {
                  assignments.filter((a) => a.lifecycle_state === "SUBMITTED")
                    .length
                }
              </strong>{" "}
              submitted ·{" "}
              <strong>
                {submissions.filter((s) => s.status === "ACCEPTED").length}
              </strong>{" "}
              accepted ·{" "}
              <strong>
                {submissions.filter((s) => s.status === "REJECTED").length}
              </strong>{" "}
              rejected
            </p>
            <div className="report-preview" aria-label="Report preview">
              <div className="report-stat"><small>Reconciled total</small><strong>{assignments.length + submissions.length}</strong><span>assignments + submissions</span></div>
              <div className="report-stat"><small>Accepted rate</small><strong>{submissions.length ? `${Math.round((submissions.filter((s) => s.status === "ACCEPTED").length / submissions.length) * 100)}%` : "—"}</strong><span>of received submissions</span></div>
              <div className="report-stat"><small>Data freshness</small><strong>Live</strong><span>{assignments.length + submissions.length} records loaded</span></div>
              {kebunitiReport && <div className="kebuniti-report" aria-label="Kebuniti report preview">
                <div className="report-title"><p className="eyebrow">Program Kebun Komuniti (Kebuniti)</p><h3>FIELD DATA LOG</h3><p>{kebunitiReport.identity?.form_id} · {kebunitiReport.identity?.entry_date}</p></div>
                <div className="export-row"><button type="button" onClick={() => exportKebuniti("json")}>Download JSON</button><button type="button" onClick={() => exportKebuniti("csv")}>Download CSV</button><button type="button" onClick={() => window.print()}>Print / Save PDF</button></div>
                <dl className="report-identity">{[["Recording officer", kebunitiReport.identity?.recording_officer],["Community group", kebunitiReport.identity?.community_group],["Plot / zone", kebunitiReport.identity?.plot_zone],["State / district", kebunitiReport.identity?.state_district]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
                <div className="report-kpis"><div><small>Activities</small><strong>{kebunitiReport.calculations?.activity_count ?? 0}</strong></div><div><small>Hours / participants</small><strong>{kebunitiReport.calculations?.total_hours ?? 0} / {kebunitiReport.calculations?.total_participants ?? 0}</strong></div><div><small>Total harvest</small><strong>{kebunitiReport.calculations?.total_harvest_kg ?? 0} kg</strong></div><div><small>Evidence</small><strong>{kebunitiReport.calculations?.evidence_count ?? 0}</strong></div></div>
                <h4>Daily Field Activity Log</h4><ReportTable rows={kebunitiReport.sections?.activities} columns={[["activity_type","Activity"],["status","Status"],["hours_spent","Hours"],["participants","Participants"],["field_notes","Notes"],["target_blocks","Target blocks"]]} />
                <h4>Produce &amp; Yield Harvest Record</h4><ReportTable rows={kebunitiReport.sections?.harvest_records} columns={[["crop_variety","Crop / variety"],["plot_number","Plot"],["raw_weight_kg","Raw weight (kg)"],["quality_grade","Grade"],["destination","Destination"]]} />
                <h4>Resource &amp; Input Audit</h4><ReportTable rows={kebunitiReport.sections?.resource_inputs} columns={[["material_type","Material"],["brand_variety_code","Brand / code"],["quantity_consumed","Quantity"],["unit","Unit"],["logistics_reference","Logistics ref."]]} />
                <h4>Evidence, Notes &amp; Sign-off</h4><p className="report-notes">{kebunitiReport.sections?.general_notes || "No incidents or general notes recorded."}</p><p className="report-evidence">{(kebunitiReport.sections?.evidence ?? []).map((x: any, i: number) => <span key={i}>Photo {i + 1}: {x.field_id || x.evidence_type || "Evidence"}</span>)}</p><dl className="report-signatures"><div><dt>Prepared by</dt><dd>{kebunitiReport.sections?.validation?.prepared_by_signature || "Not signed"}</dd></div><div><dt>DOA representative</dt><dd>{kebunitiReport.sections?.validation?.doa_verification_signature || "Not signed"}</dd></div></dl>
                <details className="report-provenance"><summary>Submission provenance</summary><p>Submission {kebunitiReport.provenance?.submission_id} · Assignment {kebunitiReport.provenance?.assignment_id}</p><p>Received {kebunitiReport.provenance?.received_at} · Accepted {kebunitiReport.provenance?.accepted_at}</p><p>Blueprint hash {kebunitiReport.provenance?.blueprint_hash}</p></details>
              </div>}
            </div>
            <label>
              Status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>ALL</option>
                <option>RECEIVED</option>
                <option>ACCEPTED</option>
                <option>REJECTED</option>
              </select>
            </label>
            <label>
              Project filter
              <input
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Optional project UUID"
              />
            </label>
          </section>
          <section className="card" id="review">
            <h2>Exports</h2>
            <button onClick={() => exportData("assignments", "json")}>
              Assignments JSON
            </button>
            <button onClick={() => exportData("submissions", "csv")}>
              Submissions CSV
            </button>
            <button onClick={() => exportData("evidence", "csv")}>
              Evidence CSV
            </button>
            <button onClick={() => exportData("audit", "json")}>
              Audit JSON
            </button>
          </section>
          <section className="card">
            <h2>Review queue</h2>
            {canReview && (
              <p>
                <button
                  onClick={() => bulkReview("ACCEPT")}
                  disabled={!selected.length}
                >
                  Accept selected ({selected.length})
                </button>
                <button
                  onClick={() => bulkReview("REJECT")}
                  disabled={!selected.length}
                >
                  Reject selected
                </button>
              </p>
            )}
            {filtered.length ? (
              <ul>
                {filtered.map((s) => {
                  const id = s.submission_id ?? s.attempt_id;
                  return (
                    <li key={s.attempt_id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, id]
                              : selected.filter((x) => x !== id),
                          )
                        }
                        disabled={!s.submission_id || s.status !== "RECEIVED"}
                      />{" "}
                      {s.attempt_id.slice(0, 8)} · {s.status}{" "}
                      {canReview && (
                        <>
                          <button
                            onClick={() => review(id, "ACCEPT")}
                            disabled={s.status !== "RECEIVED"}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => review(id, "REJECT")}
                            disabled={s.status !== "RECEIVED"}
                          >
                            Reject
                          </button>
                        </>
                      )}{" "}
                      {s.submission_id && (
                        <><button onClick={() => showHistory(s.submission_id)}>History</button><button onClick={() => showKebunitiReport(s.submission_id)}>Open Kebuniti report</button></>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">No submissions match this filter.</p>
            )}
          </section>
          <section className="grid">
            <section className="card" id="audit">
              <h2>Outcome history</h2>
              {history.length ? (
                <ul>
                  {history.map((e) => (
                    <li key={e.id}>
                      {e.action_key} · {e.result} · {e.occurred_at}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Select History on a submission.</p>
              )}
            </section>
            <section className="card">
              <h2>Recent audit events</h2>
              {audit.length ? (
                <ul>
                  {audit.slice(0, 20).map((e) => (
                    <li key={e.id}>
                      {e.action_key} · {e.target_type} · {e.result}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No audit events found.</p>
              )}
            </section>
          </section>
        </>
      )}
        </div>
      </div>
    </main>
  );
}
