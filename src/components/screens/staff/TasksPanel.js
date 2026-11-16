import React, { useState } from "react";
import { Link } from "react-router-dom";

import { formatDate } from "../admin/shared";
import { CategoryBadge, CompleteTaskDialog, TaskDue } from "./taskShared";
import { downloadTaskEvidence } from "../../../services/comsService";
import { Btn, Notice, Panel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

// The onboarding and regulatory tasks of one agent (agent record, "Onboarding tasks" tab)
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
      <div className="admin-toolbar">
        <h2 style={{ margin: 0 }}>Onboarding and regulatory tasks</h2>
        <Btn component={Link} to={`/coms/tasks?agent_id=${agent.id}`}>Open the task board</Btn>
      </div>
      {tasks.length === 0 ? (
        <div className="admin-empty">
          {["approved", "prospect", "applied", "due_diligence"].includes(agent.status)
            ? "Tasks are created automatically when the agreement is countersigned: PRISMS, the ASQAnet notice, the website list and the induction."
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
