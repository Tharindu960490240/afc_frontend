import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { FormDialog, formatDate, formatDateTime } from "../admin/shared";
import { FilePick } from "./DueDiligencePanel";
import { MAX_FILE_MB, fileToPayload } from "../../../services/comsService";
import {
  confirmPayment, downloadApplicationDocument, downloadOutput, issueLetter, issueVoe, prepareLetter, recordCoe, recordDecision, reviseLetter, saveLetter, requestInfo, reviewDocument, staffApplication, startReview, withdrawApplication,
} from "../../../services/studentApplicationService";
import { STATUS } from "../agent/StudentApplications";
import { STEPS, getIn } from "../agent/studentFormSteps";
import { dueLabel } from "./StudentApplicationQueue";
import { Badge, Btn, Field, Notice, Panel } from "../../ui";

const DOC_TONE = { received: "warning", accepted: "success", needs_update: "danger", missing: "neutral" };
const DOC_LABEL = { received: "To check", accepted: "Accepted", needs_update: "Needs updating", missing: "Not uploaded" };

// What the agent answered, shown as plain question and answer lines.
const show = (fd, value, app) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (fd.type === "campus") return app.campus_name;
  if (fd.type === "course") return `${app.course_code || ""} ${app.course_name || ""}${app.course_specialisation ? ` (${app.course_specialisation})` : ""}`.trim();
  if (fd.type === "date") return formatDate(value);
  if (fd.type === "multi") { const o = fd.options || []; return (Array.isArray(value) ? value : []).map((v) => (o.find((x) => x.value === v) || { label: v }).label).join("; ") || null; }
  if (fd.type === "quals") return (Array.isArray(value) ? value : []).map((r) => [r.name, r.institution, r.year, r.country].filter(Boolean).join(", ")).filter(Boolean).join(" | ") || null;
  if (fd.type === "select") return ((fd.options || []).find((o) => String(o.value) === String(value)) || { label: value }).label;
  return String(value);
};

const Answers = ({ app }) => (
  <>
    {STEPS.map((step) => (
      <div key={step.key} style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 6px" }}>{step.title}</h3>
        <dl className="dd-answers">
          {step.fields.filter((f) => !f.h).map((f) => {
            const value = show(f, getIn(app.data[f.s] || {}, f.f), app);
            return value ? <div key={`${f.s}.${f.f}`}><dt>{f.label}</dt><dd>{value}</dd></div> : null;
          })}
        </dl>
      </div>
    ))}
    <h3 style={{ margin: "0 0 6px" }}>Declaration and confirmations</h3>
    <dl className="dd-answers">
      <div><dt>Student's name on the declaration</dt><dd>{(app.data.declaration || {}).student_name || "-"}</dd></div>
      <div><dt>Date signed</dt><dd>{(app.data.declaration || {}).date ? formatDate(app.data.declaration.date) : "-"}</dd></div>
      <div><dt>Statements ticked</dt><dd>{((app.data.declaration || {}).items || []).filter(Boolean).length}</dd></div>
      <div><dt>Documents received by the agent on</dt><dd>{(app.data.confirmations || {}).docs_received_on ? formatDate(app.data.confirmations.docs_received_on) : "-"}</dd></div>
      <div><dt>Pre-enrolment pack sent</dt><dd>{(app.data.confirmations || {}).pre_enrolment_sent ? "Confirmed" : "No"}</dd></div>
      <div><dt>Agent did not sign for the student</dt><dd>{(app.data.confirmations || {}).agent_not_signed ? "Confirmed" : "No"}</dd></div>
    </dl>
  </>
);

