import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { FilePick } from "../staff/DueDiligencePanel";
import { MAX_FILE_MB, fileToPayload } from "../../../services/comsService";
import {
  downloadStudentForm, getApplicationSettings, saveApplicationSettings, saveDocumentTypes, toggleStudentForm, uploadStudentForm,
} from "../../../services/studentApplicationService";
import { getHomeRoute } from "../../../const/roles";
import { Badge, Btn, CheckField, Field, Notice, Panel } from "../../ui";

const FIELDS = ["student_name", "ref_no", "course", "cricos_code", "campus", "start_date", "duration_weeks", "tuition_fee", "material_fee", "enrolment_fee", "total_fee", "conditions", "signer_name", "signer_title", "date", "date_of_birth", "passport_number", "coe_number"];

// Wording and rules for student applications. AFC can change these without a developer.
const ApplicationSettings = ({ role }) => {
  const [data, setData] = useState(null);
  const [s, setS] = useState(null);
  const [types, setTypes] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formFile, setFormFile] = useState(null);
  const [pickKey, setPickKey] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const apply = useCallback((d) => { setData(d); setS(d.settings); setTypes(d.doc_types.map((t) => ({ key: t.key, label: t.label, required: t.required, active: t.active }))); }, []);
  const load = useCallback(async () => {
    const res = await getApplicationSettings();
    if (res.success) apply(res.data); else showMessage(res.message || "Could not load the settings.", "error");
  }, [apply]);
  useEffect(() => { load(); }, [load]);

  const run = async (call, ok) => {
    setBusy(true); setErrors({});
    const res = await call();
    setBusy(false);
    if (res.success) { apply(res.data); showMessage(ok); return true; }
    if (res.errors) setErrors(res.errors);
    showMessage(res.message || "Could not save.", "error");
    return false;
  };
  const saveSettings = () => run(() => saveApplicationSettings({ ...s, docs_deadline_hours: Number(s.docs_deadline_hours), assessment_working_days: Number(s.assessment_working_days), declaration_items: s.declaration_items.map((x) => x.trim()).filter(Boolean) }), "Settings saved.");
  const saveTypes = () => run(() => saveDocumentTypes(types.map((t) => ({ ...(t.key ? { key: t.key } : {}), label: t.label.trim(), required: t.required && t.active, active: t.active }))), "Document list saved.");
  const sendForm = async () => {
    if (formLabel.trim().length < 3) return setErrors({ label: "Name the form" });
    if (!formFile) return setErrors({ file: "Choose a file" });
    if (formFile.size > MAX_FILE_MB * 1024 * 1024) return setErrors({ file: `The file is too large. The limit is ${MAX_FILE_MB} MB.` });
    const payload = { label: formLabel.trim(), file: await fileToPayload(formFile) };
    const ok = await run(() => uploadStudentForm(payload), "Form added.");
    if (ok) { setFormLabel(""); setFormFile(null); setPickKey((k) => k + 1); }
  };

  if (!data || !s) return <div className="admin-page"><LoadingSpinner /></div>;
  const set = (patch) => setS((x) => ({ ...x, ...patch }));
  const setItem = (n, v) => set({ declaration_items: s.declaration_items.map((x, i) => (i === n ? v : x)) });
  const setType = (n, patch) => setTypes((list) => list.map((t, i) => (i === n ? { ...t, ...patch } : t)));

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Student application settings</h1>
        <p>The wording agents and students see, the documents an application needs, and the forms agents can download. Change them here when AFC updates its documents. Applications already submitted keep their answers.</p>
      </div>

      <Panel>
        <h2 style={{ marginTop: 0 }}>Wording and timing</h2>
        <div className="field-grid">
          <Field label="Hours to submit after receiving the documents" type="number" value={s.docs_deadline_hours} error={errors.docs_deadline_hours} helper="Applications sent later are flagged for staff" onChange={(e) => set({ docs_deadline_hours: e.target.value })} />
          <Field label="Working days to assess an application" type="number" value={s.assessment_working_days} error={errors.assessment_working_days} onChange={(e) => set({ assessment_working_days: e.target.value })} />
          <Field label="Confirmation: pre-enrolment information sent" wide multiline rows={2} value={s.pre_enrolment_text} error={errors.pre_enrolment_text} onChange={(e) => set({ pre_enrolment_text: e.target.value })} />
          <Field label="Confirmation: agent did not sign for the student" wide multiline rows={2} value={s.agent_not_signed_text} error={errors.agent_not_signed_text} onChange={(e) => set({ agent_not_signed_text: e.target.value })} />
          <Field label="Privacy notice shown above the declaration" wide multiline rows={6} value={s.privacy_notice} error={errors.privacy_notice} onChange={(e) => set({ privacy_notice: e.target.value })} />
        </div>
        <h3>Student declaration</h3>
        <p className="app-hint">The student ticks every statement. These match the declaration on the AFC enrolment form.</p>
        {errors.declaration_items && <Notice severity="error" sx={{ mb: 1 }}>{errors.declaration_items}</Notice>}
        {s.declaration_items.map((t, n) => (
          <div key={n} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}><Field label={`Statement ${n + 1}`} multiline rows={2} value={t} onChange={(e) => setItem(n, e.target.value)} /></div>
            <Btn kind="danger" disabled={s.declaration_items.length < 2} onClick={() => set({ declaration_items: s.declaration_items.filter((_, i) => i !== n) })}>Remove</Btn>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
          <Btn onClick={() => set({ declaration_items: [...s.declaration_items, ""] })} disabled={s.declaration_items.length >= 12}>Add a statement</Btn>
          <Btn kind="primary" size="medium" disabled={busy} onClick={saveSettings}>{busy ? "Saving..." : "Save wording and timing"}</Btn>
        </div>
      </Panel>


      <Panel style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Letter of Offer and Verification of Enrolment</h2>
        <p className="app-hint">
          The wording below is a placeholder until AFC supplies its own. Letters cannot be issued until you tick "confirmed" after the wording is final.
          Fields in double curly brackets are filled in for each student: {FIELDS.map((f) => `{{${f}}}`).join(", ")}.
        </p>
        <div className="field-grid">
          <Field label="Signed by (name)" value={s.loo_signer_name || ""} error={errors.loo_signer_name} onChange={(e) => set({ loo_signer_name: e.target.value })} />
          <Field label="Signed by (position)" value={s.loo_signer_title || ""} error={errors.loo_signer_title} onChange={(e) => set({ loo_signer_title: e.target.value })} />
          <Field label="Conditions of the offer" wide multiline rows={4} value={s.loo_conditions || ""} error={errors.loo_conditions} onChange={(e) => set({ loo_conditions: e.target.value })} />
          <Field label="Letter of Offer text" wide multiline rows={16} value={s.loo_template || ""} error={errors.loo_template} onChange={(e) => set({ loo_template: e.target.value })} />
          <Field label="Verification of Enrolment text" wide multiline rows={10} value={s.voe_template || ""} error={errors.voe_template} onChange={(e) => set({ voe_template: e.target.value })} />
          <CheckField wide label="AFC has confirmed this wording. Letters can now be issued." checked={Boolean(s.letters_confirmed)} onChange={(on) => set({ letters_confirmed: on })} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn kind="primary" size="medium" disabled={busy} onClick={saveSettings}>{busy ? "Saving..." : "Save letter wording"}</Btn>
        </div>
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Documents an application needs</h2>
        <p className="app-hint">Tick Required for the documents an agent must upload before submitting. A document type is switched off, never deleted. The signed enrolment form must stay required.</p>
        {errors.items && <Notice severity="error" sx={{ mb: 1 }}>{errors.items}</Notice>}
        {types.map((t, n) => (
          <div key={t.key || `new${n}`} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ flex: "1 1 280px" }}><Field label="Document" value={t.label} error={errors[`items.${n}.label`]} onChange={(e) => setType(n, { label: e.target.value })} /></div>
            <CheckField label="Required" checked={t.required && t.active} disabled={!t.active} onChange={(on) => setType(n, { required: on })} />
            <CheckField label="In use" checked={t.active} onChange={(on) => setType(n, { active: on })} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
          <Btn onClick={() => setTypes((l) => [...l, { key: "", label: "", required: false, active: true }])}>Add a document</Btn>
          <Btn kind="primary" size="medium" disabled={busy} onClick={saveTypes}>{busy ? "Saving..." : "Save document list"}</Btn>
        </div>
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Forms agents can download</h2>
        <p className="app-hint">For example the Genuine Student form or the Credit Transfer and RPL form. Agents see these on the last step of an application.</p>
        <ul className="dd-list">
          {data.forms.length === 0 && <li>No forms added yet.</li>}
          {data.forms.map((f) => (
            <li key={f.id}>
              <span style={{ flex: 1 }}><strong>{f.label}</strong><small>{f.original_name}</small></span>
              <Badge tone={f.active ? "success" : "neutral"} label={f.active ? "Shown" : "Hidden"} />
              <Btn onClick={() => downloadStudentForm(f.id, f.label)}>Download</Btn>
              <Btn disabled={busy} onClick={() => run(() => toggleStudentForm(f.id, !f.active), f.active ? "Form hidden." : "Form shown.")}>{f.active ? "Hide" : "Show"}</Btn>
            </li>
          ))}
        </ul>
        <div className="app-card" style={{ marginTop: 12 }}>
          <div className="field-grid">
            <Field label="Form name" value={formLabel} error={errors.label} inputProps={{ maxLength: 160 }} onChange={(e) => setFormLabel(e.target.value)} />
          </div>
          <FilePick key={pickKey} id="sf-file" label="File" file={formFile} error={errors.file} onChange={setFormFile} />
          <div style={{ marginTop: 10 }}><Btn kind="primary" size="medium" disabled={busy} onClick={sendForm}>Add the form</Btn></div>
        </div>
      </Panel>
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default ApplicationSettings;
