import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { formatDate } from "../admin/shared";
import { CategoryBadge, CompleteTaskDialog, TaskDue } from "./taskShared";
import { downloadTaskEvidence, getTermsDraft, recordTerms, sendTerms } from "../../../services/comsService";
import { Btn, Field, Notice, Panel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

// The onboarding and regulatory tasks of one agent (agent record, "Onboarding tasks" tab)
const TermsBox = ({ agent, onChanged, showMessage }) => {
  const [form, setForm] = useState({
    vet: agent.commission_vet_pct ?? 35,
    elicos: agent.commission_elicos_pct ?? 30,
    bonus_terms: agent.bonus_terms || "",
  });
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const can = agent.permissions?.sendAgreement && ["approved", "onboarding", "active"].includes(agent.status);
  // a saved but unsent structure can be reviewed again after a reload
  useEffect(() => {
    if (can && agent.terms_recorded_at && !agent.terms_sent_at && !draft) getTermsDraft(agent.id).then((r) => r.success && setDraft(r.data));
  }, [can, agent.id, agent.terms_recorded_at, agent.terms_sent_at]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!["approved", "onboarding", "active"].includes(agent.status)) return null;

  const save = async () => {
    setErrors({});
    setBusy(true);
    const res = await recordTerms(agent.id, { vet_percent: Number(form.vet), elicos_percent: Number(form.elicos), bonus_terms: form.bonus_terms.trim() });
    setBusy(false);
    if (res.success) { setDraft(res.data.draft); showMessage("Saved. Check the email to Accounts below, then send it."); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Could not save.", "error"); }
  };
  const send = async () => {
    setBusy(true);
    const res = await sendTerms(agent.id, { subject: draft.subject, body: draft.body });
    setBusy(false);
    if (res.success) { showMessage("The email was sent to Accounts."); setDraft(null); onChanged(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Could not send.", "error"); }
  };
  return (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <div className="app-card-head"><strong>Commission (Schedule 1)</strong></div>
      <p className="app-hint" style={{ margin: "8px 0 0" }}>
        Record the commission structure for this agent. The usual rates are 35% for VET and 30% for ELICOS. Saving drafts an email to AFC Accounts for you to check and send;
        sending it finishes the "report commission" task.
        {agent.terms_sent_at ? ` Sent to Accounts on ${formatDate(agent.terms_sent_at)}.` : agent.terms_recorded_at ? ` Saved ${formatDate(agent.terms_recorded_at)}, not sent yet.` : ""}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, margin: "18px 0 16px" }}>
        <Field id="tm-vet" type="number" label="VET commission (%)" disabled={!can} error={errors.vet_percent} value={form.vet}
          onChange={(e) => setForm((f) => ({ ...f, vet: e.target.value }))} inputProps={{ min: 0, max: 100, step: "0.5" }} />
        <Field id="tm-eli" type="number" label="ELICOS commission (%)" disabled={!can} error={errors.elicos_percent} value={form.elicos}
          onChange={(e) => setForm((f) => ({ ...f, elicos: e.target.value }))} inputProps={{ min: 0, max: 100, step: "0.5" }} />
        <Field id="tm-bon" sx={{ gridColumn: "1 / -1" }} label="Bonus (if any)" multiline rows={2} disabled={!can} value={form.bonus_terms}
          onChange={(e) => setForm((f) => ({ ...f, bonus_terms: e.target.value }))} inputProps={{ maxLength: 2000 }} />
      </div>
      {can && <Btn kind="primary" size="medium" onClick={save} disabled={busy}>{agent.terms_recorded_at ? "Save and redraft the email" : "Save and draft the email"}</Btn>}
      {can && draft && (
        <div style={{ marginTop: 28, display: "grid", gap: 20 }}>
          <strong>Email to Accounts</strong>
          <div className="admin-hint" style={{ margin: "-10px 0 0" }}>
            To: {draft.to.length ? draft.to.map((p) => `${p.name} <${p.email}>`).join(", ") : "no active Accounts user found"}
          </div>
          <Field id="tm-sub" label="Subject" value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} inputProps={{ maxLength: 200 }} />
          <Field id="tm-body" label="Message" multiline rows={9} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} inputProps={{ maxLength: 5000 }} />
          <Btn kind="primary" size="medium" style={{ justifySelf: "start" }} onClick={send} disabled={busy || !draft.to.length}>Send to Accounts</Btn>
        </div>
      )}
    </div>
  );
};

const TasksPanel = ({ agent, canWork, onChanged, showMessage }) => {
  const [target, setTarget] = useState(null);
  const tasks = agent.tasks || [];
  const open = tasks.filter((t) => t.status === "open");

  const evidence = async (t) => {
    const res = await downloadTaskEvidence(t.id, t.evidence?.name);
    if (!res.success) showMessage(res.message || "Could not download the file.", "error");
  };

  return (
    <Panel>
      <TermsBox key={agent.terms_recorded_at || "new"} agent={agent} onChanged={onChanged} showMessage={showMessage} />
      <div className="admin-toolbar">
        <h2 style={{ margin: 0 }}>Onboarding and regulatory tasks</h2>
        <Btn component={Link} to={`/coms/tasks?agent_id=${agent.id}`}>Open the task board</Btn>
      </div>
      {tasks.length === 0 ? (
        <div className="admin-empty">
          {["approved", "prospect", "applied", "due_diligence"].includes(agent.status)
            ? "Tasks are created automatically when the agreement is countersigned: PRISMS, the ASQAnet notice, the website list, commission and bonus, and the induction."
            : "No tasks for this agent."}
        </div>
      ) : (
        <>
          {agent.status === "onboarding" && (
            <Notice severity="info" sx={{ mb: 2 }}>
              {open.length} task{open.length === 1 ? "" : "s"} still open. The agent becomes Active when the agreement, PRISMS and induction are all recorded.
            </Notice>
          )}
          <TableContainer className="admin-table-wrap">
            <Table className="admin-table">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell data-label="Task">
                      <strong>{t.title}</strong>
                      {t.description && t.status === "open" && <div className="cell-sub" style={{ whiteSpace: "pre-line" }}>{t.description}</div>}
                      {t.legal_deadline && <div className="cell-sub">Legal deadline {formatDate(t.legal_deadline)}</div>}
                      {t.status === "done" && t.completion_note && <div className="cell-sub">{t.completion_note}</div>}
                    </TableCell>
                    <TableCell data-label="Type"><CategoryBadge task={t} /></TableCell>
                    <TableCell data-label="Owner">{t.owner_name || "-"}</TableCell>
                    <TableCell data-label="Due">
                      <TaskDue task={t} />
                      {t.escalated_at && t.status === "open" && <div className="cell-sub">Escalated to the manager</div>}
                    </TableCell>
                    <TableCell data-label="">
                      <div className="cell-actions">
                        {t.evidence && <Btn onClick={() => evidence(t)}>Evidence</Btn>}
                        {t.status === "open" && canWork(t) && <Btn kind="primary" onClick={() => setTarget(t)}>Complete</Btn>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <CompleteTaskDialog
        task={target}
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onError={(m) => showMessage(m, "error")}
        onDone={() => { setTarget(null); showMessage("Task completed."); onChanged(); }}
      />
    </Panel>
  );
};

export default TasksPanel;
