import React, { useState } from "react";
import { formatDate, FormDialog } from "../admin/shared";
import { cancelInduction, completeInduction, recordInduction, rescheduleInduction } from "../../../services/comsService";
import { Btn, Field, Notice, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const MODES = [
  { value: "online", label: "Online" },
  { value: "in_person", label: "In person" },
  { value: "phone", label: "By phone" },
];
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));
const STATUS_LABEL = { scheduled: "Scheduled", held: "Held", cancelled: "Cancelled" };
const ELIGIBLE = ["approved", "onboarding", "active", "under_review"];
const today = () => new Date().toLocaleDateString("en-CA");

// Record, schedule and review the agent's induction (Phase 3). Recording it is one of the three things BR-02 needs before Active.
const InductionPanel = ({ agent, staff, currentUserId, onChanged, showMessage }) => {
  const [dialog, setDialog] = useState(null); // "held" | "schedule" | "complete" | "reschedule" | "cancel"
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [, setBusy] = useState(false);

  const list = agent.inductions || [];
  const scheduled = list.find((i) => i.status === "scheduled");
  const held = list.filter((i) => i.status === "held");
  const can = agent.permissions?.recordInduction && ELIGIBLE.includes(agent.status) && !agent.deleted_at;
  if (!ELIGIBLE.includes(agent.status) && list.length === 0) return null;

  const staffOptions = (staff || []).map((s) => ({ value: String(s.id), label: `${s.first_name} ${s.last_name}`.trim() }));
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const open = (name, initial, row = null) => { setForm(initial); setErrors({}); setTarget(row); setDialog(name); };
  const close = () => setDialog(null);
  const base = () => ({ conducted_by: String(currentUserId || ""), mode: "online", attendees: "", notes: "" });

  const submit = async (call, ok) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) { close(); showMessage(ok); onChanged(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Something went wrong.", "error"); }
  };
  const payload = () => ({
    conducted_by: form.conducted_by ? Number(form.conducted_by) : undefined,
    mode: form.mode,
    attendees: (form.attendees || "").trim() || undefined,
    notes: (form.notes || "").trim() || undefined,
  });
  const onSubmit = () => {
    if (dialog === "held") {
      if (!form.held_on) return setErrors({ held_on: "Choose the date the induction was held" });
      if (!(form.notes || "").trim()) return setErrors({ notes: "Add a note about what was covered" });
      return submit(() => recordInduction(agent.id, { outcome: "held", held_on: form.held_on, ...payload() }), "Induction recorded.");
    }
    if (dialog === "schedule") {
      if (!form.scheduled_for) return setErrors({ scheduled_for: "Choose the date" });
      return submit(() => recordInduction(agent.id, { outcome: "scheduled", scheduled_for: form.scheduled_for, ...payload() }), "Induction scheduled. The agent has been emailed.");
    }
    if (dialog === "complete") {
      if (!form.held_on) return setErrors({ held_on: "Choose the date the induction was held" });
      if (!(form.notes || "").trim()) return setErrors({ notes: "Add a note about what was covered" });
      return submit(() => completeInduction(agent.id, target.id, { held_on: form.held_on, ...payload() }), "Induction recorded.");
    }
    if (dialog === "reschedule") {
      if (!form.scheduled_for) return setErrors({ scheduled_for: "Choose the date" });
      const p = payload();
      return submit(() => rescheduleInduction(agent.id, target.id, { scheduled_for: form.scheduled_for, conducted_by: p.conducted_by, mode: p.mode }), "Induction moved. The agent has been emailed.");
    }
    if ((form.reason || "").trim().length < 3) return setErrors({ reason: "Please give a reason" });
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

      {scheduled && (
        <Notice severity="info" sx={{ mb: 2 }}>
          Scheduled for {formatDate(scheduled.scheduled_for)} ({MODE_LABEL[scheduled.mode]}), run by {scheduled.conducted_by_name || "no one yet"}.
          {scheduled.scheduled_for < today() ? " The date has passed: record the outcome or move it." : ""}
        </Notice>
      )}

      {can && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: list.length ? 20 : 0 }}>
          {scheduled ? (
            <>
              <Btn kind="primary" size="medium" onClick={() => open("complete", { ...base(), conducted_by: String(scheduled.conducted_by || currentUserId || ""), mode: scheduled.mode, held_on: scheduled.scheduled_for > today() ? today() : scheduled.scheduled_for }, scheduled)}>Record that it was held</Btn>
              <Btn size="medium" onClick={() => open("reschedule", { conducted_by: String(scheduled.conducted_by || ""), mode: scheduled.mode, scheduled_for: scheduled.scheduled_for >= today() ? scheduled.scheduled_for : today() }, scheduled)}>Change date</Btn>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{formatDate(i.held_on || i.scheduled_for)}</TableCell>
                  <TableCell>{STATUS_LABEL[i.status]}</TableCell>
                  <TableCell>{i.conducted_by_name || "-"}</TableCell>
                  <TableCell>{MODE_LABEL[i.mode] || "-"}</TableCell>
                  <TableCell style={{ whiteSpace: "pre-wrap" }}>
                    {i.status === "cancelled" ? `Cancelled: ${i.cancel_reason || ""}` : i.notes || "-"}
                    {i.attendees ? `\nAttended: ${i.attendees}` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FormDialog
        open={dialog === "held" || dialog === "complete"}
        title="Record induction"
        intro="Record when the induction was held, who ran it and what was covered. This is needed before the agent can become Active."
        submitLabel="Record"
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
        title={dialog === "reschedule" ? "Change the induction date" : "Schedule induction"}
        intro="The agent is emailed the date, and the person running it is reminded the day before."
        submitLabel={dialog === "reschedule" ? "Save" : "Schedule"}
        onSubmit={onSubmit}
        onCancel={close}
      >
        {dateField("in-sched", "scheduled_for", "Date", errors.scheduled_for, today())}
        {whoField}
        {modeField}
      </FormDialog>
      <FormDialog open={dialog === "cancel"} title="Cancel this induction booking?" submitLabel="Cancel booking" danger onSubmit={onSubmit} onCancel={close}>
        <Field id="in-reason" label="Reason (required)" error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>
    </div>
  );
};

export default InductionPanel;
