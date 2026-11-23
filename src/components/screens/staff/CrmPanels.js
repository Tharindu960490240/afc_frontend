import React, { useCallback, useEffect, useState } from "react";

import { ListTable } from "../admin/ListKit";
import { ConfirmDialog, FormDialog, formatDate, formatDateTime } from "../admin/shared";
import {
  addTraining, correctiveStep, createCorrectiveAction, editCommunication, getMonitoring, listAgentLeads, listCommunications, listTraining,
  logCommunication, saveMonitoringReview, updateCorrectiveAction,
} from "../../../services/comsService";
import { Badge, Btn, CheckField, Field, Notice, Panel, TableCell, TableRow, DataTable } from "../../ui";

const today = () => new Date().toLocaleDateString("en-CA");
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const toLocalInput = (v) => { if (!v) return nowLocal(); const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const MONITORING_ROLES = ["admin", "director", "ceo", "marketing_officer", "compliance"];
const OUTCOME_TONE = { pending: "warning", submitted: "success", not_proceeding: "neutral" };
const OUTCOME_LABEL = { pending: "Pending", submitted: "Submitted", not_proceeding: "Not proceeding" };
const CA_TONE = { draft: "warning", sent: "info", implemented: "success", not_implemented: "danger", cancelled: "neutral" };
const CA_LABEL = { draft: "Draft", sent: "Sent", implemented: "Implemented", not_implemented: "Not implemented", cancelled: "Cancelled" };
const COMM_TYPES = [
  { value: "phone", label: "Phone call" }, { value: "email", label: "Email" }, { value: "meeting", label: "Meeting" },
  { value: "note", label: "File note (the agent can read it)" }, { value: "other", label: "Other" },
];
const DIRECTIONS = [{ value: "outbound", label: "We contacted the agent" }, { value: "inbound", label: "The agent contacted us" }];
const dateField = (props) => <Field type="date" InputLabelProps={{ shrink: true }} {...props} />;

// shared load + dialog plumbing for the three panels
const usePanel = (loader, showMessage) => {
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [target, setTarget] = useState(null);
  const load = useCallback(async () => { const res = await loader(); setData(res.success ? res.data : null); }, [loader]);
  useEffect(() => { load(); }, [load]);
  const open = (name, initial = {}, row = null) => { setForm(initial); setErrors({}); setTarget(row); setDialog(name); };
  const close = () => setDialog(null);
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const run = async (call, ok) => {
    const res = await call();
    if (res.success) { close(); showMessage(ok); await load(); return res; }
    if (res.errors) setErrors(res.errors);
    showMessage(res.message || "Something went wrong.", "error");
    return null;
  };
  return { data, dialog, form, setForm, errors, setErrors, target, load, open, close, setField, run };
};

// ============================================================ Communications
export const CommunicationsPanel = ({ agent, showMessage }) => {
  const loader = useCallback(() => listCommunications(agent.id), [agent.id]);
  const p = usePanel(loader, showMessage);
  const list = p.data || [];
  const isNote = p.form.type === "note";

  const submit = () => {
    const e = {};
    if ((p.form.summary || "").trim().length < 3) e.summary = "Write a short summary";
    if (Object.keys(e).length) return p.setErrors(e);
    const body = {
      type: p.form.type, direction: isNote ? undefined : p.form.direction || "outbound", occurred_at: p.form.occurred_at ? new Date(p.form.occurred_at).toISOString() : undefined,
      subject: (p.form.subject || "").trim() || undefined, summary: p.form.summary.trim(),
    };
    return p.run(() => (p.target ? editCommunication(agent.id, p.target.id, body) : logCommunication(agent.id, body)), p.target ? "Communication updated." : "Logged.");
  };

  return (
    <Panel>
      <div className="app-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Communications</h2>
        <Btn kind="primary" onClick={() => p.open("comm", { type: "phone", direction: "outbound", occurred_at: nowLocal() })}>Log a communication</Btn>
      </div>
      <p className="app-hint" style={{ margin: "8px 0 16px" }}>
        Log every call, email and meeting with this agent. Emails sent to or from the agent's address are added automatically. The agent can read these entries but not change them. The agent sees every entry, so write notes as you would say them to the agent.
        Everything here is kept for 7 years and cannot be deleted.
      </p>
      {p.data === null ? null : list.length === 0 ? (
        <div className="admin-empty">Nothing logged yet.</div>
      ) : (
        <ListTable bare label="Communications" head={["When", "Type", "Staff", "Summary", ""]} rows={list} searchAlways={false} pageSize={10}
          search={(c) => `${c.type_label} ${c.staff_name || ""} ${c.subject || ""} ${c.summary}`} searchPlaceholder="Type, staff or words in the note"
          renderRow={(c) => (
                <TableRow key={c.id}>
                  <TableCell data-label="When">{formatDateTime(c.occurred_at)}</TableCell>
                  <TableCell data-label="Type">
                    {c.type_label}
                    <div className="app-hint" style={{ margin: 0 }}>
                      {c.direction === "inbound" ? "From the agent" : c.direction === "internal" ? "File note" : "To the agent"}{c.source === "inbound_email" ? " (logged automatically)" : ""}
                    </div>
                  </TableCell>
                  <TableCell data-label="Staff">{c.staff_name || (c.source === "system" ? "System" : "-")}</TableCell>
                  <TableCell data-label="Summary" style={{ whiteSpace: "pre-wrap", maxWidth: 520 }}>
                    {c.subject && <strong style={{ display: "block" }}>{c.subject}</strong>}
                    {c.summary.length > 400 ? `${c.summary.slice(0, 400)}...` : c.summary}
                    {c.edited_at && <div className="app-hint" style={{ margin: "4px 0 0" }}>Edited {formatDateTime(c.edited_at)}</div>}
                  </TableCell>
                  <TableCell>{c.can_edit && <Btn size="small" onClick={() => p.open("comm", { type: c.type, direction: c.direction === "inbound" ? "inbound" : "outbound", occurred_at: toLocalInput(c.occurred_at), subject: c.subject || "", summary: c.summary }, c)}>Edit</Btn>}</TableCell>
                </TableRow>
          )} />
      )}
      <FormDialog open={p.dialog === "comm"} title={p.target ? "Edit communication" : "Log a communication"} intro="Record what was discussed. Who you are and the time are saved with it." submitLabel="Save" onSubmit={submit} onCancel={p.close}>
        <Field id="cm-type" label="Type" value={p.form.type || "phone"} onChange={p.setField("type")} options={COMM_TYPES} />
        {!isNote && <Field id="cm-dir" label="Who contacted whom" value={p.form.direction || "outbound"} onChange={p.setField("direction")} options={DIRECTIONS} />}
        <Field id="cm-when" type="datetime-local" label="Date and time" error={p.errors.occurred_at} InputLabelProps={{ shrink: true }} value={p.form.occurred_at || ""} onChange={p.setField("occurred_at")} inputProps={{ max: nowLocal() }} />
        <Field id="cm-subj" label="Subject (optional)" value={p.form.subject || ""} onChange={p.setField("subject")} inputProps={{ maxLength: 200 }} />
        <Field id="cm-sum" label="Summary" error={p.errors.summary} multiline rows={5} value={p.form.summary || ""} onChange={p.setField("summary")} inputProps={{ maxLength: 8000 }} />
      </FormDialog>
    </Panel>
  );
};

// ============================================================ Leads (read-only) and training
export const LeadsTrainingPanel = ({ agent, role, showMessage }) => {
  const [leads, setLeads] = useState(null);
  useEffect(() => { listAgentLeads(agent.id).then((r) => setLeads(r.success ? r.data : [])); }, [agent.id]);
  const loader = useCallback(() => listTraining(agent.id), [agent.id]);
  const p = usePanel(loader, showMessage);
  const training = p.data || [];
  const canTrain = MONITORING_ROLES.includes(role);

  const submit = () => {
    const e = {};
    if ((p.form.title || "").trim().length < 3) e.title = "Enter a title";
    if (!p.form.held_on) e.held_on = "Choose the date";
    if (Object.keys(e).length) return p.setErrors(e);
    return p.run(() => addTraining(agent.id, { title: p.form.title.trim(), kind: p.form.kind || "refresher", held_on: p.form.held_on, delivered_by: (p.form.delivered_by || "").trim() || undefined, notes: (p.form.notes || "").trim() || undefined }), "Training recorded.");
  };

  return (
    <>
      <Panel>
        <h2>Student leads</h2>
        <p className="app-hint" style={{ margin: "8px 0 16px" }}>Logged by the agent in their portal. You can read these but not change them.</p>
        {leads === null ? null : leads.length === 0 ? <div className="admin-empty">The agent has not logged any leads.</div> : (
          <DataTable label="CrmPanels" head={["Student", "Country", "Course", "Contact date", "Outcome"]}>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell data-label="Student">{l.student_name}{l.notes && <div className="app-hint" style={{ margin: 0 }}>{l.notes}</div>}</TableCell>
                    <TableCell data-label="Country">{l.country}</TableCell>
                    <TableCell data-label="Course">{l.course_interest}</TableCell>
                    <TableCell data-label="Contact date">{formatDate(l.contact_date)}</TableCell>
                    <TableCell data-label="Outcome"><Badge tone={OUTCOME_TONE[l.outcome]} label={OUTCOME_LABEL[l.outcome]} /></TableCell>
                  </TableRow>
                ))}
              </DataTable>
        )}
      </Panel>
      <Panel>
        <div className="app-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Training records</h2>
          {canTrain && <Btn kind="primary" onClick={() => p.open("training", { kind: "refresher", held_on: today() })}>Record training</Btn>}
        </div>
        <p className="app-hint" style={{ margin: "8px 0 16px" }}>The induction is listed here automatically. Add any refresher or product training you give the agent.</p>
        {p.data === null ? null : training.length === 0 ? <div className="admin-empty">No training recorded yet.</div> : (
          <DataTable label="CrmPanels" head={["Date", "Training", "Given by", "Notes"]}>
                {training.map((t, i) => (
                  <TableRow key={t.id || `s${i}`}>
                    <TableCell data-label="Date">{formatDate(t.held_on)}</TableCell>
                    <TableCell data-label="Training">{t.title}{t.source === "system" && <div className="app-hint" style={{ margin: 0 }}>From the induction record</div>}</TableCell>
                    <TableCell data-label="Given by">{t.delivered_by || "-"}</TableCell>
                    <TableCell data-label="Notes">{t.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
        )}
        <FormDialog open={p.dialog === "training"} title="Record training" intro="Training you gave this agent after the induction." submitLabel="Save" onSubmit={submit} onCancel={p.close}>
          <Field id="tr-title" label="Title" error={p.errors.title} value={p.form.title || ""} onChange={p.setField("title")} inputProps={{ maxLength: 200 }} />
          <Field id="tr-kind" label="Type" value={p.form.kind || "refresher"} onChange={p.setField("kind")} options={[{ value: "refresher", label: "Refresher" }, { value: "product_update", label: "Product update" }, { value: "compliance", label: "Compliance" }, { value: "other", label: "Other" }]} />
          {dateField({ id: "tr-date", label: "Date held", error: p.errors.held_on, value: p.form.held_on || "", onChange: p.setField("held_on"), inputProps: { max: today() } })}
          <Field id="tr-by" label="Given by (optional)" value={p.form.delivered_by || ""} onChange={p.setField("delivered_by")} inputProps={{ maxLength: 160 }} />
          <Field id="tr-notes" label="Notes (optional)" multiline rows={3} value={p.form.notes || ""} onChange={p.setField("notes")} inputProps={{ maxLength: 4000 }} />
        </FormDialog>
      </Panel>
    </>
  );
};

// ============================================================ Monitoring and corrective action
export const MonitoringPanel = ({ agent, role, showMessage, onChanged }) => {
  const loader = useCallback(() => getMonitoring(agent.id), [agent.id]);
  const p = usePanel(loader, showMessage);
  const [confirm, setConfirm] = useState(null);
  const d = p.data;
  const can = MONITORING_ROLES.includes(role);
  const reviews = (d && d.reviews) || [];
  const notices = (d && d.corrective_actions) || [];
  const last = reviews[0];

  const openReview = () => p.open("review", {
    period_start: d.prefill.period_start || "", period_end: d.prefill.period_end || today(), applications_submitted: String(d.prefill.applications_submitted ?? 0),
    conversion_rate: "", student_performance: "", incidents_found: false, incidents_detail: "", unauthorised_advice_found: false, unauthorised_advice_detail: "", notes: "",
  });
  const submitReview = async () => {
    const f = p.form;
    const e = {};
    if (!f.period_start) e.period_start = "Choose the start of the period";
    if (!f.period_end) e.period_end = "Choose the end of the period";
    if (f.applications_submitted === "" || Number(f.applications_submitted) < 0) e.applications_submitted = "Enter the number of applications";
    if ((f.student_performance || "").trim().length < 3) e.student_performance = "Summarise how the enrolled students are doing";
    if (f.incidents_found && !(f.incidents_detail || "").trim()) e.incidents_detail = "Describe the incident";
    if (f.unauthorised_advice_found && !(f.unauthorised_advice_detail || "").trim()) e.unauthorised_advice_detail = "Describe the advice that was identified";
    if (Object.keys(e).length) return p.setErrors(e);
    const res = await p.run(() => saveMonitoringReview(agent.id, {
      period_start: f.period_start, period_end: f.period_end, applications_submitted: Number(f.applications_submitted),
      conversion_rate: f.conversion_rate === "" ? undefined : Number(f.conversion_rate), student_performance: f.student_performance.trim(),
      incidents_found: !!f.incidents_found, incidents_detail: f.incidents_found ? f.incidents_detail.trim() : undefined,
      unauthorised_advice_found: !!f.unauthorised_advice_found, unauthorised_advice_detail: f.unauthorised_advice_found ? f.unauthorised_advice_detail.trim() : undefined,
      outcome: f.outcome === "issues_found" ? "issues_found" : "satisfactory", notes: (f.notes || "").trim() || undefined,
    }), "Monitoring form saved.");
    if (res && onChanged) onChanged();
  };

  const openNotice = (review) => p.open("notice", {
    review_id: review ? review.id : "", issues: review ? [review.incidents_found && review.incidents_detail, review.unauthorised_advice_found && review.unauthorised_advice_detail].filter(Boolean).join("\n") : "",
    required_actions: "", due_date: "",
  });
  const submitNotice = () => {
    const f = p.form;
    const e = {};
    if ((f.issues || "").trim().length < 5) e.issues = "Describe the specific issues";
    if ((f.required_actions || "").trim().length < 5) e.required_actions = "Say what the agent must do";
    if (!f.due_date) e.due_date = "Choose the date it must be done by";
    if (Object.keys(e).length) return p.setErrors(e);
    return p.run(() => createCorrectiveAction(agent.id, { review_id: f.review_id || undefined, issues: f.issues.trim(), required_actions: f.required_actions.trim(), due_date: f.due_date }), "Draft notice created. Read it and edit it before you send it.");
  };
  const openEdit = (n) => p.open("edit", { issues: n.issues, required_actions: n.required_actions, due_date: n.due_date, notice_subject: n.notice_subject, notice_body: n.notice_body }, n);
  const submitEdit = () => {
    const f = p.form;
    const e = {};
    if ((f.issues || "").trim().length < 5) e.issues = "Describe the specific issues";
    if ((f.required_actions || "").trim().length < 5) e.required_actions = "Say what the agent must do";
    if (!f.due_date) e.due_date = "Choose the date";
    if ((f.notice_body || "").trim().length < 20) e.notice_body = "The notice needs text";
    if (Object.keys(e).length) return p.setErrors(e);
    return p.run(() => updateCorrectiveAction(agent.id, p.target.id, { issues: f.issues.trim(), required_actions: f.required_actions.trim(), due_date: f.due_date, notice_subject: f.notice_subject.trim(), notice_body: f.notice_body.trim() }), "Notice saved.");
  };
  const redraft = async () => {
    const res = await correctiveStep(agent.id, p.target.id, "redraft");
    if (res.success) p.setForm((f) => ({ ...f, notice_subject: res.data.subject, notice_body: res.data.body }));
    else showMessage(res.message || "Could not redraft.", "error");
  };
  const resolveSubmit = () => {
    if ((p.form.note || "").trim().length < 3) return p.setErrors({ note: "Say how you checked" });
    return p.run(() => correctiveStep(agent.id, p.target.id, p.dialog === "implemented" ? "implemented" : "not-implemented", { note: p.form.note.trim() }), p.dialog === "implemented" ? "Marked as implemented." : "Recorded as not implemented. The Director and CEO have been told.");
  };

  if (!d) return <Panel><div className="admin-empty">Loading...</div></Panel>;
  return (
    <>
      <Panel>
        <div className="app-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>6-monthly monitoring</h2>
          {can && <Btn kind="primary" onClick={openReview}>Complete the monitoring form</Btn>}
        </div>
        <p className="app-hint" style={{ margin: "8px 0 16px" }}>
          The Agent Monitoring Form is completed here every six months from the agreement date, not by email. A task is created for Marketing when one is due, and saving the form closes it.
        </p>
        {agent.crm && agent.crm.monitoring_due && <Notice severity="info" sx={{ mb: 2 }}>The next monitoring form is due on {formatDate(agent.crm.monitoring_due)}.</Notice>}
        {reviews.length === 0 ? <div className="admin-empty">No monitoring review yet.</div> : (
          <DataTable label="CrmPanels" head={["Period", "Applications", "Conversion", "Outcome", "Completed", ""]}>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell data-label="Period">{formatDate(r.period_start)} to {formatDate(r.period_end)}</TableCell>
                    <TableCell data-label="Applications">{r.applications_submitted}</TableCell>
                    <TableCell data-label="Conversion">{r.conversion_rate == null ? "-" : `${r.conversion_rate}%`}</TableCell>
                    <TableCell data-label="Outcome"><Badge tone={r.outcome === "satisfactory" ? "success" : "warning"} label={r.outcome === "satisfactory" ? "Satisfactory" : "Issues found"} /></TableCell>
                    <TableCell data-label="Completed">{formatDateTime(r.completed_at)}{r.completed_by_name && <div className="app-hint" style={{ margin: 0 }}>{r.completed_by_name}</div>}</TableCell>
                    <TableCell>{can && r.outcome === "issues_found" && <Btn size="small" onClick={() => openNotice(r)}>Corrective notice</Btn>}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
        )}
        {last && (
          <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6 }}>
            <strong>Latest review</strong>
            <div>Enrolled students: {last.student_performance}</div>
            <div>Compliance incidents: {last.incidents_found ? last.incidents_detail : "None"}</div>
            <div>Unauthorised advice: {last.unauthorised_advice_found ? last.unauthorised_advice_detail : "None identified"}</div>
            {last.notes && <div>Notes: {last.notes}</div>}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="app-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Corrective action notices</h2>
          {can && <Btn onClick={() => openNotice(null)}>New notice</Btn>}
        </div>
        <p className="app-hint" style={{ margin: "8px 0 16px" }}>
          If monitoring finds a problem, the wording is drafted from your notes. Read and change it before you send it. After it is sent, record whether the agent carried it out. Not carrying it out is grounds for termination.
        </p>
        {notices.length === 0 ? <div className="admin-empty">No notices.</div> : (
          <DataTable label="CrmPanels" head={["Notice", "Status", "Due", ""]}>
                {notices.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell data-label="Notice" style={{ whiteSpace: "pre-wrap", maxWidth: 480 }}>
                      <strong style={{ display: "block" }}>{n.notice_subject}</strong>
                      {n.issues}
                      {n.sent_at && <div className="app-hint" style={{ margin: "4px 0 0" }}>Sent {formatDateTime(n.sent_at)} by {n.sent_by_name}</div>}
                      {n.resolution_note && <div className="app-hint" style={{ margin: "4px 0 0" }}>{n.resolution_note}</div>}
                    </TableCell>
                    <TableCell data-label="Status"><Badge tone={n.overdue ? "danger" : CA_TONE[n.status]} label={n.overdue ? "Overdue" : CA_LABEL[n.status]} /></TableCell>
                    <TableCell data-label="Due">{formatDate(n.due_date)}</TableCell>
                    <TableCell>
                      {can && n.status === "draft" && (
                        <>
                          <Btn size="small" onClick={() => openEdit(n)}>Review and edit</Btn>{" "}
                          <Btn size="small" kind="primary" onClick={() => setConfirm({ kind: "send", n })}>Send</Btn>{" "}
                          <Btn size="small" kind="danger" onClick={() => setConfirm({ kind: "cancel", n })}>Cancel</Btn>
                        </>
                      )}
                      {can && n.status === "sent" && (
                        <>
                          <Btn size="small" kind="success" onClick={() => p.open("implemented", { note: "" }, n)}>Implemented</Btn>{" "}
                          <Btn size="small" kind="danger" onClick={() => p.open("not_implemented", { note: "" }, n)}>Not implemented</Btn>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
        )}
      </Panel>

      <FormDialog open={p.dialog === "review"} title="Agent Monitoring Form" intro="Cover the six months since the last review." submitLabel="Save the form" onSubmit={submitReview} onCancel={p.close}>
        {dateField({ id: "mr-start", label: "Period starts", error: p.errors.period_start, value: p.form.period_start || "", onChange: p.setField("period_start") })}
        {dateField({ id: "mr-end", label: "Period ends", error: p.errors.period_end, value: p.form.period_end || "", onChange: p.setField("period_end"), inputProps: { max: today() } })}
        <Field id="mr-apps" type="number" label="1. Applications submitted in the period" error={p.errors.applications_submitted} helper={d.prefill.leads_logged ? `The agent logged ${d.prefill.leads_logged} leads, ${d.prefill.applications_submitted} marked submitted.` : undefined} value={p.form.applications_submitted ?? ""} onChange={p.setField("applications_submitted")} inputProps={{ min: 0 }} />
        <Field id="mr-conv" type="number" label="2. Conversion rate, % (optional)" error={p.errors.conversion_rate} value={p.form.conversion_rate ?? ""} onChange={p.setField("conversion_rate")} inputProps={{ min: 0, max: 100, step: 0.1 }} />
        <Field id="mr-perf" label="3. Enrolled student performance (attendance and course progress)" error={p.errors.student_performance} multiline rows={3} value={p.form.student_performance || ""} onChange={p.setField("student_performance")} inputProps={{ maxLength: 4000 }} />
        <CheckField id="mr-inc" label="4. There were compliance incidents" checked={p.form.incidents_found} onChange={(v) => p.setForm((f) => ({ ...f, incidents_found: v }))} />
        {p.form.incidents_found && <Field id="mr-incd" label="Describe the incidents" error={p.errors.incidents_detail} multiline rows={3} value={p.form.incidents_detail || ""} onChange={p.setField("incidents_detail")} inputProps={{ maxLength: 4000 }} />}
        <CheckField id="mr-adv" label="5. Unauthorised advice was identified" checked={p.form.unauthorised_advice_found} onChange={(v) => p.setForm((f) => ({ ...f, unauthorised_advice_found: v }))} />
        {p.form.unauthorised_advice_found && <Field id="mr-advd" label="Describe the advice" error={p.errors.unauthorised_advice_detail} multiline rows={3} value={p.form.unauthorised_advice_detail || ""} onChange={p.setField("unauthorised_advice_detail")} inputProps={{ maxLength: 4000 }} />}
        <Field id="mr-out" label="Overall outcome" value={p.form.outcome || "satisfactory"} onChange={p.setField("outcome")} options={[{ value: "satisfactory", label: "Satisfactory" }, { value: "issues_found", label: "Issues found" }]} helper="An incident or unauthorised advice always counts as issues found." />
        <Field id="mr-notes" label="Notes (optional)" multiline rows={3} value={p.form.notes || ""} onChange={p.setField("notes")} inputProps={{ maxLength: 4000 }} />
      </FormDialog>

      <FormDialog open={p.dialog === "notice"} title="New corrective action notice" intro="Describe the issues and what the agent must do. The wording of the notice is drafted for you to read and edit." submitLabel="Create the draft" onSubmit={submitNotice} onCancel={p.close}>
        <Field id="ca-issues" label="Specific issues (one per line)" error={p.errors.issues} multiline rows={4} value={p.form.issues || ""} onChange={p.setField("issues")} inputProps={{ maxLength: 6000 }} />
        <Field id="ca-actions" label="What the agent must do (one per line)" error={p.errors.required_actions} multiline rows={4} value={p.form.required_actions || ""} onChange={p.setField("required_actions")} inputProps={{ maxLength: 6000 }} />
        {dateField({ id: "ca-due", label: "Must be done by", error: p.errors.due_date, value: p.form.due_date || "", onChange: p.setField("due_date"), inputProps: { min: today() } })}
      </FormDialog>

      <FormDialog open={p.dialog === "edit"} title="Review the notice" intro="This is a draft. Nothing is sent until you press Send." submitLabel="Save" onSubmit={submitEdit} onCancel={p.close}>
        <Field id="ce-subj" label="Subject" value={p.form.notice_subject || ""} onChange={p.setField("notice_subject")} inputProps={{ maxLength: 200 }} />
        <Field id="ce-body" label="Notice" error={p.errors.notice_body} multiline rows={14} value={p.form.notice_body || ""} onChange={p.setField("notice_body")} inputProps={{ maxLength: 12000 }} />
        <Field id="ce-issues" label="Specific issues" error={p.errors.issues} multiline rows={3} value={p.form.issues || ""} onChange={p.setField("issues")} />
        <Field id="ce-actions" label="What the agent must do" error={p.errors.required_actions} multiline rows={3} value={p.form.required_actions || ""} onChange={p.setField("required_actions")} />
        {dateField({ id: "ce-due", label: "Must be done by", error: p.errors.due_date, value: p.form.due_date || "", onChange: p.setField("due_date"), inputProps: { min: today() } })}
        <Btn onClick={redraft}>Write the notice again from the issues above</Btn>
      </FormDialog>

      <FormDialog open={p.dialog === "implemented" || p.dialog === "not_implemented"} title={p.dialog === "implemented" ? "Mark as implemented" : "Record as not implemented"}
        intro={p.dialog === "implemented" ? "Say how you checked that the agent did what was asked." : "Say what you found. The Director and CEO are told, because not carrying it out is grounds for termination."} submitLabel="Save" onSubmit={resolveSubmit} onCancel={p.close}>
        <Field id="cr-note" label="Note" error={p.errors.note} multiline rows={3} value={p.form.note || ""} onChange={p.setField("note")} inputProps={{ maxLength: 2000 }} />
      </FormDialog>

      <ConfirmDialog
        open={!!confirm}
        title={confirm && confirm.kind === "send" ? "Send this notice?" : "Cancel this draft?"}
        text={confirm && confirm.kind === "send" ? `"${confirm.n.notice_subject}" is emailed to the agent now, filed in the communication log, and tracked until ${formatDate(confirm.n.due_date)}.` : "The draft is closed and nothing is sent. It stays on record."}
        confirmLabel={confirm && confirm.kind === "send" ? "Send the notice" : "Cancel the draft"}
        danger={!!confirm && confirm.kind === "cancel"}
        onConfirm={async () => {
          const c = confirm; setConfirm(null);
          await p.run(() => correctiveStep(agent.id, c.n.id, c.kind === "send" ? "send" : "cancel", c.kind === "cancel" ? { reason: "Draft cancelled" } : {}), c.kind === "send" ? "Notice sent." : "Draft cancelled.");
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};
