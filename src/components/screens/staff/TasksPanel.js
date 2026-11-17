import React, { useState } from "react";
import { Link } from "react-router-dom";

import { formatDate } from "../admin/shared";
import { CategoryBadge, CompleteTaskDialog, TaskDue } from "./taskShared";
import { downloadTaskEvidence, recordTerms } from "../../../services/comsService";
import { Btn, Field, Notice, Panel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

// The onboarding and regulatory tasks of one agent (agent record, "Onboarding tasks" tab)
const TermsBox = ({ agent, onChanged, showMessage }) => {
  const [form, setForm] = useState({ commission_terms: agent.commission_terms || "", bonus_terms: agent.bonus_terms || "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const can = agent.permissions?.sendAgreement && ["approved", "onboarding", "active"].includes(agent.status);
  const save = async () => {
    if (form.commission_terms.trim().length < 3) return setErrors({ commission_terms: "Describe the commission" });
    setErrors({});
    setBusy(true);
    const res = await recordTerms(agent.id, { commission_terms: form.commission_terms.trim(), bonus_terms: form.bonus_terms.trim() });
    setBusy(false);
    if (res.success) { showMessage(`Saved. ${res.data.accounts_notified ? "Accounts has been emailed." : "No Accounts user was found to email."}`); onChanged(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Could not save.", "error"); }
  };
  if (!["approved", "onboarding", "active"].includes(agent.status)) return null;
  return (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <div className="app-card-head"><strong>Commission and bonus</strong></div>
      <p className="app-hint">
        Record the commission and bonus agreed with this agent. Saving adds them to the agent list and emails AFC Accounts, which finishes the "report commission and bonus" task.
        {agent.terms_recorded_at ? ` Last saved ${formatDate(agent.terms_recorded_at)}.` : ""}
      </p>
      <div className="app-grid two">
        <Field id="tm-com" label="Commission" multiline rows={3} disabled={!can} error={errors.commission_terms} value={form.commission_terms}
          onChange={(e) => setForm((f) => ({ ...f, commission_terms: e.target.value }))} inputProps={{ maxLength: 2000 }} />
        <Field id="tm-bon" label="Bonus (if any)" multiline rows={3} disabled={!can} value={form.bonus_terms}
          onChange={(e) => setForm((f) => ({ ...f, bonus_terms: e.target.value }))} inputProps={{ maxLength: 2000 }} />
      </div>
      {can && <Btn kind="primary" size="medium" onClick={save} disabled={busy}>{agent.terms_recorded_at ? "Update and email Accounts" : "Save and email Accounts"}</Btn>}
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
