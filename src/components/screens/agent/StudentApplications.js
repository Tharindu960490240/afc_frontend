import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { formatDate } from "../admin/shared";
import { getFormConfig, listMyApplications, startApplication } from "../../../services/studentApplicationService";
import { getHomeRoute } from "../../../const/roles";
import { Badge, Btn, DataTable, Notice, Panel, TableCell, TableRow } from "../../ui";

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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn kind="primary" onClick={start} disabled={busy || !cfg || !cfg.can_submit}>New application</Btn>
      </div>
      {!rows ? <LoadingSpinner /> : (
        <Panel>
          <DataTable label="Student applications" head={["Reference", "Student", "Course", "Starts", "Status", ""]} isEmpty={!rows.length} emptyText="No applications yet.">
            {rows.map((r) => {
              const st = STATUS[r.status] || { label: r.status, tone: "neutral" };
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.ref_no || "-"}</TableCell>
                  <TableCell>{r.student}</TableCell>
                  <TableCell>{r.course || "-"}{r.campus ? <div className="admin-hint" style={{ margin: 0 }}>{r.campus}</div> : null}</TableCell>
                  <TableCell>{r.commencement_date ? formatDate(r.commencement_date) : "-"}</TableCell>
                  <TableCell><Badge tone={st.tone} label={st.label} /></TableCell>
                  <TableCell><Btn onClick={() => navigate(`/agent/applications/${r.id}`)}>{r.status === "draft" || r.status === "info_requested" ? "Continue" : "Open"}</Btn></TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </Panel>
      )}
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default StudentApplications;
