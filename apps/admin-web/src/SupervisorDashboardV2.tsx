import { useState } from "react";
const API = "https://binafield-api.vercel.app/api";
const DEFAULT_ORG = "a0000000-0000-4000-8000-000000000001";
export default function SupervisorDashboardV2() {
  const [org, setOrg] = useState(DEFAULT_ORG),
    [token, setToken] = useState(""),
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
    [filter, setFilter] = useState("ALL"),
    [project, setProject] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [roleMember, setRoleMember] = useState(""),
    [roleId, setRoleId] = useState(""),
    [roleScope, setRoleScope] = useState<"ORG_WIDE" | "PROJECT_RESTRICTED">(
      "ORG_WIDE",
    ),
    [scopeProject, setScopeProject] = useState("");
  const h = () => ({ authorization: `Bearer ${token}` });
  const read = async (r: Response) => {
    const b = await r.json();
    if (!r.ok) throw new Error(`${b.code ?? r.status}: ${b.detail ?? ""}`);
    return b;
  };
  const refresh = async () => {
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
  const exportData = (resource: string, format: string) =>
    window.open(
      `${API}/organizations/${org}/exports/${resource}?format=${format}&limit=5000`,
      "_blank",
      "noopener,noreferrer",
    );
  const filtered = submissions.filter(
    (s) =>
      (filter === "ALL" || s.status === filter) &&
      (!project || s.project_id === project),
  );
  const canReview = context?.permissions?.includes("submission.review");
  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">BinaField</p>
          <h1>Admin Studio</h1>
          <p className="muted">
            Administration, supervisor review, audit, and exports
          </p>
        </div>
        <span className="badge">Goal 12</span>
      </header>
      <section className="card">
        <h2>Organisation context</h2>
        <label>
          Organisation ID
          <input
            aria-label="Organisation ID"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        </label>
        <label>
          Bearer token{" "}
          <span className="muted">(kept in this browser only)</span>
          <input
            aria-label="Bearer token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        <button onClick={refresh} disabled={!token || loading}>
          {loading ? "Loading…" : "Load Admin Studio"}
        </button>
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
          <section className="grid">
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
          <section className="card">
            <h2>Activity summary</h2>
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
          <section className="card">
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
                        <button onClick={() => showHistory(s.submission_id)}>
                          History
                        </button>
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
            <section className="card">
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
    </main>
  );
}
