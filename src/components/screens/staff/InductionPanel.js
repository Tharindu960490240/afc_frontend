import React, { useState } from "react";
import { formatDate, formatDateTime, FormDialog } from "../admin/shared";
import { cancelInduction, completeInduction, editInduction, markInductionMissed, recordInduction, rescheduleInduction, undoInduction } from "../../../services/comsService";
import { Btn, Field, Notice, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const MODES = [
  { value: "online", label: "Online" },
  { value: "in_person", label: "In person" },
  { value: "phone", label: "By phone" },
];
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));
const STATUS_LABEL = { scheduled: "Scheduled", held: "Held", cancelled: "Cancelled", missed: "Did not attend", voided: "Undone" };
const ELIGIBLE = ["approved", "onboarding", "active", "under_review"];
const today = () => new Date().toLocaleDateString("en-CA");
const ONLINE_TEXT = {
  not_started: "The agent has not started the online modules.",
  in_progress: "The agent is working through the online modules.",
  awaiting_policy: "All modules are done. The agent still has to acknowledge the policies.",
  awaiting_staff: "The agent has finished the modules and acknowledged the policies. Please check and confirm. The student application part of the portal opens when you do.",
  complete: "Online induction complete and confirmed. The agent's portal is fully open.",
};

// Record, schedule and review the agent's induction (Phase 3). Recording it is one of the three things BR-02 needs before Active.
const InductionPanel = ({ agent, staff, currentUserId, onChanged, showMessage }) => {
  const [dialog, setDialog] = useState(null); // "held" | "schedule" | "complete" | "reschedule" | "cancel"
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [, setBusy] = useState(false);

  const list = agent.inductions || [];
  const online = ELIGIBLE.includes(agent.status) ? agent.online_induction : null;
  const scheduled = list.find((i) => i.status === "scheduled");
  const held = list.filter((i) => i.status === "held");
  const canEdit = !!agent.permissions?.recordInduction && !agent.deleted_at;
  const canUndo = !!agent.permissions?.remove && !agent.deleted_at;
  const can = agent.permissions?.recordInduction && ELIGIBLE.includes(agent.status) && !agent.deleted_at;
  if (!ELIGIBLE.includes(agent.status) && list.length === 0) return null;

  const staffOptions = (staff || []).map((s) => ({ value: String(s.id), label: `${s.first_name} ${s.last_name}`.trim() }));
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const open = (name, initial, row = null) => { setForm(initial); setErrors({}); setTarget(row); setDialog(name); };
  const close = () => setDialog(null);
  const base = () => ({ conducted_by: String(currentUserId || ""), mode: "online", attendees: "", notes: "", start_time: "10:00", meeting_url: "", location: "" });

  const submit = async (call, ok) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) { close(); showMessage(res.data && res.data.warning ? res.data.warning : ok, res.data && res.data.warning ? "warning" : "success"); onChanged(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Something went wrong.", "error"); }
  };
  const payload = () => ({
    conducted_by: form.conducted_by ? Number(form.conducted_by) : undefined,
    mode: form.mode,
    attendees: (form.attendees || "").trim() || undefined,
    notes: (form.notes || "").trim() || undefined,
  });
  // how the agent joins: a link for online, a place for in person, the number we will call for phone
  const booking = () => ({
    start_time: form.start_time || undefined,
    meeting_url: form.mode === "online" ? (form.meeting_url || "").trim() || undefined : undefined,
    location: form.mode !== "online" ? (form.location || "").trim() || undefined : undefined,
  });
  const bookingErrors = () => {
    if (!form.scheduled_for) return { scheduled_for: "Choose the date" };
    if (!form.start_time) return { start_time: "Choose the start time" };
    if (form.mode === "online" && !(form.meeting_url || "").trim()) return { meeting_url: "Add the meeting link so the agent can join" };
    if (form.mode === "online" && !/^https?:\/\//i.test(form.meeting_url.trim())) return { meeting_url: "Enter a full link starting with https://" };
    if (form.mode !== "online" && !(form.location || "").trim()) return { location: form.mode === "phone" ? "Add the phone number the agent will be called on" : "Add where the induction will be held" };
    return null;
  };
  const onSubmit = () => {
    if (dialog === "held") {
      if (!form.held_on) return setErrors({ held_on: "Choose the date the induction was held" });
      if (!(form.notes || "").trim()) return setErrors({ notes: "Add a note about what was covered" });
      return submit(() => recordInduction(agent.id, { outcome: "held", held_on: form.held_on, ...payload() }), "Induction recorded.");
    }
    if (dialog === "schedule") {
      if (bookingErrors()) return setErrors(bookingErrors());
      return submit(() => recordInduction(agent.id, { outcome: "scheduled", scheduled_for: form.scheduled_for, ...payload(), ...booking() }), "Induction scheduled. The agent has been emailed.");
    }
    if (dialog === "complete") {
      if (!form.held_on) return setErrors({ held_on: "Choose the date the induction was held" });
      if (!(form.notes || "").trim()) return setErrors({ notes: "Add a note about what was covered" });
      return submit(() => completeInduction(agent.id, target.id, { held_on: form.held_on, ...payload() }), "Induction recorded.");
    }
    if (dialog === "reschedule") {
      if (bookingErrors()) return setErrors(bookingErrors());
      const p = payload();
      return submit(() => rescheduleInduction(agent.id, target.id, { scheduled_for: form.scheduled_for, conducted_by: p.conducted_by, mode: p.mode, ...booking() }), "Induction moved. The agent has been emailed.");
    }
    if (dialog === "edit") {
      if (!form.held_on) return setErrors({ held_on: "Choose the date the induction was held" });
      if (!(form.notes || "").trim()) return setErrors({ notes: "Add a note about what was covered" });
      return submit(() => editInduction(agent.id, target.id, { held_on: form.held_on, ...payload() }), "Induction updated.");
    }
    if ((form.reason || "").trim().length < 3) return setErrors({ reason: "Please give a reason" });
    if (dialog === "undo") return submit(() => undoInduction(agent.id, target.id, form.reason.trim()), "Induction undone.");
    if (dialog === "missed") return submit(() => markInductionMissed(agent.id, target.id, form.reason.trim()), "Recorded as not attended. You can book another induction.");
    return submit(() => cancelInduction(agent.id, target.id, form.reason.trim()), "Induction cancelled.");
  };

  const whoField = (
    <Field id="in-by" label="Run by" error={errors.conducted_by} value={form.conducted_by || ""} onChange={setField("conducted_by")} options={staffOptions} />
  );
  const modeField = <Field id="in-mode" label="How" value={form.mode || "online"} onChange={setField("mode")} options={MODES} />;
  const dateField = (id, name, label, error, min, max) => (
    <Field id={id} type="date" label={label} error={error} InputLabelProps={{ shrink: true }} value={form[name] || ""} onChange={setField(name)} inputProps={{ min, max }} />
  );
  const detailFields = (
    <>
      <Field id="in-att" label="Who attended (optional)" value={form.attendees || ""} onChange={setField("attendees")} inputProps={{ maxLength: 500 }} />
      <Field id="in-notes" label="Notes (what was covered)" error={errors.notes} multiline rows={3} value={form.notes || ""} onChange={setField("notes")} inputProps={{ maxLength: 3000 }} />
    </>
  );

  return (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <div className="app-card-head"><strong>Induction</strong></div>
      <p className="app-hint" style={{ margin: "8px 0 16px" }}>
        {agent.induction_recorded_at
          ? `Induction recorded on ${formatDate(agent.induction_recorded_at)}.`
          : "Not recorded yet. Schedule it, or record it once it has been held. It is needed, with the agreement and PRISMS, before the agent can become Active."}
      </p>

      {online && (
        <div style={{ margin: "0 0 20px", padding: "14px 16px", border: "1px solid var(--border-color)", borderRadius: 10 }}>
          <strong>Online induction (agent portal)</strong>
          <div className="app-hint" style={{ margin: "6px 0 10px" }}>
            {ONLINE_TEXT[online.stage]} Modules done: {online.modules_completed} of {online.modules_total}.
          </div>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            {online.modules.map((m) => <li key={m.id}>{m.position}. {m.title}: {m.completed_at ? `completed ${formatDateTime(m.completed_at)}${m.ip ? ` (IP ${m.ip})` : ""}` : "not done"}</li>)}
            <li>
              Policies and procedures{online.pp_acknowledged_at ? `: acknowledged ${formatDateTime(online.pp_acknowledged_at)}, version ${online.pp_acknowledged_version}, IP ${online.pp_acknowledged_ip || "-"}` : ": not acknowledged yet"}
            </li>
          </ul>
          {online.stage === "awaiting_staff" && can && (
            <Btn kind="primary" size="medium" onClick={() => submit(() => recordInduction(agent.id, { outcome: "held", online_confirmation: true }), "Online induction confirmed. The agent's portal is now fully open.")}>Confirm the online induction</Btn>
          )}
        </div>
      )}

      {scheduled && (
        <Notice severity="info" sx={{ mb: 2 }}>
          Scheduled for {formatDate(scheduled.scheduled_for)}{scheduled.start_time ? ` at ${scheduled.start_time}` : ""} ({MODE_LABEL[scheduled.mode]}), run by {scheduled.conducted_by_name || "no one yet"}.
          {scheduled.meeting_url && <> Link: <a href={scheduled.meeting_url} target="_blank" rel="noreferrer">{scheduled.meeting_url}</a>.</>}
          {scheduled.location ? ` ${scheduled.mode === "phone" ? "Phone" : "Where"}: ${scheduled.location}.` : ""}
          {scheduled.scheduled_for < today() ? " The date has passed: record the outcome or move it." : ""}
        </Notice>
      )}

      {can && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: list.length ? 20 : 0 }}>
          {scheduled ? (
            <>
              <Btn kind="primary" size="medium" onClick={() => open("complete", { ...base(), conducted_by: String(scheduled.conducted_by || currentUserId || ""), mode: scheduled.mode, held_on: scheduled.scheduled_for > today() ? today() : scheduled.scheduled_for }, scheduled)}>Record that it was held</Btn>
              <Btn size="medium" onClick={() => open("reschedule", { conducted_by: String(scheduled.conducted_by || ""), mode: scheduled.mode, scheduled_for: scheduled.scheduled_for >= today() ? scheduled.scheduled_for : today(), start_time: scheduled.start_time || "10:00", meeting_url: scheduled.meeting_url || "", location: scheduled.location || "" }, scheduled)}>Change booking</Btn>
              <Btn kind="danger" size="medium" onClick={() => open("missed", { reason: "" }, scheduled)}>Agent did not attend</Btn>
              <Btn kind="danger" size="medium" onClick={() => open("cancel", { reason: "" }, scheduled)}>Cancel booking</Btn>
            </>
          ) : (
            <>
              <Btn kind="primary" size="medium" onClick={() => open("held", { ...base(), held_on: today() })}>{held.length ? "Record another induction" : "Record induction held"}</Btn>
              <Btn size="medium" onClick={() => open("schedule", { ...base(), scheduled_for: "" })}>Schedule induction</Btn>
            </>
          )}
        </div>
      )}

      {list.length > 0 && (
        <TableContainer className="admin-table-wrap">
          <Table className="admin-table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Run by</TableCell>
                <TableCell>How</TableCell>
                <TableCell>Notes</TableCell>
                {(canEdit || canUndo) && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{formatDate(i.held_on || i.scheduled_for)}{i.start_time ? ` ${i.start_time}` : ""}</TableCell>
                  <TableCell>{STATUS_LABEL[i.status]}</TableCell>
                  <TableCell>{i.conducted_by_name || "-"}</TableCell>
                  <TableCell>{MODE_LABEL[i.mode] || "-"}</TableCell>
                  <TableCell style={{ whiteSpace: "pre-wrap" }}>
                    {["cancelled", "missed", "voided"].includes(i.status) ? `${{ missed: "Did not attend", voided: "Undone", cancelled: "Cancelled" }[i.status]}: ${i.cancel_reason || ""}` : i.notes || "-"}
                    {i.attendees ? `\nAttended: ${i.attendees}` : ""}
                  </TableCell>
                  {(canEdit || canUndo) && (
                    <TableCell style={{ whiteSpace: "nowrap" }}>
                      {i.status === "held" && canEdit && (
                        <Btn size="small" onClick={() => open("edit", { held_on: i.held_on, conducted_by: String(i.conducted_by || ""), mode: i.mode, attendees: i.attendees || "", notes: i.notes || "" }, i)}>Edit</Btn>
                      )}{" "}
                      {i.status === "held" && canUndo && <Btn size="small" kind="danger" onClick={() => open("undo", { reason: "" }, i)}>Undo</Btn>}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FormDialog
        open={dialog === "held" || dialog === "complete" || dialog === "edit"}
        title={dialog === "edit" ? "Correct this induction" : "Record induction"}
        intro={dialog === "edit" ? "Fix the date, who ran it or the notes. The change is kept in the activity log with the old and new values." : "Record when the induction was held, who ran it and what was covered. This is needed before the agent can become Active."}
        submitLabel={dialog === "edit" ? "Save" : "Record"}
        onSubmit={onSubmit}
        onCancel={close}
      >
        {dateField("in-held", "held_on", "Date held", errors.held_on, undefined, today())}
        {whoField}
        {modeField}
        {detailFields}
      </FormDialog>
      <FormDialog
        open={dialog === "schedule" || dialog === "reschedule"}
        title={dialog === "reschedule" ? "Change the induction booking" : "Schedule induction"}
        intro="The agent is emailed the details and sees them in the agent portal. Both the agent and the person running it are reminded the day before."
        submitLabel={dialog === "reschedule" ? "Save" : "Schedule"}
        onSubmit={onSubmit}
        onCancel={close}
      >
        {dateField("in-sched", "scheduled_for", "Date", errors.scheduled_for, today())}
        <Field id="in-time" type="time" label="Start time (college time)" error={errors.start_time} InputLabelProps={{ shrink: true }} value={form.start_time || ""} onChange={setField("start_time")} />
        {whoField}
        {modeField}
        {form.mode === "online" ? (
          <Field id="in-link" label="Meeting link (Teams, Zoom, Google Meet)" error={errors.meeting_url} placeholder="https://" value={form.meeting_url || ""} onChange={setField("meeting_url")} inputProps={{ maxLength: 500 }} />
        ) : (
          <Field id="in-loc" label={form.mode === "phone" ? "Phone number we will call" : "Where it will be held"} error={errors.location} value={form.location || ""} onChange={setField("location")} inputProps={{ maxLength: 300 }} />
        )}
      </FormDialog>
      <FormDialog open={dialog === "undo"} title="Undo this induction?" intro="Use this only if it was recorded by mistake, for example against the wrong agent. The record stays in the activity log. If it was the only induction, the agent will show as not inducted again." submitLabel="Undo induction" danger onSubmit={onSubmit} onCancel={close}>
        <Field id="in-undo" label="Reason (required)" error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>
      <FormDialog open={dialog === "missed"} title="The agent did not attend" intro="The induction is not recorded as held and the agent stays unable to become Active. You can book another one." submitLabel="Record" danger onSubmit={onSubmit} onCancel={close}>
        <Field id="in-miss" label="What happened (required)" error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>
      <FormDialog open={dialog === "cancel"} title="Cancel this induction booking?" submitLabel="Cancel booking" danger onSubmit={onSubmit} onCancel={close}>
        <Field id="in-reason" label="Reason (required)" error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>
    </div>
  );
};

export default InductionPanel;