// One submitted student application: the answers, the documents, and what staff can do about it.
const StudentApplicationDetail = ({ role }) => {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [dialog, setDialog] = useState(null); // info | decision | withdraw | doc
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => {
    const res = await staffApplication(id);
    if (res.success) setApp(res.data); else showMessage(res.message || "Could not open the application.", "error");
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const close = () => { setDialog(null); setForm({}); setErrors({}); };
  const run = async (call, ok) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) { setApp(res.data); close(); showMessage(ok); return; }
    if (res.errors) setErrors(res.errors);
    showMessage(res.message || "Could not do that.", "error");
  };

  const act = async (call, ok) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) { setApp(res.data); showMessage(ok); } else showMessage((res.errors && Object.values(res.errors)[0]) || res.message || "Could not do that.", "error");
  };

  if (!app) return <div className="admin-page"><LoadingSpinner /></div>;
  const st = STATUS[app.status] || { label: app.status, tone: "neutral" };
  const due = dueLabel(app);
  const name = [app.student_given_names, app.student_surname].filter(Boolean).join(" ");
  const attention = [
    app.late_submission && "The agent submitted this more than 24 hours after receiving the documents (Education Agent Agreement).",
    app.needs_transfer_review && "The student may be inside 12 months of a principal course with another provider. Check release before offering (National Code Standard 7).",
    app.wants_credit && "The student wants to apply for credit transfer or RPL. Ask the agent for the Credit Transfer / RPL form.",
  ].filter(Boolean);

  const submitDialog = () => {
    if (dialog === "info") return run(() => requestInfo(id, (form.note || "").trim()), "The agent has been asked and emailed.");
    if (dialog === "decision") return run(() => recordDecision(id, { decision: form.decision, reason: (form.reason || "").trim() || undefined }), "Decision recorded and the agent emailed.");
    if (dialog === "withdraw") return run(() => withdrawApplication(id, (form.reason || "").trim()), "Application withdrawn.");
    if (dialog === "doc") return run(() => reviewDocument(id, form.doc.id, { status: "needs_update", note: (form.note || "").trim() }), "Marked as needing an update.");
    if (dialog === "letter") return run(() => saveLetter(id, { body: form.body, tuition_fee: form.tuition_fee, material_fee: form.material_fee, enrolment_fee: form.enrolment_fee }), "Draft saved.");
    if (dialog === "payment") return run(() => confirmPayment(id, (form.note || "").trim()), "Payment confirmed. The CoE Administrator has been told.");
    if (dialog === "coe") return coe();
    return null;
  };
  const coe = async () => {
    if (form.file && form.file.size > MAX_FILE_MB * 1024 * 1024) return setErrors({ file: `The file is too large. The limit is ${MAX_FILE_MB} MB.` });
    const payload = { coe_number: (form.coe_number || "").trim(), issued_on: form.issued_on };
    if (form.file) payload.file = await fileToPayload(form.file);
    return run(() => recordCoe(id, payload), "CoE recorded and the agent told.");
  };

  return (
    <div className="admin-page">
      <Link to="/coms/applications" className="admin-back"><ArrowBack fontSize="small" /> Student applications</Link>
      <div className="admin-head">
        <h1>{app.ref_no} <Badge tone={st.tone} label={st.label} /> {due && <Badge tone={due.tone} label={due.text} />}</h1>
        <p>
          {name} · {app.course_code} {app.course_name}{app.course_specialisation ? ` (${app.course_specialisation})` : ""} · {app.campus_name} · starts {app.commencement_date ? formatDate(app.commencement_date) : "-"}
          <br />Submitted by {app.agent ? <Link to={`/coms/agents/${app.agent.id}`}>{app.agent.legal_name}</Link> : app.agent_name}{app.submitted_at ? ` on ${formatDateTime(app.submitted_at)}` : ""}.
          {app.assessment_due ? ` Assessment due ${formatDate(app.assessment_due)}.` : ""}
        </p>
      </div>

      {attention.map((t) => <Notice key={t} severity="warning" sx={{ mb: 1 }}>{t}</Notice>)}
      {app.decision && <Notice severity={app.decision === "offer" ? "success" : "info"} sx={{ mb: 1 }}>{app.decision === "offer" ? "Decision: an offer will be made." : `Decision: not offered. ${app.decision_reason || ""}`}</Notice>}

      {app.can_assess && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {app.status === "received" && <Btn kind="primary" size="medium" disabled={busy} onClick={() => run(() => startReview(id), "Review started.")}>Start review</Btn>}
          <Btn size="medium" onClick={() => { setForm({}); setDialog("info"); }}>Ask the agent for more</Btn>
          <Btn kind="primary" size="medium" onClick={() => { setForm({ decision: "offer" }); setDialog("decision"); }}>Record the decision</Btn>
          <Btn kind="danger" size="medium" onClick={() => { setForm({}); setDialog("withdraw"); }}>Withdraw</Btn>
        </div>
      )}
      {!app.can_assess && !["decision_made", "coe_issued", "withdrawn"].includes(app.status) && app.status !== "info_requested" && (
        <Notice severity="info" sx={{ mb: 2 }}>You can read this application. Only Admissions, the Director and the Administrator can assess it.</Notice>
      )}
      {app.status === "info_requested" && <Notice severity="info" sx={{ mb: 2 }}>Waiting for the agent to reply. It comes back to review when they submit again.</Notice>}


      {(app.letter || app.can_prepare_letter || app.payment || app.coe) && (
        <Panel style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Letter of Offer, payment and CoE</h2>
          {!app.letters_confirmed && <Notice severity="warning" sx={{ mb: 1 }}>The letter wording has not been confirmed by an administrator yet, so nothing can be issued. It is on the Application settings screen.</Notice>}
          <ul className="dd-list">
            <li>
              <span style={{ flex: 1 }}>
                <strong>Letter of Offer</strong>
                <small>{app.letter ? `Version ${app.letter.version} · ${app.letter.status === "issued" ? `issued ${formatDateTime(app.letter.issued_at)} by ${app.letter.issued_by_name}` : `draft prepared by ${app.letter.prepared_by_name}`}` : "Not prepared yet"}</small>
              </span>
              <Badge tone={app.letter ? (app.letter.status === "issued" ? "success" : "warning") : "neutral"} label={app.letter ? (app.letter.status === "issued" ? "Issued" : "Draft") : "Not started"} />
              {app.can_prepare_letter && <Btn kind="primary" disabled={busy} onClick={() => act(() => prepareLetter(id), "Draft prepared.")}>Prepare the letter</Btn>}
              {app.can_edit_letter && <Btn onClick={() => { setForm({ body: app.letter.body, tuition_fee: app.letter.tuition_fee ?? "", material_fee: app.letter.material_fee ?? "", enrolment_fee: app.letter.enrolment_fee ?? "" }); setDialog("letter"); }}>Edit the draft</Btn>}
              {app.can_issue_letter && <Btn kind="primary" disabled={busy} onClick={() => act(() => issueLetter(id), "Letter issued and the agent told.")}>Approve and issue</Btn>}
              {app.letter && app.letter.status === "issued" && <Btn onClick={() => downloadOutput(id, "letter", "Letter of Offer.pdf")}>Open PDF</Btn>}
              {app.can_revise_letter && <Btn kind="danger" disabled={busy} onClick={() => act(() => reviseLetter(id), "The letter is back to a draft.")}>Revise</Btn>}
            </li>
            <li>
              <span style={{ flex: 1 }}><strong>Payment</strong><small>{app.payment ? `Confirmed ${formatDateTime(app.payment.at)}${app.payment.note ? `: ${app.payment.note}` : ""}` : "Accounts confirm when the student's payment is received"}</small></span>
              <Badge tone={app.payment ? "success" : "neutral"} label={app.payment ? "Confirmed" : "Waiting"} />
              {app.can_confirm_payment && <Btn kind="primary" onClick={() => { setForm({}); setDialog("payment"); }}>Confirm payment</Btn>}
            </li>
            <li>
              <span style={{ flex: 1 }}><strong>Confirmation of Enrolment</strong><small>{app.coe ? `${app.coe.number}, issued ${formatDate(app.coe.issued_on)}` : "Issued in PRISMS by the CoE Administrator, then recorded here"}</small></span>
              <Badge tone={app.coe ? "success" : "neutral"} label={app.coe ? "Recorded" : "Waiting"} />
              {app.can_record_coe && <Btn kind="primary" onClick={() => { setForm({ issued_on: new Date().toLocaleDateString("en-CA") }); setDialog("coe"); }}>Record the CoE</Btn>}
              {app.coe && app.coe.has_file && <Btn onClick={() => downloadOutput(id, "coe", "CoE.pdf")}>Open file</Btn>}
            </li>
            <li>
              <span style={{ flex: 1 }}><strong>Verification of Enrolment</strong><small>{app.voe ? `Issued ${formatDateTime(app.voe.at)}` : "Made from the AFC template after the CoE is recorded"}</small></span>
              <Badge tone={app.voe ? "success" : "neutral"} label={app.voe ? "Issued" : "Waiting"} />
              {app.can_issue_voe && <Btn kind="primary" disabled={busy} onClick={() => act(() => issueVoe(id), "Issued and the agent told.")}>Issue</Btn>}
              {app.voe && <Btn onClick={() => downloadOutput(id, "voe", "Verification of Enrolment.pdf")}>Open PDF</Btn>}
            </li>
          </ul>
        </Panel>
      )}

      <Panel>
        <h2 style={{ marginTop: 0 }}>Documents</h2>
        <ul className="dd-list">
          {app.required_documents.map((r) => {
            const d = app.documents.filter((x) => x.kind === r.kind).pop();
            return (
              <li key={r.kind}>
                <span style={{ flex: 1 }}>
                  <strong>{r.label}</strong>
                  {d && <small>{d.original_name} · {formatDate(d.created_at)}</small>}
                  {d && d.review_note && <small>{d.review_note}</small>}
                </span>
                <Badge tone={DOC_TONE[r.status]} label={DOC_LABEL[r.status]} />
                {d && <Btn onClick={() => downloadApplicationDocument(id, d.id, d.original_name)}>Open</Btn>}
                {d && app.can_review_docs && d.status !== "accepted" && <Btn disabled={busy} onClick={() => run(() => reviewDocument(id, d.id, { status: "accepted" }), "Accepted.")}>Accept</Btn>}
                {d && app.can_review_docs && d.status !== "needs_update" && <Btn kind="danger" onClick={() => { setForm({ doc: d }); setDialog("doc"); }}>Needs update</Btn>}
              </li>
            );
          })}
          {app.documents.filter((d) => !app.required_documents.some((r) => r.kind === d.kind)).map((d) => (
            <li key={d.id}>
              <span style={{ flex: 1 }}><strong>{d.label || d.kind}</strong><small>{d.original_name} · {formatDate(d.created_at)}</small></span>
              <Badge tone={DOC_TONE[d.status]} label={DOC_LABEL[d.status]} />
              <Btn onClick={() => downloadApplicationDocument(id, d.id, d.original_name)}>Open</Btn>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>What the agent entered</h2>
        <Answers app={app} />
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>History</h2>
        <ul className="dd-list">
          {app.history.map((h) => (
            <li key={h.id}>
              <span style={{ flex: 1 }}>
                <strong>{(STATUS[h.to_status] || { label: h.to_status }).label}</strong>
                <small>{h.actor_name || "System"}{h.note ? `: ${h.note}` : ""}</small>
              </span>
              <small>{formatDateTime(h.created_at)}</small>
            </li>
          ))}
        </ul>
      </Panel>

      <FormDialog open={dialog === "info"} title="Ask the agent for more" intro="The agent is emailed and can change the application and submit it again. The 5-day clock keeps running from the original date." submitLabel={busy ? "Sending..." : "Send to the agent"} onSubmit={submitDialog} onCancel={close}>
        <Field label="What do you need?" multiline rows={4} value={form.note || ""} error={errors.note} inputProps={{ maxLength: 3000 }} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </FormDialog>
      <FormDialog open={dialog === "decision"} title="Record the decision" intro="The agent is emailed. If you offer a place, the Letter of Offer is prepared next." submitLabel={busy ? "Saving..." : "Record decision"} onSubmit={submitDialog} onCancel={close}>
        <Field label="Decision" value={form.decision || "offer"} options={[{ value: "offer", label: "Offer a place" }, { value: "not_offered", label: "Do not offer a place" }]} error={errors.decision} onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value }))} />
        <Field label={form.decision === "not_offered" ? "Reason (the agent sees this)" : "Note (optional)"} multiline rows={3} value={form.reason || ""} error={errors.reason} inputProps={{ maxLength: 3000 }} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
      </FormDialog>
      <FormDialog open={dialog === "withdraw"} title="Withdraw the application" intro="Use this when the student or agent withdraws it. It cannot be undone." danger submitLabel="Withdraw" onSubmit={submitDialog} onCancel={close}>
        <Field label="Reason" multiline rows={3} value={form.reason || ""} error={errors.reason} inputProps={{ maxLength: 1000 }} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
      </FormDialog>
      <FormDialog open={dialog === "doc"} title="This document needs updating" intro="Say what is wrong. The agent sees it when you ask for more information." submitLabel="Save" onSubmit={submitDialog} onCancel={close}>
        <Field label="What needs to change?" multiline rows={3} value={form.note || ""} error={errors.note} inputProps={{ maxLength: 1000 }} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </FormDialog>

      <Dialog open={dialog === "letter"} onClose={close} maxWidth="md" fullWidth>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submitDialog(); }}>
          <DialogTitle>Edit the Letter of Offer</DialogTitle>
          <DialogContent>
            <div className="field-grid" style={{ paddingTop: 6 }}>
              <Field label="Tuition fee (AUD)" type="number" value={form.tuition_fee ?? ""} error={errors.tuition_fee} onChange={(e) => setForm((f) => ({ ...f, tuition_fee: e.target.value }))} />
              <Field label="Material fee (AUD)" type="number" value={form.material_fee ?? ""} error={errors.material_fee} onChange={(e) => setForm((f) => ({ ...f, material_fee: e.target.value }))} />
              <Field label="Enrolment fee (AUD)" type="number" value={form.enrolment_fee ?? ""} error={errors.enrolment_fee} onChange={(e) => setForm((f) => ({ ...f, enrolment_fee: e.target.value }))} />
              <Field label="Letter text" wide multiline rows={18} value={form.body || ""} error={errors.body} inputProps={{ maxLength: 10000 }} helper="Change the fee boxes and the text together. The fee boxes are kept on record." onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
          </DialogContent>
          <DialogActions><Btn onClick={close}>Cancel</Btn><Btn type="submit" kind="primary">Save draft</Btn></DialogActions>
        </form>
      </Dialog>
      <FormDialog open={dialog === "payment"} title="Confirm payment" intro="Confirm that the student's payment has been received. The CoE Administrator is told to issue the CoE." submitLabel="Confirm payment" onSubmit={submitDialog} onCancel={close}>
        <Field label="Note (for example the receipt number)" value={form.note || ""} error={errors.note} inputProps={{ maxLength: 500 }} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </FormDialog>
      <FormDialog open={dialog === "coe"} title="Record the CoE" intro="Issue the CoE in PRISMS first, then record its number here. The agent is emailed." submitLabel="Record CoE" onSubmit={submitDialog} onCancel={close}>
        <Field label="CoE number" value={form.coe_number || ""} error={errors.coe_number} inputProps={{ maxLength: 20 }} onChange={(e) => setForm((f) => ({ ...f, coe_number: e.target.value }))} />
        <Field label="Date issued" type="date" InputLabelProps={{ shrink: true }} value={form.issued_on || ""} error={errors.issued_on} onChange={(e) => setForm((f) => ({ ...f, issued_on: e.target.value }))} />
        <FilePick id="coe-file" label="PRISMS confirmation (optional)" file={form.file} error={errors.file} onChange={(f) => setForm((x) => ({ ...x, file: f }))} />
      </FormDialog>
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default StudentApplicationDetail;
