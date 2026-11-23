import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import CustomSnackbar from "../CustomSnackbar";
import { ConfirmDialog, FormDialog, formatDate, formatDateTime } from "../admin/shared";
import {
  MAX_FILE_MB, approveMaterial, createMaterial, downloadMaterial, fileToPayload, listInductionModules, listMaterials, listPolicies,
  publishPolicy, retireMaterial, updateInductionModule,
} from "../../../services/comsService";
import { getHomeRoute } from "../../../const/roles";
import { Badge, Btn, Field, Notice, TabBar, TableCell, TableRow, DataTable } from "../../ui";

const CATEGORIES = [
  { value: "brochure", label: "Brochure" }, { value: "fees", label: "Fees" }, { value: "policy", label: "Policy" },
  { value: "course_guide", label: "Course guide" }, { value: "other", label: "Other" },
];
const STATUS_TONE = { draft: "warning", approved: "success", retired: "neutral" };

const MANAGE_MODULES = ["admin", "director", "compliance", "marketing_officer"];
const PUBLISH_POLICY = ["admin", "director", "ceo", "compliance"];
const MANAGE_MATERIALS = ["admin", "director", "ceo", "marketing_officer"];
const APPROVE_MATERIALS = ["admin", "director", "ceo"]; // Marketing uploads, AFC management approves

