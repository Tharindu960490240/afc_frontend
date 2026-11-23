import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import { formatDate } from "../admin/shared";
import { staffQueue } from "../../../services/studentApplicationService";
import { getHomeRoute } from "../../../const/roles";
import { STATUS } from "../agent/StudentApplications";
import { ListTable } from "../admin/ListKit";
import { Badge, Btn, TableCell, TableRow } from "../../ui";

export const dueLabel = (r) => {
  if (r.days_left === null || r.days_left === undefined) return null;
  if (r.days_left < 0) return { tone: "danger", text: `${-r.days_left} working day${r.days_left === -1 ? "" : "s"} late` };
  if (r.days_left === 0) return { tone: "warning", text: "Due today" };
  return { tone: r.days_left <= 1 ? "warning" : "neutral", text: `${r.days_left} working day${r.days_left === 1 ? "" : "s"} left` };
};

// Every submitted student application, with the ones due soonest first.
const StudentApplicationQueue = ({ role }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const res = await staffQueue({});
    setData(res.success ? res.data : { rows: [], counts: {} });
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = (data && data.counts) || {};
  const waiting = (counts.received || 0) + (counts.under_review || 0);

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Student applications</h1>
        <p>Applications agents have submitted. AFC assesses each within 5 working days. {data ? `${waiting} waiting for a decision, ${counts.info_requested || 0} waiting for the agent.` : ""}</p>
      </div>
      {!data ? <LoadingSpinner /> : (
        <ListTable
          label="Student applications"
          head={["Reference", "Student", "Agent", "Course", "Status", "Due", ""]}
          rows={data.rows}
          emptyText="No applications yet."
          tabs={[
            { value: "all", label: "All" },
            { value: "open", label: `To assess${waiting ? ` (${waiting})` : ""}`, match: (r) => ["received", "under_review"].includes(r.status) },
            { value: "info", label: "Waiting for agent", match: (r) => r.status === "info_requested" },
            { value: "offer", label: "Offers and CoE", match: (r) => ["decision_made", "coe_issued"].includes(r.status) },
            { value: "closed", label: "Withdrawn", match: (r) => r.status === "withdrawn" },
          ]}
          search={(r) => `${r.ref_no} ${r.student} ${r.agent} ${r.course || ""}`}
          searchPlaceholder="Student, agent or reference"
          filters={[{ key: "look", label: "Flags", anyLabel: "Any", options: [{ value: "1", label: "Needs a closer look" }], match: (r) => r.late_submission || r.needs_transfer_review || r.wants_credit }]}
          renderRow={(r) => {
            const st = STATUS[r.status] || { label: r.status, tone: "neutral" };
            const due = dueLabel(r);
            return (
              <TableRow key={r.id} hover>
                <TableCell>{r.ref_no}</TableCell>
                <TableCell>
                  <span className="cell-main">{r.student}</span>
                  {(r.late_submission || r.needs_transfer_review || r.wants_credit) && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                      {r.late_submission && <Badge tone="warning" label="Late" />}
                      {r.needs_transfer_review && <Badge tone="warning" label="Transfer check" />}
                      {r.wants_credit && <Badge tone="info" label="Credit / RPL" />}
                    </div>
                  )}
                </TableCell>
                <TableCell>{r.agent}</TableCell>
                <TableCell>{r.course}{r.campus ? <div className="cell-sub">{r.campus}{r.commencement_date ? ` · starts ${formatDate(r.commencement_date)}` : ""}</div> : null}</TableCell>
                <TableCell><Badge tone={st.tone} label={st.label} /></TableCell>
                <TableCell>{due ? <Badge tone={due.tone} label={due.text} /> : (r.assessment_due ? formatDate(r.assessment_due) : "-")}</TableCell>
                <TableCell><Btn onClick={() => navigate(`/coms/applications/${r.id}`)}>Open</Btn></TableCell>
              </TableRow>
            );
          }}
        />
      )}
    </div>
  );
};

export default StudentApplicationQueue;
