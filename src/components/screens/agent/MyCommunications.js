import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import { formatDate, formatDateTime } from "../admin/shared";
import { getMyCommunications } from "../../../services/comsService";
import { getHomeRoute } from "../../../const/roles";
import { Badge, Notice, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const CA_LABEL = { sent: "Action needed", implemented: "Completed", not_implemented: "Not completed" };
const CA_TONE = { sent: "warning", implemented: "success", not_implemented: "danger" };

// What AFC has logged about its contact with this agent. Read only.
const MyCommunications = ({ role }) => {
  const [data, setData] = useState(null);
  useEffect(() => { getMyCommunications().then((res) => setData(res.success ? res.data : { communications: [], training: [], corrective_actions: [] })); }, []);
  const comms = (data && data.communications) || [];
  const training = (data && data.training) || [];
  const notices = (data && data.corrective_actions) || [];

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Communications</h1>
        <p>Everything AFC has recorded about its contact with you: calls, emails, meetings, updates and notices. You can read it here but not change it.</p>
      </div>
      {notices.length > 0 && (
        <div className="app-card" style={{ marginBottom: 20 }}>
          <strong>Notices</strong>
          {notices.map((n) => (
            <div key={n.id} style={{ margin: "10px 0 0", fontSize: 14 }}>
              <Badge tone={n.overdue ? "danger" : CA_TONE[n.status]} label={n.overdue ? "Overdue" : CA_LABEL[n.status]} /> {n.subject}
              <div className="app-hint" style={{ margin: "4px 0 0" }}>Sent {formatDate(n.sent_at)}. {n.status === "sent" ? `Please complete it by ${formatDate(n.due_date)}.` : ""}</div>
            </div>
          ))}
        </div>
      )}
      {data && comms.length === 0 ? <Notice severity="info">Nothing has been recorded yet.</Notice> : (
        <TableContainer className="admin-table-wrap">
          <Table className="admin-table">
            <TableHead><TableRow><TableCell>When</TableCell><TableCell>Type</TableCell><TableCell>From AFC</TableCell><TableCell>Summary</TableCell></TableRow></TableHead>
            <TableBody>
              {comms.map((c) => (
                <TableRow key={c.id}>
                  <TableCell data-label="When">{formatDateTime(c.occurred_at)}</TableCell>
                  <TableCell data-label="Type">{c.type_label}<div className="app-hint" style={{ margin: 0 }}>{c.direction === "inbound" ? "From you" : "To you"}</div></TableCell>
                  <TableCell data-label="From AFC">{c.staff_name || "AFC"}</TableCell>
                  <TableCell data-label="Summary" style={{ whiteSpace: "pre-wrap", maxWidth: 560 }}>
                    {c.subject && <strong style={{ display: "block" }}>{c.subject}</strong>}
                    {c.summary.length > 600 ? `${c.summary.slice(0, 600)}...` : c.summary}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {training.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>Your training</h2>
          <TableContainer className="admin-table-wrap">
            <Table className="admin-table">
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Training</TableCell><TableCell>Given by</TableCell></TableRow></TableHead>
              <TableBody>
                {training.map((t, i) => <TableRow key={t.id || `s${i}`}><TableCell data-label="Date">{formatDate(t.held_on)}</TableCell><TableCell data-label="Training">{t.title}</TableCell><TableCell data-label="Given by">{t.delivered_by || "-"}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
};

export default MyCommunications;
