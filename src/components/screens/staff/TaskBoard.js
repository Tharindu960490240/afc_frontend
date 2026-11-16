import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { ExportButton, FormDialog, Pager, formatDate } from "../admin/shared";
import { CategoryBadge, CompleteTaskDialog, TaskDue, canWorkTask, isTaskManager } from "./taskShared";
import { getHomeRoute } from "../../../const/roles";
import {
  assignTask, cancelTask, createTask, downloadTaskEvidence, exportTasks, getTaskMeta, listTasks,
} from "../../../services/comsService";
import { Btn, DataTable, Field, FilterField, Panel, TableCell, TableRow } from "../../ui";

const PAGE_SIZE = 20;
const today = () => new Date().toLocaleDateString("en-CA");

// E5-2: the regulatory task board. Filter by type, owner, overdue and agent; export to CSV.
const TaskBoard = ({ role, user }) => {
  const [params, setParams] = useSearchParams();
  const agentId = params.get("agent_id") || "";
  const [filters, setFilters] = useState({ status: "open", type: "", owner: "", overdue: "", category: "", search: "" });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({ types: [], staff: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // "new" | "assign" | "cancel"
  const [target, setTarget] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = useCallback((message, severity = "success") => setSnackbar({ open: true, message, severity }), []);
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const manager = isTaskManager(role);
  const query = {
    status: filters.status, type: filters.type, owner: filters.owner, category: filters.category, search: filters.search.trim(),
    ...(filters.overdue ? { overdue: "true" } : {}), ...(agentId ? { agent_id: agentId } : {}),
  };

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    const res = await listTasks({ ...query, page, limit: PAGE_SIZE });
    if (id !== latest.current) return;
    setLoading(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else showMessage(res.message || "Could not load tasks.", "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, agentId, showMessage]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    getTaskMeta().then((r) => r.success && setMeta(r.data));
  }, []);

  const setFilter = (name) => (e) => {
    setFilters((f) => ({ ...f, [name]: e.target.value }));
    setPage(1);
  };
  const open = (name, t = null, initial = {}) => { setTarget(t); setForm(initial); setErrors({}); setDialog(name); };
  const close = () => setDialog(null);
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const run = async (call, ok) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) { close(); showMessage(ok); load(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Something went wrong.", "error"); }
  };

  const submitNew = () => {
    const e = {};
    if ((form.title || "").trim().length < 3) e.title = "Enter what needs to be done";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.due_date || "")) e.due_date = "Choose a due date";
    setErrors(e);
    if (Object.keys(e).length) return;
    run(() => createTask({
      type: form.type || "GENERAL", title: form.title.trim(), due_date: form.due_date, due_basis: "calendar",
      ...((form.description || "").trim() ? { description: form.description.trim() } : {}),
      ...(form.owner_id ? { owner_id: Number(form.owner_id) } : {}), ...(agentId ? { agent_id: agentId } : {}),
    }), "Task created.");
  };
  const submitAssign = () => {
    if (!form.owner_id) return setErrors({ owner_id: "Choose a person" });
    run(() => assignTask(target.id, Number(form.owner_id)), "Task reassigned.");
  };
  const submitCancel = () => {
    if ((form.reason || "").trim().length < 3) return setErrors({ reason: "Please give a reason" });
    run(() => cancelTask(target.id, form.reason.trim()), "Task cancelled.");
  };
  const evidence = async (t) => {
    const res = await downloadTaskEvidence(t.id, t.evidence?.name);
    if (!res.success) showMessage(res.message || "Could not download the file.", "error");
  };

  const staffOptions = meta.staff.map((m) => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }));

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>
      <div className="admin-head">
        <h1>Tasks</h1>
        <p>PRISMS, ASQAnet, website and induction tasks, with their deadlines and evidence. Working days skip weekends and Tasmanian and Victorian public holidays.</p>
      </div>

      <Panel>
        <div className="admin-toolbar">
          <div className="filter-controls">
            <FilterField id="tf-search" label="Search" value={filters.search} onChange={setFilter("search")} placeholder="Task or agent" />
            <FilterField id="tf-status" label="Status" value={filters.status} onChange={setFilter("status")}
              options={[{ value: "open", label: "Open" }, { value: "done", label: "Done" }, { value: "cancelled", label: "Cancelled" }, { value: "all", label: "All" }]} />
            <FilterField id="tf-type" label="Type" value={filters.type} onChange={setFilter("type")}
              options={[{ value: "", label: "All types" }, ...meta.types.map((t) => ({ value: t.key, label: t.label }))]} />
            <FilterField id="tf-owner" label="Owner" value={filters.owner} onChange={setFilter("owner")}
              options={[{ value: "", label: "Anyone" }, { value: "me", label: "Me" }, { value: "unassigned", label: "Unassigned" }, ...staffOptions]} />
            <FilterField id="tf-over" label="Deadline" value={filters.overdue} onChange={setFilter("overdue")}
              options={[{ value: "", label: "Any" }, { value: "yes", label: "Overdue only" }]} />
          </div>
          <div className="cell-actions" style={{ marginLeft: "auto" }}>
            <ExportButton run={() => exportTasks(query)} onError={(m) => showMessage(m, "error")} />
            <Btn kind="primary" size="medium" onClick={() => open("new", null, { type: "GENERAL", title: "", description: "", due_date: "", owner_id: "" })}>New task</Btn>
          </div>
        </div>
        {agentId && (
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Showing the tasks of one agent. <Btn kind="ghost" onClick={() => setParams({})}>Show all agents</Btn>
          </p>
        )}

        <DataTable
          head={["Task", "Type", "Owner", "Due", ""]}
          isEmpty={!loading && rows.length === 0}
          emptyText="No tasks match these filters."
        >
          {rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell data-label="Task">
                <strong>{t.title}</strong>
                {t.agent_id && <div className="cell-sub"><Link className="admin-link" to={`/coms/agents/${t.agent_id}`}>{t.agent_name}</Link></div>}
                {t.legal_deadline && <div className="cell-sub">Legal deadline {formatDate(t.legal_deadline)}</div>}
              </TableCell>
              <TableCell data-label="Type">
                <CategoryBadge task={t} />
                <div className="cell-sub">{t.type_label}</div>
              </TableCell>
              <TableCell data-label="Owner">{t.owner_name || "Unassigned"}</TableCell>
              <TableCell data-label="Due">
                <TaskDue task={t} />
                {t.escalated_at && t.status === "open" && <div className="cell-sub">Escalated to the manager</div>}
              </TableCell>
              <TableCell data-label="">
                <div className="cell-actions">
                  {t.evidence && <Btn onClick={() => evidence(t)}>Evidence</Btn>}
                  {t.status === "open" && canWorkTask(user, role, t) && <Btn kind="primary" onClick={() => setCompleting(t)}>Complete</Btn>}
                  {t.status === "open" && manager && <Btn onClick={() => open("assign", t, { owner_id: t.owner_id ? String(t.owner_id) : "" })}>Reassign</Btn>}
                  {t.status === "open" && manager && <Btn kind="danger" onClick={() => open("cancel", t, { reason: "" })}>Cancel</Btn>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
        <Pager page={page} limit={PAGE_SIZE} total={total} onChange={setPage} disabled={loading} />
      </Panel>

      <CompleteTaskDialog
        task={completing}
        open={Boolean(completing)}
        onClose={() => setCompleting(null)}
        onError={(m) => showMessage(m, "error")}
        onDone={() => { setCompleting(null); showMessage("Task completed."); load(); }}
      />

      <FormDialog open={dialog === "new"} title="New task" submitLabel="Create task" onSubmit={submitNew} onCancel={close}
        intro={agentId ? "This task is added to the agent you are viewing." : undefined}>
        <Field id="nt-title" label="What needs to be done" error={errors.title} value={form.title || ""} onChange={setField("title")} inputProps={{ maxLength: 200 }} />
        <div className="field-grid">
          <Field id="nt-type" label="Type" value={form.type || "GENERAL"} onChange={setField("type")}
            options={meta.types.filter((t) => t.category === "general" || manager || role === "coe_admin").map((t) => ({ value: t.key, label: t.label }))} />
          <Field id="nt-due" label="Due date" type="date" InputLabelProps={{ shrink: true }} error={errors.due_date} value={form.due_date || ""} onChange={setField("due_date")} inputProps={{ min: today() }} />
          <Field id="nt-owner" wide label="Owner" helper="Leave empty to use the usual owner for this type." error={errors.owner_id} value={form.owner_id || ""} onChange={setField("owner_id")}
            options={[{ value: "", label: "Usual owner" }, ...staffOptions]} />
        </div>
        <Field id="nt-desc" label="Details (optional)" multiline value={form.description || ""} onChange={setField("description")} inputProps={{ maxLength: 2000 }} />
      </FormDialog>

      <FormDialog open={dialog === "assign"} title="Reassign task" intro={target?.title} submitLabel="Reassign" onSubmit={submitAssign} onCancel={close}>
        <Field id="as-owner" label="New owner" error={errors.owner_id} value={form.owner_id || ""} onChange={setField("owner_id")} options={[{ value: "", label: "Choose..." }, ...staffOptions]} />
      </FormDialog>

      <FormDialog open={dialog === "cancel"} title="Cancel this task?" intro={target?.title} submitLabel="Cancel task" danger onSubmit={submitCancel} onCancel={close}>
        <Field id="cn-reason" label="Reason (required)" multiline error={errors.reason} value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default TaskBoard;
