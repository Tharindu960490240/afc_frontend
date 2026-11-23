import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { formatDate, formatDateTime } from "../admin/shared";
import { FilePick } from "../staff/DueDiligencePanel";
import { MAX_FILE_MB, fileToPayload } from "../../../services/comsService";
import {
  discardApplication, downloadApplicationDocument, downloadOutput, downloadStudentForm, getApplication, getFormConfig, removeApplicationDocument,
  saveApplication, submitApplication, uploadApplicationDocument,
} from "../../../services/studentApplicationService";
import { Badge, Btn, CheckField, Field, Notice, Panel } from "../../ui";
import { FINAL_SECTIONS, STEPS, STEP_OF, YES_NO, getIn, prune, setIn } from "./studentFormSteps";
import { STATUS } from "./StudentApplications";

const toSel = (v) => (v === true ? "yes" : v === false ? "no" : "");
const fromSel = (v) => (v === "yes" ? true : v === "no" ? false : undefined);
const DOC_TONE = { received: "warning", accepted: "success", needs_update: "danger", missing: "neutral" };
const DOC_LABEL = { received: "Received", accepted: "Accepted", needs_update: "Needs updating", missing: "Not uploaded" };

// The agent completes the AFC enrolment form one step at a time. Each step is saved when the agent moves on.
const StudentApplicationForm = ({ role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [app, setApp] = useState(null);
  const [data, setData] = useState({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [docKind, setDocKind] = useState("");
  const [docLabel, setDocLabel] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [docError, setDocError] = useState("");
  const [pickKey, setPickKey] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([getFormConfig(), getApplication(id)]);
    if (c.success) setCfg(c.data);
    if (a.success) { setApp(a.data); setData(a.data.data || {}); }
    else showMessage(a.message || "Could not open the application.", "error");
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const course = useMemo(() => (cfg && cfg.courses.find((c) => Number(c.id) === Number((data.course || {}).course_id))) || null, [cfg, data.course]);
  const ctx = useMemo(() => ({ isElicos: Boolean(course && course.course_type === "ELICOS") }), [course]);

  if (!cfg || !app) return <div className="admin-page"><LoadingSpinner /></div>;

  const editable = app.can_edit;
  const setValue = (s, f, v) => setData((d) => ({ ...d, [s]: setIn(d[s] || {}, f, v) }));
  const err = (s, f) => errors[`${s}.${f}`];

  // ---------- one field ----------
  const renderField = (fd, i) => {
    const out = renderInner(fd, i);
    return out && <React.Fragment key={fd.h ? `h${i}` : `${fd.s}.${fd.f}`}>{out}</React.Fragment>;
  };
  const renderInner = (fd, i) => {
    if (fd.h) return <h3 className="is-wide" style={{ margin: "12px 0 0" }}>{fd.h}</h3>;
    if (fd.showIf && !fd.showIf(data, ctx)) return null;
    const value = getIn(data[fd.s] || {}, fd.f);
    const common = { label: fd.label, wide: fd.wide, error: err(fd.s, fd.f), helper: fd.helper, disabled: !editable };
    switch (fd.type) {
      case "bool":
        return <Field {...common} value={toSel(value)} options={YES_NO} onChange={(e) => setValue(fd.s, fd.f, fromSel(e.target.value))} />;
      case "select":
        return <Field {...common} value={value ?? ""} options={[{ value: "", label: "Choose..." }, ...fd.options.filter((o) => o.value !== "")]} onChange={(e) => setValue(fd.s, fd.f, e.target.value)} />;
      case "campus":
        return <Field {...common} value={value ?? ""} options={[{ value: "", label: "Choose..." }, ...cfg.campuses.map((c) => ({ value: c.id, label: c.name }))]} onChange={(e) => { setValue(fd.s, fd.f, e.target.value); setValue("course", "course_id", ""); }} />;
      case "course": {
        const campus = Number((data.course || {}).campus_id);
        const list = cfg.courses.filter((c) => !campus || (c.campus_ids || []).map(Number).includes(campus));
        const label = (c) => `${c.code ? `${c.code} ` : ""}${c.name}${c.specialisation ? ` (${c.specialisation})` : ""}`;
        return <Field {...common} value={value ?? ""} options={[{ value: "", label: campus ? "Choose..." : "Choose a campus first" }, ...list.map((c) => ({ value: c.id, label: label(c) }))]} onChange={(e) => setValue(fd.s, fd.f, e.target.value)} />;
      }
      case "date":
        return <Field {...common} type="date" InputLabelProps={{ shrink: true }} value={value ?? ""} onChange={(e) => setValue(fd.s, fd.f, e.target.value)} />;
      case "number":
        return <Field {...common} type="number" value={value ?? ""} onChange={(e) => setValue(fd.s, fd.f, e.target.value)} />;
      case "check":
        return <CheckField wide={fd.wide} label={fd.label} disabled={!editable} checked={Boolean(value)} onChange={(on) => setValue(fd.s, fd.f, on)} />;
      case "multi": {
        const chosen = Array.isArray(value) ? value : [];
        return (
          <div className={fd.wide ? "is-wide" : undefined}>
            <strong style={{ display: "block", marginBottom: 4 }}>{fd.label}</strong>
            {fd.options.map((o) => (
              <CheckField key={o.value} label={o.label} disabled={!editable} checked={chosen.includes(o.value)}
                onChange={(on) => setValue(fd.s, fd.f, on ? [...chosen, o.value] : chosen.filter((x) => x !== o.value))} />
            ))}
            {err(fd.s, fd.f) && <div className="admin-hint" style={{ color: "#b3261e" }}>{err(fd.s, fd.f)}</div>}
          </div>
        );
      }
      case "quals": {
        const rows = Array.isArray(value) && value.length ? value : [{}];
        const setRow = (n, patch) => setValue(fd.s, fd.f, rows.map((r, j) => (j === n ? { ...r, ...patch } : r)));
        return (
          <div className="is-wide">
            <strong style={{ display: "block", marginBottom: 4 }}>{fd.label}</strong>
            {rows.map((r, n) => (
              <div className="field-grid" key={n} style={{ marginBottom: 8 }}>
                <Field label="Qualification" value={r.name || ""} disabled={!editable} onChange={(e) => setRow(n, { name: e.target.value })} />
                <Field label="Institution" value={r.institution || ""} disabled={!editable} onChange={(e) => setRow(n, { institution: e.target.value })} />
                <Field label="Year" type="number" value={r.year || ""} disabled={!editable} onChange={(e) => setRow(n, { year: e.target.value })} />
                <Field label="Country" value={r.country || ""} disabled={!editable} onChange={(e) => setRow(n, { country: e.target.value })} />
              </div>
            ))}
            {editable && rows.length < 4 && <Btn onClick={() => setValue(fd.s, fd.f, [...rows, {}])}>Add another</Btn>}
            {err(fd.s, fd.f) && <div className="admin-hint" style={{ color: "#b3261e" }}>{err(fd.s, fd.f)}</div>}
          </div>
        );
      }
      default:
        return <Field {...common} value={value ?? ""} inputProps={{ maxLength: 200 }} onChange={(e) => setValue(fd.s, fd.f, e.target.value)} />;
    }
  };

  // ---------- saving ----------
  const payloadFor = (sections) => Object.fromEntries(sections.map((s) => [s, prune(data[s]) || {}]));
  const persist = async (sections) => {
    const res = await saveApplication(id, payloadFor(sections));
    if (!res.success) {
      setErrors(res.errors || {});
      showMessage(res.message || "Could not save.", "error");
      return false;
    }
    setApp(res.data);
    return true;
  };
  const sectionsOf = (n) => (n < STEPS.length ? STEPS[n].sections : FINAL_SECTIONS);
  const go = async (n) => {
    if (editable) {
      setBusy(true); setErrors({});
      const ok = await persist(sectionsOf(step));
      setBusy(false);
      if (!ok) return;
    }
    setStep(n);
    window.scrollTo({ top: 0 });
  };
  const saveAndExit = async () => {
    setBusy(true);
    const ok = await persist(sectionsOf(step));
    setBusy(false);
    if (ok) { showMessage("Saved. You can come back to it any time."); navigate("/agent/applications"); }
  };
  const discard = async () => {
    if (!window.confirm("Discard this draft? It cannot be recovered.")) return; // eslint-disable-line no-alert
    const res = await discardApplication(id);
    if (res.success) navigate("/agent/applications"); else showMessage(res.message || "Could not discard it.", "error");
  };

  // ---------- documents ----------
  const upload = async () => {
    setDocError("");
    if (!docKind) return setDocError("Choose the document type.");
    if (!docFile) return setDocError("Choose a file first.");
    if (docFile.size > MAX_FILE_MB * 1024 * 1024) return setDocError(`The file is too large. The limit is ${MAX_FILE_MB} MB.`);
    if (docKind === "other" && docLabel.trim().length < 3) return setDocError("Describe the document.");
    setBusy(true);
    const res = await uploadApplicationDocument(id, { kind: docKind, label: docKind === "other" ? docLabel.trim() : undefined, file: await fileToPayload(docFile) });
    setBusy(false);
    if (res.success) { setApp(res.data); setDocFile(null); setDocLabel(""); setPickKey((k) => k + 1); showMessage("Uploaded."); setErrors((e) => { const { documents, ...rest } = e; return rest; }); }
    else setDocError((res.errors && (res.errors.file || res.errors.kind)) || res.message || "Could not upload the file.");
  };
  const removeDoc = async (d) => {
    setBusy(true);
    const res = await removeApplicationDocument(id, d.id);
    setBusy(false);
    if (res.success) setApp(res.data); else showMessage(res.message || "Could not remove it.", "error");
  };

  // ---------- submit ----------
  const submit = async () => {
    setBusy(true); setErrors({});
    const ok = await persist(FINAL_SECTIONS);
    if (!ok) { setBusy(false); return; }
    const res = await submitApplication(id);
    setBusy(false);
    if (res.success) { setApp(res.data); showMessage("Submitted. You and the student have been emailed."); window.scrollTo({ top: 0 }); return; }
    const found = res.errors || {};
    setErrors(found);
    const first = Object.keys(found).map((k) => STEP_OF[k.split(".")[0]]).filter((n) => n !== undefined).sort((a, b) => a - b)[0];
    showMessage(res.message || "Some answers need attention.", "error");
    if (first !== undefined) setStep(first);
  };

  // ---------- views ----------
  const st = STATUS[app.status] || { label: app.status, tone: "neutral" };
  const header = (
    <div className="admin-head">
      <h1>{app.ref_no ? `Application ${app.ref_no}` : "New student application"} <Badge tone={st.tone} label={st.label} /></h1>
      <p>
        {[app.student_given_names, app.student_surname].filter(Boolean).join(" ") || "Student not named yet"}
        {app.course_name ? ` · ${app.course_code || ""} ${app.course_name}` : ""}{app.campus_name ? ` · ${app.campus_name}` : ""}
      </p>
    </div>
  );

  const docList = (
    <ul className="dd-list">
      {app.required_documents.map((r) => {
        const d = app.documents.filter((x) => x.kind === r.kind).pop();
        return (
          <li key={r.kind}>
            <span style={{ flex: 1 }}>
              <strong>{r.label}</strong>
              {d && <small>{d.original_name} · {formatDate(d.created_at)}</small>}
              {d && d.status === "needs_update" && d.review_note && <small style={{ color: "var(--brand-red)" }}>{d.review_note}</small>}
            </span>
            <Badge tone={DOC_TONE[r.status]} label={DOC_LABEL[r.status]} />
            {d && <Btn onClick={() => downloadApplicationDocument(id, d.id, d.original_name)}>Download</Btn>}
          </li>
        );
      })}
      {app.documents.filter((d) => !app.required_documents.some((r) => r.kind === d.kind)).map((d) => (
        <li key={d.id}>
          <span style={{ flex: 1 }}>
            <strong>{(cfg.doc_types.find((t) => t.key === d.kind) || {}).label || d.kind}{d.label ? `: ${d.label}` : ""}</strong>
            <small>{d.original_name} · {formatDate(d.created_at)}</small>
          </span>
          <Badge tone={DOC_TONE[d.status]} label={DOC_LABEL[d.status]} />
          <Btn onClick={() => downloadApplicationDocument(id, d.id, d.original_name)}>Download</Btn>
          {editable && d.status !== "accepted" && <Btn kind="danger" disabled={busy} onClick={() => removeDoc(d)}>Remove</Btn>}
        </li>
      ))}
    </ul>
  );

  // after the form is submitted: a read-only status page
  if (!editable) {
    return (
      <div className="admin-page">
        <Link to="/agent/applications" className="admin-back"><ArrowBack fontSize="small" /> Student applications</Link>
        {header}
        <Panel>
          <h2 style={{ marginTop: 0 }}>Where this stands</h2>
          <p className="app-hint">
            {app.submitted_at ? `Submitted ${formatDateTime(app.submitted_at)}. ` : ""}
            {app.assessment_due && !["decision_made", "coe_issued", "withdrawn"].includes(app.status) ? `AFC aims to assess it by ${formatDate(app.assessment_due)}.` : ""}
          </p>
          {app.decision_reason && <Notice severity="info" sx={{ mb: 1 }}>{app.decision_reason}</Notice>}
          {app.outputs && app.outputs.length > 0 && (
            <>
              <h3>From AFC</h3>
              <ul className="dd-list">
                {app.outputs.map((o) => (
                  <li key={o.kind}><span style={{ flex: 1 }}><strong>{o.label}</strong>{o.at && <small>{formatDate(o.at)}</small>}</span><Btn kind="primary" onClick={() => downloadOutput(id, o.kind, `${o.label}.pdf`)}>Download</Btn></li>
                ))}
              </ul>
            </>
          )}
          <h3>Documents</h3>
          {docList}
          <h3>History</h3>
          <ul className="dd-list">
            {app.history.map((h) => (
              <li key={h.id}><span style={{ flex: 1 }}><strong>{(STATUS[h.to_status] || { label: h.to_status }).label}</strong>{h.note && <small>{h.note}</small>}</span><small>{formatDateTime(h.created_at)}</small></li>
            ))}
          </ul>
        </Panel>
        <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
      </div>
    );
  }

  const last = step === STEPS.length;
  const titles = [...STEPS.map((s) => s.title), "Documents and declaration"];
  const stepHasError = (n) => Object.keys(errors).some((k) => STEP_OF[k.split(".")[0]] === n);
  const declared = (data.declaration || {}).items || [];
  const infoNote = app.status === "info_requested" ? app.history.filter((h) => h.to_status === "info_requested").pop() : null;

  return (
    <div className="admin-page">
      <Link to="/agent/applications" className="admin-back"><ArrowBack fontSize="small" /> Student applications</Link>
      {header}
      {!cfg.can_submit && <Notice severity="warning" sx={{ mb: 2 }}>{cfg.blocked_reason} You can read the form but not submit it yet.</Notice>}
      {infoNote && <Notice severity="warning" sx={{ mb: 2 }} title="AFC needs more information">{infoNote.note}</Notice>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }} role="tablist" aria-label="Steps">
        {titles.map((t, n) => (
          <Btn key={t} kind={n === step ? "primary" : "outline"} onClick={() => go(n)} disabled={busy} aria-current={n === step ? "step" : undefined}>
            {n + 1}. {t}{stepHasError(n) ? " (check)" : ""}
          </Btn>
        ))}
      </div>

      {Object.keys(errors).length > 0 && (
        <Notice severity="error" sx={{ mb: 2 }} title="Please check these answers">
          {errors.documents ? `${errors.documents}. ` : ""}Boxes that need attention are marked on each step.
        </Notice>
      )}

      <Panel>
        {!last && (
          <div className="field-grid">{STEPS[step].fields.map(renderField)}</div>
        )}

        {last && (
          <>
            <h2 style={{ marginTop: 0 }}>Documents</h2>
            <p className="app-hint">Upload a clear copy of each document. PDF, JPG, PNG or DOCX, up to {MAX_FILE_MB} MB each. The student's signed enrolment form is required.</p>
            {cfg.forms.length > 0 && (
              <p className="app-hint">
                Forms to download: {cfg.forms.map((f, i) => (
                  <span key={f.id}>{i ? " · " : ""}<Btn onClick={() => downloadStudentForm(f.id, f.label)}>{f.label}</Btn></span>
                ))}
              </p>
            )}
            {errors.documents && <Notice severity="error" sx={{ mb: 1 }}>{errors.documents}</Notice>}
            {docList}
            <div className="app-card" style={{ marginTop: 12 }}>
              {docError && <Notice severity="error" sx={{ mb: 1 }}>{docError}</Notice>}
              <div className="field-grid">
                <Field label="Document type" value={docKind} options={[{ value: "", label: "Choose..." }, ...cfg.doc_types.map((t) => ({ value: t.key, label: t.label }))]} onChange={(e) => setDocKind(e.target.value)} />
                {docKind === "other" && <Field label="Describe the document" value={docLabel} inputProps={{ maxLength: 160 }} onChange={(e) => setDocLabel(e.target.value)} />}
              </div>
              <FilePick key={pickKey} id="sa-file" label="File" file={docFile} onChange={setDocFile} />
              <div style={{ marginTop: 10 }}><Btn kind="primary" size="medium" disabled={busy} onClick={upload}>{busy ? "Working..." : "Upload"}</Btn></div>
            </div>

            <h2>Student declaration</h2>
            {cfg.privacy_notice && <div className="app-card" style={{ maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 13, marginBottom: 12 }}>{cfg.privacy_notice}</div>}
            <div className="field-grid">
              <div className="is-wide">
                {cfg.declaration_items.map((t, n) => (
                  <CheckField key={t} label={t} checked={declared[n] === true}
                    onChange={(on) => setData((d) => { const items = cfg.declaration_items.map((_, j) => ((d.declaration || {}).items || [])[j] === true); items[n] = on; return { ...d, declaration: { ...(d.declaration || {}), items } }; })} />
                ))}
                {errors["declaration.items"] && <div className="admin-hint" style={{ color: "#b3261e" }}>{errors["declaration.items"]}</div>}
              </div>
              <Field label="Student's full name" value={(data.declaration || {}).student_name || ""} error={err("declaration", "student_name")} onChange={(e) => setValue("declaration", "student_name", e.target.value)} />
              <Field label="Date the student signed" type="date" InputLabelProps={{ shrink: true }} value={(data.declaration || {}).date || ""} error={err("declaration", "date")} onChange={(e) => setValue("declaration", "date", e.target.value)} />
            </div>

            <h2>Your confirmations</h2>
            <div className="field-grid">
              <Field label="Date you received the student's documents" type="date" InputLabelProps={{ shrink: true }} value={(data.confirmations || {}).docs_received_on || ""} error={err("confirmations", "docs_received_on")}
                helper={`Submit within ${cfg.docs_deadline_hours} hours of receiving them`} onChange={(e) => setValue("confirmations", "docs_received_on", e.target.value)} />
              <div className="is-wide">
                <CheckField label={cfg.pre_enrolment_text || "I sent the student the pre-enrolment information."} checked={(data.confirmations || {}).pre_enrolment_sent === true} error={err("confirmations", "pre_enrolment_sent")} onChange={(on) => setValue("confirmations", "pre_enrolment_sent", on)} />
                <CheckField label={cfg.agent_not_signed_text || "I did not sign the form for the student."} checked={(data.confirmations || {}).agent_not_signed === true} error={err("confirmations", "agent_not_signed")} onChange={(on) => setValue("confirmations", "agent_not_signed", on)} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <Btn size="medium" disabled={busy} onClick={() => go(step - 1)}>Back</Btn>}
            <Btn size="medium" disabled={busy} onClick={saveAndExit}>Save and close</Btn>
            {app.status === "draft" && <Btn kind="danger" size="medium" disabled={busy} onClick={discard}>Discard draft</Btn>}
          </div>
          {!last && <Btn kind="primary" size="medium" disabled={busy} onClick={() => go(step + 1)}>{busy ? "Saving..." : "Save and continue"}</Btn>}
          {last && <Btn kind="primary" size="medium" disabled={busy || !cfg.can_submit} onClick={submit}>{busy ? "Working..." : "Submit to AFC"}</Btn>}
        </div>
      </Panel>
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default StudentApplicationForm;
