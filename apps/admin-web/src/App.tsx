import { useState } from "react";
const API = "https://binafield-api.vercel.app/api";
const DEFAULT_ORG = "a0000000-0000-4000-8000-000000000001";
export default function App() {
  const [org, setOrg] = useState(DEFAULT_ORG),
    [token, setToken] = useState(""),
    [context, setContext] = useState<any>(null),
    [templates, setTemplates] = useState<any[]>([]),
    [templateKey, setTemplateKey] = useState(""),
    [templateName, setTemplateName] = useState(""),
    [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(""),
    [versions, setVersions] = useState<any[]>([]),
    [assignments, setAssignments] = useState<any[]>([]),
    [submissions, setSubmissions] = useState<any[]>([]);
  const [projectId, setProjectId] = useState(
      "a0000000-0000-4000-8000-000000000010",
    ),
    [deploymentId, setDeploymentId] = useState(
      "a0000000-0000-4000-8000-000000000016",
    ),
    [assigneeId, setAssigneeId] = useState(
      "a0000000-0000-4000-8000-000000000002",
    );
  const loadContext = async () => {
    setMessage("Loading organisation context…");
    try {
      const h = { authorization: `Bearer ${token}` };
      const r = await fetch(`${API}/organizations/${org}/me`, { headers: h });
      const body = await r.json();
      setContext(body);
      if (r.ok) {
        const t = await fetch(`${API}/organizations/${org}/templates`, {
          headers: h,
        });
        const tb = await t.json();
        setTemplates(tb.items ?? []);
      }
      setMessage(
        r.ok
          ? "Organisation context loaded"
          : `${body.code ?? `HTTP_${r.status}`}`,
      );
    } catch {
      setMessage("Network error");
    }
  };
  const createTemplate = async () => {
    try {
      const r = await fetch(`${API}/organizations/${org}/templates`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": `admin-template-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({ template_key: templateKey, name: templateName }),
      });
      const b = await r.json();
      if (!r.ok) {
        setMessage(`${b.code ?? `HTTP_${r.status}`}: ${b.detail ?? ""}`);
        return;
      }
      setTemplates([b, ...templates]);
      setTemplateKey("");
      setTemplateName("");
      setMessage("Draft template created");
    } catch {
      setMessage("Network error");
    }
  };
  const createVersion = async () => {
    if (!selectedTemplate) return;
    const blueprint = {
      schema: "bf-blueprint/1.0",
      title: "Site inspection",
      fields: [
        {
          id: "status",
          type: "select",
          label: "Site status",
          options: ["OK", "ATTENTION", "FAIL"],
          required: true,
        },
        { id: "notes", type: "text", label: "Notes", required: false },
        { id: "photos", type: "photo", label: "Site photo", required: true },
      ],
    };
    try {
      const r = await fetch(
        `${API}/organizations/${org}/templates/${selectedTemplate}/versions`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "idempotency-key": `admin-version-${crypto.randomUUID()}`,
          },
          body: JSON.stringify({ blueprint_json: blueprint }),
        },
      );
      const b = await r.json();
      if (!r.ok) throw new Error(`${b.code ?? r.status}: ${b.detail ?? ""}`);
      setVersions([b, ...versions]);
      setMessage(`Draft version ${b.version_no} created`);
    } catch (e) {
      setMessage(String(e));
    }
  };
  const changeVersion = async (id: string, action: "validate" | "publish") => {
    try {
      const r = await fetch(
        `${API}/organizations/${org}/template-versions/${id}:${action}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            ...(action === "publish"
              ? { "idempotency-key": `admin-${action}-${crypto.randomUUID()}` }
              : {}),
          },
        },
      );
      const b = await r.json();
      if (!r.ok) throw new Error(`${b.code ?? r.status}: ${b.detail ?? ""}`);
      setVersions(versions.map((v) => (v.id === id ? { ...v, ...b } : v)));
      setMessage(`Version ${action}d`);
    } catch (e) {
      setMessage(String(e));
    }
  };
  const loadOperations = async () => {
    try {
      const [a, s] = await Promise.all([
        fetch(`${API}/organizations/${org}/assignments`, {
          headers: { authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/organizations/${org}/submissions`, {
          headers: { authorization: `Bearer ${token}` },
        }),
      ]);
      const ab = await a.json(),
        sb = await s.json();
      if (!a.ok || !s.ok)
        throw new Error(ab.detail ?? sb.detail ?? "Could not load operations");
      setAssignments(ab.items ?? []);
      setSubmissions(sb.items ?? []);
      setMessage("Assignments and submissions refreshed");
    } catch (e) {
      setMessage(String(e));
    }
  };
  const createAssignment = async () => {
    const version =
      versions.find((v) => v.lifecycle_state === "PUBLISHED") ?? versions[0];
    if (!version) {
      setMessage("Create and publish a template version first");
      return;
    }
    try {
      const r = await fetch(`${API}/organizations/${org}/assignments`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": `admin-assignment-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          deployment_id: deploymentId,
          template_version_id: version.id,
          assignee_membership_id: assigneeId,
          operational_subject_ref: { label: "Admin-created assignment" },
          priority: "NORMAL",
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(`${b.code ?? r.status}: ${b.detail ?? ""}`);
      setAssignments([b, ...assignments]);
      setMessage("Assignment issued");
    } catch (e) {
      setMessage(String(e));
    }
  };
  const reviewSubmission = async (
    id: string,
    decision: "ACCEPT" | "REJECT",
  ) => {
    try {
      const r = await fetch(
        `${API}/organizations/${org}/submissions/${id}/review`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ decision }),
        },
      );
      const b = await r.json();
      if (!r.ok) throw new Error(`${b.code ?? r.status}: ${b.detail ?? ""}`);
      setSubmissions(
        submissions.map((s) =>
          s.submission_id === id || s.attempt_id === id
            ? { ...s, status: b.status, submission_id: b.submission_id }
            : s,
        ),
      );
      setMessage(`Submission ${b.status.toLowerCase()}`);
    } catch (e) {
      setMessage(String(e));
    }
  };
  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">BinaField</p>
          <h1>Admin Studio</h1>
          <p className="muted">
            Templates, assignments, submissions, and operational results.
          </p>
        </div>
        <span className="badge">Foundation</span>
      </header>
      <section className="card">
        <h2>Organisation context</h2>
        <label>
          Organisation ID
          <input value={org} onChange={(e) => setOrg(e.target.value)} />
        </label>
        <label>
          Bearer token{" "}
          <span className="muted">(kept in this browser only)</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        <button onClick={loadContext} disabled={!token}>
          Load context
        </button>
        {message && <p className="message">{message}</p>}
      </section>
      {context?.organization_id && (
        <>
          <section className="card">
            <h2>Templates</h2>
            <div className="grid">
              <label>
                Template key
                <input
                  placeholder="site-inspection"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                />
              </label>
              <label>
                Name
                <input
                  placeholder="Site inspection"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </label>
            </div>
            <button
              onClick={createTemplate}
              disabled={!templateKey || !templateName}
            >
              Create draft template
            </button>
            {templates.length === 0 ? (
              <p className="muted">No templates loaded.</p>
            ) : (
              <ul>
                {templates.map((t) => (
                  <li key={t.id}>
                    <strong>{t.name}</strong> · {t.template_key} ·{" "}
                    {t.lifecycle_state}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="grid">
            <article className="card">
              <h2>Access</h2>
              <p>
                <strong>{context.membership_state}</strong> membership
              </p>
              <p>{context.permissions?.length ?? 0} permissions loaded</p>
            </article>
            <article className="card">
              <h2>Next modules</h2>
              <p>Blueprint editor · Validation · Publishing</p>
              <p className="muted">
                Assignment and submission modules follow template lifecycle.
              </p>
            </article>
          </section>
        </>
      )}
      {context?.code && (
        <section className="error">
          {context.code}: {context.detail ?? "Access denied"}
        </section>
      )}
    </main>
  );
}