// Staff page for the agent induction: the marketing materials agents download, the six modules, and the policies they acknowledge.
const InductionContent = ({ role }) => {
  const [tab, setTab] = useState("materials");
  const [materials, setMaterials] = useState([]);
  const [modules, setModules] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [target, setTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => {
    const [m, mo, p] = await Promise.all([listMaterials(), listInductionModules(), listPolicies()]);
    if (m.success) setMaterials(m.data);
    if (mo.success) setModules(mo.data);
    if (p.success) setPolicies(p.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (name, initial = {}, row = null) => { setForm(initial); setErrors({}); setTarget(row); setDialog(name); };
  const close = () => setDialog(null);
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const run = async (call, ok) => {
    const res = await call();
    if (res.success) { close(); setConfirm(null); showMessage(ok); load(); }
    else { if (res.errors) setErrors(res.errors); setConfirm(null); showMessage(res.message || "Something went wrong.", "error"); }
  };

  const canMaterials = MANAGE_MATERIALS.includes(role);
  const canApprove = APPROVE_MATERIALS.includes(role);
  const canModules = MANAGE_MODULES.includes(role);
  const canPolicy = PUBLISH_POLICY.includes(role);

  const submitMaterial = async () => {
    const e = {};
    if ((form.title || "").trim().length < 3) e.title = "Enter a title";
    if (!form.file) e.file = "Choose a file";
    else if (form.file.size > MAX_FILE_MB * 1024 * 1024) e.file = `The file is too large. The limit is ${MAX_FILE_MB} MB`;
    if (Object.keys(e).length) return setErrors(e);
    const file = await fileToPayload(form.file);
    run(() => createMaterial({ title: form.title.trim(), description: (form.description || "").trim() || undefined, category: form.category || "brochure", version: (form.version || "1.0").trim(), file, approve: !!form.approve }),
      form.approve ? "Uploaded and approved. Active agents have been told." : "Uploaded as a draft. Agents cannot see it until you approve it.");
  };
  const submitModule = () => {
    const e = {};
    if ((form.title || "").trim().length < 3) e.title = "Enter a title";
    if ((form.body || "").trim().length < 20) e.body = "Write the module content (at least 20 characters)";
    if (Object.keys(e).length) return setErrors(e);
    run(() => updateInductionModule(target.id, { title: form.title.trim(), body: form.body.trim() }), "Module saved.");
  };
  const submitPolicy = () => {
    const e = {};
    if (!(form.version || "").trim()) e.version = "Enter the version, for example 2.0";
    if ((form.title || "").trim().length < 3) e.title = "Enter a title";
    if ((form.body || "").trim().length < 20) e.body = "Write the policy text (at least 20 characters)";
    if (Object.keys(e).length) return setErrors(e);
    run(() => publishPolicy({ version: form.version.trim(), title: form.title.trim(), body: form.body.trim(), document_url: (form.document_url || "").trim() || undefined }), "New version published. Agents will be asked to read it.");
  };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Induction and materials</h1>
        <p>The marketing materials agents download, the six induction modules, and the policies and procedures agents acknowledge.</p>
      </div>
      <TabBar label="Induction sections" value={tab} onChange={setTab} tabs={[
        { value: "materials", label: "Marketing materials" }, { value: "modules", label: "Modules" }, { value: "policies", label: "Policies and procedures" },
      ]} />
      <div style={{ height: 20 }} />
      {loading && <div className="admin-panel admin-empty">Loading...</div>}

      {!loading && tab === "materials" && (
        <>
          <div className="admin-toolbar">
            <p className="app-hint" style={{ margin: 0 }}>{canApprove ? "A new upload is a draft. Agents only see it, and are emailed about it, after you approve it." : "A new upload is a draft. Agents only see it, and are emailed about it, after the Director or CEO approves it."}</p>
            {canMaterials && <Btn kind="primary" onClick={() => open("material", { category: "brochure", version: "1.0", approve: false })}>Upload material</Btn>}
          </div>
          {materials.length === 0 ? <div className="admin-panel admin-empty">No materials yet.</div> : (
            <DataTable label="InductionContent" head={["Material", "Type", "Version", "Status", "Agents told", ""]}>
                  {materials.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell data-label="Material"><strong>{m.title}</strong><div className="app-hint" style={{ margin: "2px 0 0" }}>{m.file_name} · uploaded by {m.uploaded_by_name || "-"}, {formatDate(m.created_at)}</div></TableCell>
                      <TableCell data-label="Type">{m.category_label}</TableCell>
                      <TableCell data-label="Version">{m.version}</TableCell>
                      <TableCell data-label="Status"><Badge tone={STATUS_TONE[m.status]} label={m.status === "approved" ? `Approved ${formatDate(m.approved_at)}` : m.status[0].toUpperCase() + m.status.slice(1)} /></TableCell>
                      <TableCell data-label="Agents told">{m.status === "approved" ? m.notified : "-"}</TableCell>
                      <TableCell data-label="" style={{ whiteSpace: "nowrap" }}>
                        <Btn size="small" onClick={async () => { const r = await downloadMaterial(m.id, m.file_name); if (r && r.success === false) showMessage(r.message || "Could not download.", "error"); }}>Download</Btn>{" "}
                        {canApprove && m.status === "draft" && <Btn size="small" kind="primary" onClick={() => setConfirm({ kind: "approve", m })}>Approve</Btn>}{" "}
                        {canApprove && m.status !== "retired" && <Btn size="small" kind="danger" onClick={() => setConfirm({ kind: "retire", m })}>Retire</Btn>}
                      </TableCell>
                    </TableRow>
                  ))}
                </DataTable>
          )}
        </>
      )}

      {!loading && tab === "modules" && (
        <>
          <Notice severity="info" sx={{ mb: 2 }}>These six topics are required. Editing a module raises its version. Agents who already finished it are not asked to redo it.</Notice>
          <DataTable label="InductionContent" head={["#", "Module", "Version", "Last changed", ""]}>
                {modules.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell data-label="#">{m.position}</TableCell>
                    <TableCell data-label="Module"><strong>{m.title}</strong>{m.body.startsWith("STARTER CONTENT") && <div style={{ marginTop: 4 }}><Badge tone="warning" label="Starter content: review before agents use it" /></div>}</TableCell>
                    <TableCell data-label="Version">{m.version}</TableCell>
                    <TableCell data-label="Last changed">{formatDateTime(m.updated_at)}</TableCell>
                    <TableCell data-label="">{canModules && <Btn size="small" onClick={() => open("module", { title: m.title, body: m.body }, m)}>Edit</Btn>}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
        </>
      )}

      {!loading && tab === "policies" && (
        <>
          <div className="admin-toolbar">
            <p className="app-hint" style={{ margin: 0 }}>Agents acknowledge the current version. Each acknowledgement is stored with the version, date, time and IP address and cannot be changed.</p>
            {canPolicy && <Btn kind="primary" onClick={() => { const cur = policies.find((p) => p.is_current); open("policy", { version: "", title: cur ? cur.title : "", body: cur ? cur.body : "", document_url: cur ? cur.document_url || "" : "" }); }}>Publish a new version</Btn>}
          </div>
          <DataTable label="InductionContent" head={["Version", "Title", "Published", "Status"]}>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell data-label="Version"><strong>{p.version}</strong></TableCell>
                    <TableCell data-label="Title">{p.title}{p.body.startsWith("STARTER CONTENT") && <div style={{ marginTop: 4 }}><Badge tone="warning" label="Starter content: replace with the approved PP" /></div>}</TableCell>
                    <TableCell data-label="Published">{formatDateTime(p.created_at)}</TableCell>
                    <TableCell data-label="Status">{p.is_current ? <Badge tone="success" label="Current" /> : <Badge tone="neutral" label="Earlier version" />}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
        </>
      )}

      <FormDialog open={dialog === "material"} title="Upload marketing material" intro="Draft materials are not visible to agents until you approve them." submitLabel="Upload" onSubmit={submitMaterial} onCancel={close}>
        <Field id="mm-title" label="Title" error={errors.title} value={form.title || ""} onChange={setField("title")} inputProps={{ maxLength: 200 }} />
        <Field id="mm-desc" label="Description (optional)" multiline value={form.description || ""} onChange={setField("description")} inputProps={{ maxLength: 2000 }} />
        <Field id="mm-cat" label="Type" value={form.category || "brochure"} onChange={setField("category")} options={CATEGORIES} />
        <Field id="mm-ver" label="Version" value={form.version || ""} onChange={setField("version")} inputProps={{ maxLength: 40 }} />
        <div>
          <input id="mm-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] || null }))} />
          <div className="app-hint" style={{ margin: "6px 0 0" }}>PDF, image, Word or Excel, up to {MAX_FILE_MB} MB.</div>
          {errors.file && <div style={{ color: "var(--danger, #c4161b)", fontSize: 13, marginTop: 4 }}>{errors.file}</div>}
        </div>
        {canApprove && (
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.approve} onChange={(e) => setForm((f) => ({ ...f, approve: e.target.checked }))} />
            <span>Approve now (agents are emailed straight away)</span>
          </label>
        )}
      </FormDialog>
      <FormDialog open={dialog === "module"} title={target ? `Edit module ${target.position}` : "Edit module"} intro="Write the content agents read. Plain text; blank lines separate paragraphs." submitLabel="Save" onSubmit={submitModule} onCancel={close}>
        <Field id="mod-title" label="Title" error={errors.title} value={form.title || ""} onChange={setField("title")} inputProps={{ maxLength: 160 }} />
        <Field id="mod-body" label="Content" error={errors.body} multiline rows={14} value={form.body || ""} onChange={setField("body")} inputProps={{ maxLength: 20000 }} />
      </FormDialog>
      <FormDialog open={dialog === "policy"} title="Publish a new version of the policies" intro="The new version becomes the one agents acknowledge. Earlier acknowledgements are kept." submitLabel="Publish" onSubmit={submitPolicy} onCancel={close}>
        <Field id="pp-ver" label="Version" error={errors.version} value={form.version || ""} onChange={setField("version")} inputProps={{ maxLength: 40 }} />
        <Field id="pp-title" label="Title" error={errors.title} value={form.title || ""} onChange={setField("title")} inputProps={{ maxLength: 200 }} />
        <Field id="pp-body" label="Policy text" error={errors.body} multiline rows={12} value={form.body || ""} onChange={setField("body")} inputProps={{ maxLength: 40000 }} />
        <Field id="pp-url" label="Link to the full document (optional)" error={errors.document_url} placeholder="https://" value={form.document_url || ""} onChange={setField("document_url")} inputProps={{ maxLength: 500 }} />
      </FormDialog>
      <ConfirmDialog
        open={!!confirm}
        title={confirm && confirm.kind === "approve" ? "Approve this material?" : "Retire this material?"}
        text={confirm && confirm.kind === "approve" ? `"${confirm.m.title}" becomes visible to agents who have finished their induction, and every active agent is emailed now.` : confirm ? `"${confirm.m.title}" disappears from the agent portal. It stays on record.` : ""}
        confirmLabel={confirm && confirm.kind === "approve" ? "Approve and notify agents" : "Retire"}
        danger={!!confirm && confirm.kind === "retire"}
        onConfirm={() => run(() => (confirm.kind === "approve" ? approveMaterial(confirm.m.id) : retireMaterial(confirm.m.id)), confirm.kind === "approve" ? "Approved. Active agents have been told." : "Retired.")}
        onCancel={() => setConfirm(null)}
      />
      <CustomSnackbar {...snackbar} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default InductionContent;
