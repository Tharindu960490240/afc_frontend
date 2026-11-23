import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { formatDate } from "../admin/shared";
import { getFormConfig, listMyApplications, startApplication } from "../../../services/studentApplicationService";
import { getHomeRoute } from "../../../const/roles";
import { ListTable } from "../admin/ListKit";
import { Badge, Btn, Notice, TableCell, TableRow } from "../../ui";

export const STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  received: { label: "Received", tone: "info" },
  under_review: { label: "Under review", tone: "info" },
  info_requested: { label: "More information needed", tone: "warning" },
  decision_made: { label: "Decision made", tone: "success" },
  coe_issued: { label: "CoE issued", tone: "success" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

// The agent's list of the students they have put forward.
const StudentApplications = ({ role }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const load = useCallback(async () => {
    const [list, c] = await Promise.all([listMyApplications(), getFormConfig()]);
    setRows(list.success ? list.data : []);
    if (c.success) setCfg(c.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setBusy(true);
    const res = await startApplication();
    setBusy(false);
    if (res.success) navigate(`/agent/applications/${res.data.id}`);
    else setSnackbar({ open: true, message: res.message || "Could not start an application.", severity: "error" });
  };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Student applications</h1>
        <p>Submit the students you recommend to AFC. AFC replies within {cfg ? cfg.assessment_working_days : 5} working days of receiving a complete application.</p>
      </div>
      {cfg && !cfg.can_submit && <Notice severity="warning" sx={{ mb: 2 }}>{cfg.blocked_reason} You can start a draft once that is done.</Notice>}
      {!rows ? <LoadingSpinner /> : (
        <ListTable
          label="Student applications"
          head={["Reference", "Student", "Course", "Starts", "Status", ""]}
          rows={rows}
          emptyText="No applications yet."
          tabs={[
            { value: "all", label: "All" },
            { value: "draft", label: "Drafts", match: (r) => r.status === "draft" },
            { value: "open", label: "With AFC", match: (r) => ["received", "under_review"].includes(r.status) },
            { value: "info", label: "Needs your answer", match: (r) => r.status === "info_requested" },
            { value: "done", label: "Decided", match: (r) => ["decision_made", "coe_issued", "withdrawn"].includes(r.status) },
          ]}
          search={(r) => `${r.ref_no || ""} ${r.student} ${r.course || ""}`}
          searchPlaceholder="Student, course or reference"
          actions={<Btn kind="primary" size="medium" onClick={start} disabled={busy || !cfg || !cfg.can_submit}>New application</Btn>}
          renderRow={(r) => {
            const st = STATUS[r.status] || { label: r.status, tone: "neutral" };
            return (
              <TableRow key={r.id}>
                <TableCell>{r.ref_no || "-"}</TableCell>
                <TableCell><span className="cell-main">{r.student}</span></TableCell>
                <TableCell>{r.course || "-"}{r.campus ? <div className="cell-sub">{r.campus}</div> : null}</TableCell>
                <TableCell>{r.commencement_date ? formatDate(r.commencement_date) : "-"}</TableCell>
                <TableCell><Badge tone={st.tone} label={st.label} /></TableCell>
                <TableCell><Btn onClick={() => navigate(`/agent/applications/${r.id}`)}>{r.status === "draft" || r.status === "info_requested" ? "Continue" : "Open"}</Btn></TableCell>
              </TableRow>
            );
          }}
        />
      )}
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default StudentApplications;
