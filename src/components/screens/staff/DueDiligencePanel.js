import React, { useCallback, useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { CheckCircle, ErrorOutline, RadioButtonUnchecked } from "@mui/icons-material";

import { FormDialog, formatDate, formatDateTime } from "../admin/shared";
import { SlaChip } from "./comsShared";
import { Badge, Btn, CheckField, Field, Notice, Panel } from "../../ui";
import {
  MAX_FILE_MB,
  addReferee,
  changeAgentStatus,
  decideAgent,
  downloadComsFile,
  fileToPayload,
  getDueDiligence,
  getRejectionDraft,
  recordDeclarations,
  recordDueDiligenceCheck,
  recordPhoneCheck,
  remindReferee,
  removeReferee,
  requestReference,
  setReferenceOutcome,
  updateReferee,
} from "../../../services/comsService";

const today = () => new Date().toLocaleDateString("en-CA");
const YESNO = [
  { value: "", label: "Choose..." },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const OUTCOME = {
  positive: { tone: "success", label: "Positive" },
  negative: { tone: "danger", label: "Negative" },
  pending: { tone: "warning", label: "Waiting for answer" },
  no_response: { tone: "quiet", label: "No response" },
};
const CHECK_STATUS = {
  verified: { tone: "success", label: "Verified" },
  failed: { tone: "danger", label: "Failed" },
  not_applicable: { tone: "quiet", label: "Not applicable" },
};
const FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.eml,.msg";

// a file picker that says what is allowed
const FilePick = ({ id, label, file, error, onChange }) => (
  <div className="dd-file">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="file" accept={FILE_TYPES} onChange={(e) => onChange(e.target.files?.[0] || null)} />
    <small className={error ? "is-error" : ""}>
      {error || (file ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)` : `PDF, JPG, PNG, DOCX, XLSX, EML or MSG, up to ${MAX_FILE_MB} MB`)}
    </small>
  </div>
);

const toBool = (v) => (v === "yes" ? true : v === "no" ? false : undefined);
const fromBool = (v) => (v === true ? "yes" : v === false ? "no" : "");

// Answers to the reference questions, shown in a dialog
const AnswerList = ({ questions, answers }) => (
  <dl className="dd-answers">
    {questions.map((q) => {
      const v = answers?.[q.key];
      if (v === undefined || v === "") return null;
      return (
        <div key={q.key}>
          <dt>{q.label}</dt>
          <dd>
            {typeof v === "boolean" ? (v ? "Yes" : "No") : v}
            {answers[`${q.key}_detail`] ? ` - ${answers[`${q.key}_detail`]}` : ""}
          </dd>
        </div>
      );
    })}
  </dl>
);

const DueDiligencePanel = ({ agent, onChanged, showMessage }) => {
  const [dd, setDd] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    const res = await getDueDiligence(agent.id);
    if (res.success) setDd(res.data);
    else showMessage(res.message || "Could not load due diligence.", "error");
  }, [agent.id, showMessage]);

  useEffect(() => {
    load();
  }, [load, agent.status]);

  const open = (name, initial = {}, t = null) => {
    setForm(initial);
    setErrors({});
    setTarget(t);
    setDialog(name);
  };
  const close = () => setDialog(null);
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  // runs a call; closes the dialog, shows a message, reloads on success
  const run = async (call, okMessage, { reloadAgent = false } = {}) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) {
      close();
      if (okMessage) showMessage(okMessage);
      await load();
      if (reloadAgent) onChanged();
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Something went wrong.", "error");
    }
    return res;
  };

  if (!dd) return <Panel><div className="admin-empty">Loading due diligence...</div></Panel>;

  const canRecord = dd.permissions.record && ["applied", "due_diligence"].includes(agent.status);
  const questions = dd.questions || [];
  const decision = dd.decision;

  // ---------- submit handlers ----------
  const answersFrom = () => {
    const out = {};
    const e = {};
    questions.forEach((q) => {
      if (q.type === "yesno") {
        const v = toBool(form[`a_${q.key}`]);
        if (v === undefined) e[`a_${q.key}`] = "Choose Yes or No";
        else out[q.key] = v;
        if (q.detail) {
          const d = (form[`a_${q.key}_detail`] || "").trim();
          if (v !== undefined && v !== q.favourable && !d) e[`a_${q.key}_detail`] = "Please give details";
          if (d) out[`${q.key}_detail`] = d;
        }
      } else {
        const t = (form[`a_${q.key}`] || "").trim();
        if (!t && q.required) e[`a_${q.key}`] = "Please answer this question";
        if (t) out[q.key] = t;
      }
    });
    return { out, e };
  };

  const readFile = async (file, key = "file") => {
    if (!file) return { ok: true, payload: undefined };
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((x) => ({ ...x, [key]: `The file is too large. The limit is ${MAX_FILE_MB} MB.` }));
      return { ok: false };
    }
    try {
      return { ok: true, payload: await fileToPayload(file) };
    } catch (err) {
      setErrors((x) => ({ ...x, [key]: "Could not read the file." }));
      return { ok: false };
    }
  };

  const submitReferee = () => {
    const e = {};
    if ((form.name || "").trim().length < 2) e.name = "Enter the referee's name";
    if ((form.organisation || "").trim().length < 2) e.organisation = "Enter the organisation";
    if (!/^\S+@\S+\.\S+$/.test((form.email || "").trim())) e.email = "Enter a valid email address";
    setErrors(e);
    if (Object.keys(e).length) return;
    const body = { name: form.name.trim(), organisation: form.organisation.trim(), email: form.email.trim(), phone: (form.phone || "").trim() || null };
    if (target) run(() => updateReferee(agent.id, target.id, body), "Referee saved.");
    else run(() => addReferee(agent.id, body), "Referee added.");
  };

  const submitRemoveReferee = () => {
    if ((form.reason || "").trim().length < 3) return setErrors({ reason: "Please give a reason" });
    run(() => removeReferee(agent.id, target.id, form.reason.trim()), "Referee removed.");
  };

  const submitPhone = async () => {
    const { out, e } = answersFrom();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.call_date || "")) e.call_date = "Choose the date of the call";
    if ((form.spoke_to || "").trim().length < 2) e.spoke_to = "Who did you speak to?";
    if ((form.summary || "").trim().length < 3) e.summary = "Add a short summary of the call";
    setErrors(e);
    if (Object.keys(e).length) return;
    const f = await readFile(form.file);
    if (!f.ok) return;
    run(() => recordPhoneCheck(agent.id, target.id, {
      call_date: form.call_date, spoke_to: form.spoke_to.trim(), answers: out, summary: form.summary.trim(),
      ...(form.outcome ? { outcome: form.outcome } : {}), ...(f.payload ? { file: f.payload } : {}),
    }), "Phone check recorded.");
  };

  const submitOutcome = () => {
    const e = {};
    if (!form.outcome) e.outcome = "Choose an outcome";
    if ((form.summary || "").trim().length < 3) e.summary = "Please add a short summary";
    setErrors(e);
    if (Object.keys(e).length) return;
    run(() => setReferenceOutcome(agent.id, target.id, { outcome: form.outcome, summary: form.summary.trim() }), "Outcome saved.");
  };

  const submitCheck = () => {
    if (!form.status) return setErrors({ status: "Choose a result" });
    if (form.status === "failed" && !(form.note || "").trim()) return setErrors({ note: "Please say what failed" });
    run(() => recordDueDiligenceCheck(agent.id, { key: form.key, status: form.status, ...((form.note || "").trim() ? { note: form.note.trim() } : {}) }), "Check recorded.");
  };

  const submitDeclarations = async () => {
    const e = {};
    const coi = toBool(form.coi);
    if (coi === undefined) e.coi = "Choose Yes or No";
    if (coi && !(form.coi_details || "").trim()) e.coi_details = "Please describe the conflict";
    setErrors(e);
    if (Object.keys(e).length) return;
    const f = await readFile(form.file);
    if (!f.ok) return;
    run(() => recordDeclarations(agent.id, {
      coi_declared: coi, ...(coi ? { coi_details: form.coi_details.trim() } : {}),
      code_of_ethics_ack: !!form.ethics, ...((form.review_note || "").trim() ? { coi_review_note: form.review_note.trim() } : {}),
      ...(f.payload ? { file: f.payload } : {}),
    }), "Declarations recorded.");
  };

  const makeDraft = async () => {
    if ((form.reason || "").trim().length < 3) return setErrors({ reason: "Please give the reason first" });
    setBusy(true);
    const res = await getRejectionDraft(agent.id, form.reason.trim());
    setBusy(false);
    if (res.success) setForm((f) => ({ ...f, subject: res.data.subject, body: res.data.body, to: res.data.to, drafted: true }));
    else showMessage(res.message || "Could not make the draft.", "error");
  };

  const submitDecision = () => {
    const reason = (form.reason || "").trim();
    if (reason.length < 3) return setErrors({ reason: "Please give a reason" });
    const approve = form.kind === "approve";
    const body = { decision: approve ? "approve" : "reject", reason };
    if (!approve) {
      body.send_email = form.send_email !== false;
      if (form.drafted && body.send_email) { body.email_subject = form.subject; body.email_body = form.body; }
    }
    run(() => decideAgent(agent.id, body), approve ? "The agent is approved." : "The application is rejected.", { reloadAgent: true });
  };

  const startDiligence = async () => {
    setBusy(true);
    const res = await changeAgentStatus(agent.id, "due_diligence");
    setBusy(false);
    if (res.success) { showMessage("Due diligence started."); await load(); onChanged(); }
    else showMessage(res.message || "Could not start due diligence.", "error");
  };

  const sendRequest = (r) => run(() => requestReference(agent.id, r.id), `Reference form sent to ${r.name}.`);
  const remind = (c, r) => run(() => remindReferee(agent.id, c.id), `Reminder sent to ${r.name}.`);
  const downloadFile = async (f) => {
    const res = await downloadComsFile(f.id, f.name);
    if (!res.success) showMessage(res.message || "Could not download the file.", "error");
  };

  const chk = (key, label) => {
    const c = dd[key] || {};
    const s = CHECK_STATUS[c.status];
    return (
      <div className="dd-check" key={key}>
        <div>
          <strong>{label}</strong>
          <small>{c.at ? `${formatDate(c.at)}${c.note ? ` · ${c.note}` : ""}` : "Not recorded yet"}</small>
        </div>
        {s ? <Badge tone={s.tone} label={s.label} /> : <Badge tone="warning" label="To do" />}
        {canRecord && <Btn onClick={() => open("check", { key, status: c.status || "", note: c.note || "" })}>Record</Btn>}
      </div>
    );
  };

  const needsStart = agent.status === "applied";
  const canApprove = dd.can_decide && dd.blockers.length === 0;

  return (
    <>
      {/* ---------- decision ---------- */}
      <Panel>
        <div className="dd-head">
          <h2>Decision</h2>
          {!decision && dd.decision_state && <SlaChip state={dd.decision_state.state} daysLeft={dd.decision_state.working_days_left} />}
        </div>
        {decision ? (
          <Notice severity={decision.decision === "approved" ? "success" : "error"}>
            <strong>{decision.decision === "approved" ? "Approved" : "Rejected"} by {decision.by || "the college"} on {formatDate(decision.at)}</strong>
            {decision.reason}
          </Notice>
        ) : (
          <>
            {needsStart && (
              <Notice severity="info" sx={{ mb: 2 }}>
                Due diligence has not started. Move the application to due diligence to begin the referee and ABN checks.
                {dd.permissions.record && (
                  <div style={{ marginTop: 8 }}>
                    <Btn kind="primary" onClick={startDiligence} disabled={busy}>Start due diligence</Btn>
                  </div>
                )}
              </Notice>
            )}
            {dd.blockers.length > 0 && agent.status === "due_diligence" && (
              <Notice severity="warning" sx={{ mb: 2 }}>
                <strong>Before this agent can be approved</strong>
                <ul className="missing-list">{dd.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
              </Notice>
            )}
            {dd.warnings.length > 0 && (
              <Notice severity="info" sx={{ mb: 2 }}>
                <strong>Please note</strong>
                <ul className="missing-list">{dd.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </Notice>
            )}
            {dd.decide_blocked_reason && <Notice severity="warning" sx={{ mb: 2 }}>{dd.decide_blocked_reason}</Notice>}
            <div className="action-row">
              {dd.permissions.decide ? (
                <>
                  <Btn kind="primary" disabled={!canApprove || busy} onClick={() => open("decision", { kind: "approve", reason: "" })}>
                    Approve agent
                  </Btn>
                  <Btn kind="danger" disabled={!dd.can_reject || busy} onClick={() => open("decision", { kind: "reject", reason: "", send_email: true })}>
                    Reject application
                  </Btn>
                </>
              ) : (
                <span className="admin-hint" style={{ margin: 0 }}>Only the Director, the CEO or an administrator can approve or reject. The person who prepared the checks cannot decide the same file.</span>
              )}
            </div>
          </>
        )}
        {dd.prepared_by && dd.prepared_by.length > 0 && <p className="admin-hint" style={{ marginTop: 12 }}>Checks prepared by: {dd.prepared_by.join(", ")}</p>}
      </Panel>

      {/* ---------- checklist ---------- */}
      <Panel>
        <h2>Due diligence checklist</h2>
        <ul className="dd-list">
          {dd.items.map((i) => (
            <li key={i.key} className={i.done ? "is-done" : i.failed ? "is-failed" : ""}>
              {i.done ? <CheckCircle fontSize="small" /> : i.failed ? <ErrorOutline fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
              <div>
                <strong>{i.label}</strong>
                {i.detail && <small>{i.detail}</small>}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ---------- referees ---------- */}
      <Panel>
        <div className="admin-toolbar">
          <h2 style={{ margin: 0 }}>Referees</h2>
          {canRecord && <Btn kind="primary" size="medium" onClick={() => open("referee", { name: "", organisation: "", email: "", phone: "" })}>Add referee</Btn>}
        </div>
        <p className="admin-hint" style={{ marginTop: 0 }}>
          At least one positive check is needed to decide; two are recommended. Send the online reference form by email, or record a phone call with the same questions.
        </p>
        {dd.referees.length === 0 && <div className="admin-empty">No referees yet. Add the two referees named by the applicant.</div>}
        {dd.referees.map((r) => {
          const pending = r.checks.find((c) => c.outcome === "pending" && c.method === "email_form" && !c.response_at);
          return (
            <div className="dd-referee" key={r.id}>
              <div className="dd-referee-head">
                <div>
                  <strong>{r.name}</strong>
                  <small>{r.organisation} · {r.email}{r.phone ? ` · ${r.phone}` : ""}</small>
                </div>
                {canRecord && (
                  <div className="cell-actions">
                    {pending ? (
                      <Btn onClick={() => remind(pending, r)} disabled={busy}>Send reminder</Btn>
                    ) : (
                      <Btn onClick={() => sendRequest(r)} disabled={busy}>Email reference form</Btn>
                    )}
                    <Btn onClick={() => open("phone", { call_date: today(), spoke_to: r.name, summary: "", outcome: "", file: null }, r)}>Record phone check</Btn>
                    <Btn onClick={() => open("referee", { name: r.name, organisation: r.organisation, email: r.email, phone: r.phone || "" }, r)}>Edit</Btn>
                    <Btn kind="danger" onClick={() => open("removeReferee", { reason: "" }, r)}>Remove</Btn>
                  </div>
                )}
              </div>
              {r.checks.length === 0 ? (
                <small className="dd-none">No check yet.</small>
              ) : (
                r.checks.map((c) => {
                  const o = OUTCOME[c.outcome] || OUTCOME.pending;
                  return (
                    <div className="dd-ref-check" key={c.id}>
                      <span>
                        {c.method === "email_form" ? "Email form" : "Phone call"}{" "}
                        <small>
                          {c.method === "email_form"
                            ? `sent ${formatDate(c.sent_at)}${c.reminder_count ? ` · ${c.reminder_count} reminder${c.reminder_count === 1 ? "" : "s"}` : ""}${c.response_at ? ` · answered ${formatDateTime(c.response_at)}` : ""}`
                            : `${formatDate(c.call_date)} · spoke to ${c.spoke_to || "-"}`}
                        </small>
                      </span>
                      <Badge tone={o.tone} label={o.label} />
                      <span className="cell-actions">
                        {c.answers && <Btn onClick={() => open("answers", {}, c)}>View answers</Btn>}
                        {c.file && <Btn onClick={() => downloadFile(c.file)}>File</Btn>}
                        {canRecord && (c.response_at || (c.outcome === "pending")) && (
                          <Btn onClick={() => open("outcome", { outcome: c.response_at ? c.outcome : "no_response", summary: c.summary || "" }, c)}>
                            {c.response_at ? "Confirm outcome" : "Mark no response"}
                          </Btn>
                        )}
                      </span>
                      {c.summary && <small className="dd-summary">{c.summary}</small>}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </Panel>

      {/* ---------- other checks ---------- */}
      <Panel>
        <h2>Business and registration checks</h2>
        {chk("abn", "ABN, ACN or business registration")}
        {chk("marn", "MARN (migration agent registration)")}
        {chk("prisms", "Agent details ready for PRISMS")}
      </Panel>

      {/* ---------- declarations ---------- */}
      <Panel>
        <div className="admin-toolbar">
          <h2 style={{ margin: 0 }}>Declarations</h2>
          {canRecord && (
            <Btn
              onClick={() => open("declarations", {
                coi: fromBool(dd.declarations.coi_declared), coi_details: dd.declarations.coi_details || "",
                ethics: !!dd.declarations.code_of_ethics_ack_at, review_note: dd.declarations.review_note || "", file: null,
              })}
            >
              Record or review
            </Btn>
          )}
        </div>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Conflict of interest</span>
            <strong>{dd.declarations.coi_declared === null || dd.declarations.coi_declared === undefined ? "Not declared yet" : dd.declarations.coi_declared ? `Yes: ${dd.declarations.coi_details || ""}` : "None declared"}</strong>
          </div>
          <div className="summary-item">
            <span>Code of ethics</span>
            <strong>{dd.declarations.code_of_ethics_ack_at ? `Accepted ${formatDate(dd.declarations.code_of_ethics_ack_at)}` : "Not accepted"}</strong>
          </div>
          <div className="summary-item">
            <span>College review</span>
            <strong>{dd.declarations.reviewed_at ? `${formatDate(dd.declarations.reviewed_at)}${dd.declarations.review_note ? ` · ${dd.declarations.review_note}` : ""}` : "Not reviewed yet"}</strong>
          </div>
          <div className="summary-item">
            <span>Declaration file</span>
            <strong>{dd.declarations.file ? <Btn onClick={() => downloadFile(dd.declarations.file)}>{dd.declarations.file.name}</Btn> : "None"}</strong>
          </div>
        </div>
      </Panel>

      {/* ---------- dialogs ---------- */}
      <FormDialog open={dialog === "referee"} title={target ? "Edit referee" : "Add a referee"} submitLabel={target ? "Save" : "Add referee"} onSubmit={submitReferee} onCancel={close}>
        <div className="field-grid">
          <Field id="rf-name" label="Name" error={errors.name} value={form.name || ""} onChange={setField("name")} inputProps={{ maxLength: 120 }} />
          <Field id="rf-org" label="Organisation" error={errors.organisation} value={form.organisation || ""} onChange={setField("organisation")} inputProps={{ maxLength: 160 }} />
          <Field id="rf-email" label="Email" type="email" error={errors.email} value={form.email || ""} onChange={setField("email")} />
          <Field id="rf-phone" label="Phone (optional)" error={errors.phone} value={form.phone || ""} onChange={setField("phone")} />
        </div>
      </FormDialog>

      <FormDialog
        open={dialog === "removeReferee"}
        title={`Remove ${target?.name || "referee"}?`}
        intro="The referee is hidden from the record but kept for 7 years."
        submitLabel="Remove"
        danger
        onSubmit={submitRemoveReferee}
        onCancel={close}
      >
        <Field id="rr-reason" label="Reason (required)" error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>

      <FormDialog
        open={dialog === "phone"}
        title={`Phone check: ${target?.name || ""}`}
        intro="Ask the referee the same questions as the online form and record the answers."
        submitLabel="Record check"
        onSubmit={submitPhone}
        onCancel={close}
      >
        <div className="field-grid">
          <Field id="ph-date" label="Date of the call" type="date" InputLabelProps={{ shrink: true }} error={errors.call_date} value={form.call_date || ""} onChange={setField("call_date")} inputProps={{ max: today() }} />
          <Field id="ph-who" label="Who you spoke to" error={errors.spoke_to} value={form.spoke_to || ""} onChange={setField("spoke_to")} />
          {questions.map((q) =>
            q.type === "yesno" ? (
              <React.Fragment key={q.key}>
                <Field id={`ph-${q.key}`} wide label={q.label} error={errors[`a_${q.key}`]} value={form[`a_${q.key}`] || ""} onChange={setField(`a_${q.key}`)} options={YESNO} />
                {q.detail && form[`a_${q.key}`] && toBool(form[`a_${q.key}`]) !== q.favourable && (
                  <Field id={`ph-${q.key}-d`} wide label="Details" multiline error={errors[`a_${q.key}_detail`]} value={form[`a_${q.key}_detail`] || ""} onChange={setField(`a_${q.key}_detail`)} />
                )}
              </React.Fragment>
            ) : (
              <Field key={q.key} id={`ph-${q.key}`} wide multiline label={q.required ? q.label : `${q.label} (optional)`} error={errors[`a_${q.key}`]} value={form[`a_${q.key}`] || ""} onChange={setField(`a_${q.key}`)} />
            ),
          )}
          <Field id="ph-summary" wide multiline label="Summary of the call" error={errors.summary} value={form.summary || ""} onChange={setField("summary")} inputProps={{ maxLength: 3000 }} />
          <Field
            id="ph-outcome"
            wide
            label="Outcome"
            helper="Leave on automatic to decide from the answers."
            value={form.outcome || ""}
            onChange={setField("outcome")}
            options={[{ value: "", label: "Automatic (from the answers)" }, { value: "positive", label: "Positive" }, { value: "negative", label: "Negative" }]}
          />
          <div className="is-wide">
            <FilePick id="ph-file" label="Call note or email (optional)" file={form.file} error={errors.file} onChange={(f) => setForm((x) => ({ ...x, file: f }))} />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={dialog === "outcome"}
        title={target?.response_at ? "Confirm the outcome" : "Mark as no response"}
        intro={target?.response_at ? "The outcome was worked out from the answers. Confirm it or change it, with a short summary." : "The referee has not answered. Marking this stops their link from working."}
        submitLabel="Save"
        onSubmit={submitOutcome}
        onCancel={close}
      >
        <Field
          id="oc-outcome"
          label="Outcome"
          error={errors.outcome}
          value={form.outcome || ""}
          onChange={setField("outcome")}
          options={target?.response_at ? [{ value: "positive", label: "Positive" }, { value: "negative", label: "Negative" }] : [{ value: "no_response", label: "No response" }]}
        />
        <Field id="oc-summary" label="Summary" multiline error={errors.summary} value={form.summary || ""} onChange={setField("summary")} inputProps={{ maxLength: 3000 }} />
      </FormDialog>

      <Dialog open={dialog === "answers"} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Reference answers</DialogTitle>
        <DialogContent>{target && <AnswerList questions={questions} answers={target.answers} />}</DialogContent>
        <DialogActions><Btn onClick={close}>Close</Btn></DialogActions>
      </Dialog>

      <FormDialog
        open={dialog === "check"}
        title={form.key === "abn" ? "ABN or registration check" : form.key === "marn" ? "MARN check" : "PRISMS data check"}
        intro={
          form.key === "abn" ? "Check the number on the official register (ABN Lookup for Australian agents, the company registry for others)."
            : form.key === "marn" ? "Check the MARN on the OMARA register, or mark it not applicable when the agent is not a migration agent."
              : "Confirm the agent's details are complete and correct for entry into PRISMS."
        }
        submitLabel="Save"
        onSubmit={submitCheck}
        onCancel={close}
      >
        <Field
          id="ck-status"
          label="Result"
          error={errors.status}
          value={form.status || ""}
          onChange={setField("status")}
          options={[
            { value: "", label: "Choose..." },
            { value: "verified", label: "Verified" },
            { value: "failed", label: "Failed" },
            ...(form.key === "prisms" ? [] : [{ value: "not_applicable", label: "Not applicable" }]),
          ]}
        />
        <Field id="ck-note" label={form.status === "failed" ? "What failed (required)" : "Note (optional)"} multiline error={errors.note} value={form.note || ""} onChange={setField("note")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>

      <FormDialog
        open={dialog === "declarations"}
        title="Declarations"
        intro="Record the applicant's declarations if they gave them by another route, and note the college's review."
        submitLabel="Save"
        onSubmit={submitDeclarations}
        onCancel={close}
      >
        <Field id="dc-coi" label="Does the agent have a conflict of interest?" error={errors.coi} value={form.coi || ""} onChange={setField("coi")} options={YESNO} />
        {form.coi === "yes" && <Field id="dc-details" label="Describe the conflict" multiline error={errors.coi_details} value={form.coi_details || ""} onChange={setField("coi_details")} inputProps={{ maxLength: 2000 }} />}
        <CheckField checked={!!form.ethics} onChange={(v) => setForm((f) => ({ ...f, ethics: v }))} label="The agent has accepted the code of ethics" />
        <Field id="dc-note" label="College review note" multiline value={form.review_note || ""} onChange={setField("review_note")} inputProps={{ maxLength: 2000 }} />
        <FilePick id="dc-file" label="Signed declaration (optional)" file={form.file} error={errors.file} onChange={(f) => setForm((x) => ({ ...x, file: f }))} />
      </FormDialog>

      <FormDialog
        open={dialog === "decision"}
        title={form.kind === "approve" ? `Approve ${agent.legal_name}?` : `Reject ${agent.legal_name}?`}
        intro={
          form.kind === "approve"
            ? "The agent can then sign in and receive the agent agreement. The reason is kept on the record."
            : "The agent is told the application was not approved. The reason is kept on the record."
        }
        submitLabel={form.kind === "approve" ? "Approve" : "Reject"}
        danger={form.kind !== "approve"}
        onSubmit={submitDecision}
        onCancel={close}
      >
        <Field id="dec-reason" label="Reason (required)" multiline error={errors.reason} value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 2000 }} />
        {form.kind === "reject" && (
          <>
            <CheckField checked={form.send_email !== false} onChange={(v) => setForm((f) => ({ ...f, send_email: v }))} label="Email the agent about this decision" />
            {form.send_email !== false && (
              <>
                {!form.drafted ? (
                  <Btn onClick={makeDraft} disabled={busy}>Write a draft email from this reason</Btn>
                ) : (
                  <>
                    <Field id="dec-subject" label={`Subject (to ${form.to})`} value={form.subject || ""} onChange={setField("subject")} />
                    <Field id="dec-body" label="Email" multiline rows={9} value={form.body || ""} onChange={setField("body")} inputProps={{ maxLength: 5000 }} />
                  </>
                )}
                {!form.drafted && <small className="admin-hint" style={{ margin: 0 }}>Without a draft, a standard message with your reason is sent.</small>}
              </>
            )}
          </>
        )}
      </FormDialog>
    </>
  );
};

export default DueDiligencePanel;
