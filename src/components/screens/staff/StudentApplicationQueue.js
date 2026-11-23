import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import { formatDate } from "../admin/shared";
import { staffQueue } from "../../../services/studentApplicationService";
import { getHomeRoute } from "../../../const/roles";
import { STATUS } from "../agent/StudentApplications";
import { Badge, Btn, CheckField, DataTable, Field, Panel, TableCell, TableRow } from "../../ui";

const FILTERS = [{ value: "", label: "All" }, ...Object.entries(STATUS).filter(([k]) => k !== "draft").map(([value, s]) => ({ value, label: s.label }))];

export const dueLabel = (r) => {
  if (r.days_left === null || r.days_left === undefined) return null;
  if (r.days_left < 0) return { tone: "danger", text: `${-r.days_left} working day${r.days_left === -1 ? "" : "s"} late` };
  if (r.days_left === 0) return { tone: "warning", text: "Due today" };
  return { tone: r.days_left <= 1 ? "warning" : "neutral", text: `${r.days_left} working day${r.days_left === 1 ? "" : "s"} left` };
};

// Every submitted student application, with the ones due soonest first.
const StudentApplicationQueue = ({ role }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [attention, setAttention] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const res = await staffQueue({ status, q: q.trim(), attention: attention ? "1" : "" });
    setData(res.success ? res.data : { rows: [], counts: {} });
  }, [status, q, attention]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const counts = (data && data.counts) || {};
  const waiting = (counts.received || 0) + (counts.under_review || 0);

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Student applications</h1>
        <p>Applications agents have submitted. AFC assesses each within 5 working days. {data ? `${waiting} waiting for a decision, ${counts.info_requested || 0} waiting for the agent.` : ""}</p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <div style={{ minWidth: 200 }}><Field label="Status" value={status} options={FILTERS} onChange={(e) => setStatus(e.target.value)} /></div>
        <div style={{ minWidth: 260 }}><Field label="Search student, agent or reference" value={q} onChange={(e) => setQ(e.target.value)} inputProps={{ maxLength: 100 }} /></div>
        <CheckField label="Needs a closer look" checked={attention} onChange={setAttention} />
      </div>
      {!data ? <LoadingSpinner /> : (
        <Panel>
          <DataTable label="Student applications" head={["Reference", "Student", "Agent", "Course", "Status", "Due", ""]} isEmpty={!data.rows.length} emptyText="No applications match.">
            {data.rows.map((r) => {
              const st = STATUS[r.status] || { label: r.status, tone: "neutral" };
              const due = dueLabel(r);
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.ref_no}</TableCell>
                  <TableCell>
                    {r.student}
                    {(r.late_submission || r.needs_transfer_review || r.wants_credit) && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                        {r.late_submission && <Badge tone="warning" label="Late" />}
                        {r.needs_transfer_review && <Badge tone="warning" label="Transfer check" />}
                        {r.wants_credit && <Badge tone="info" label="Credit / RPL" />}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{r.agent}</TableCell>
                  <TableCell>{r.course}{r.campus ? <div className="admin-hint" style={{ margin: 0 }}>{r.campus}{r.commencement_date ? ` · starts ${formatDate(r.commencement_date)}` : ""}</div> : null}</TableCell>
                  <TableCell><Badge tone={st.tone} label={st.label} /></TableCell>
                  <TableCell>{due ? <Badge tone={due.tone} label={due.text} /> : (r.assessment_due ? formatDate(r.assessment_due) : "-")}</TableCell>
                  <TableCell><Btn onClick={() => navigate(`/coms/applications/${r.id}`)}>Open</Btn></TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </Panel>
      )}
    </div>
  );
};

export default StudentApplicationQueue;
