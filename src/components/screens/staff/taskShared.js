import React, { useEffect, useState } from "react";
import { FormDialog, formatDate } from "../admin/shared";
import { Badge, Btn, Field } from "../../ui";
import { MAX_FILE_MB, completeTask, fileToPayload } from "../../../services/comsService";

// "Overdue", "Due today", "Due 12 Nov 2026", "Done 12 Nov 2026"
export const TaskDue = ({ task }) => {
  if (task.status === "done") return <Badge tone="success" label={`Done ${formatDate(task.completed_at)}`} />;
  if (task.status === "cancelled") return <Badge tone="quiet" label="Cancelled" />;
  if (task.overdue) return <Badge tone="danger" label={`Overdue · was ${formatDate(task.due_date)}`} />;
  if (task.due_today) return <Badge tone="warning" label="Due today" />;
  return <Badge tone="neutral" label={`Due ${formatDate(task.due_date)}`} />;
};

export const CategoryBadge = ({ task }) => (
  <Badge tone={task.category === "regulatory" ? "info" : "quiet"} label={task.category === "regulatory" ? "Regulatory" : "General"} />
);

// Finish a task. Regulatory tasks need a file or a note saying what was done.
export const CompleteTaskDialog = ({ task, open, onClose, onDone, onError }) => {
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setNote(""); setFile(null); setErrors({}); }
  }, [open, task]);

  if (!task) return null;
  const regulatory = task.category === "regulatory";

  const submit = async () => {
    const e = {};
    if (regulatory && !file && note.trim().length < 3) e.note = "Add evidence (a file) or a note saying what was done";
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) e.file = `The file is too large. The limit is ${MAX_FILE_MB} MB.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    let payload;
    try {
      payload = file ? await fileToPayload(file) : undefined;
    } catch (err) {
      setBusy(false);
      return setErrors({ file: "Could not read the file." });
    }
    const res = await completeTask(task.id, { ...(note.trim() ? { note: note.trim() } : {}), ...(payload ? { file: payload } : {}) });
    setBusy(false);
    if (res.success) onDone(res.data);
    else {
      if (res.errors) setErrors(res.errors);
      onError(res.message || "Could not complete the task.");
    }
  };

  return (
    <FormDialog
      open={open}
      title={`Complete: ${task.title}`}
      intro={
        task.type === "PRISMS_ADD" ? "Confirm the agent is entered in PRISMS. Attach a screenshot or the confirmation if you have one."
          : task.type === "INDUCTION" ? "Confirm the induction was held. Once the agreement, PRISMS and induction are all recorded the agent becomes Active."
            : regulatory ? "Add the evidence for this regulatory task." : "Add a note if you wish."
      }
      submitLabel={busy ? "Saving..." : "Mark as done"}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Field id="tk-note" label={regulatory ? "What was done (or attach a file)" : "Note (optional)"} multiline error={errors.note} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 2000 }} />
      <div className="dd-file">
        <label htmlFor="tk-file">Evidence file {regulatory ? "" : "(optional)"}</label>
        <input id="tk-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.eml,.msg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <small className={errors.file ? "is-error" : ""}>{errors.file || (file ? file.name : `PDF, JPG, PNG, DOCX, XLSX, EML or MSG, up to ${MAX_FILE_MB} MB`)}</small>
      </div>
    </FormDialog>
  );
};

export { Btn };

// Mirrors the server: the owner, the role the task belongs to, or management may finish a task.
export const canWorkTask = (user, role, task) =>
  (user && task.owner_id === user.id) ||
  ["admin", "director", "ceo", "compliance"].includes(role) ||
  (["coe_admin", "marketing_officer"].includes(role) && task.owner_role === role);
export const isTaskManager = (role) => ["admin", "director", "ceo", "compliance"].includes(role);
