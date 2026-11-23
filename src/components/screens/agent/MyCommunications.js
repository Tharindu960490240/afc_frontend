import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import { formatDate, formatDateTime } from "../admin/shared";
import { getMyCommunications } from "../../../services/comsService";
import { getHomeRoute } from "../../../const/roles";
import { ListTable } from "../admin/ListKit";
import { Badge, TableCell, TableRow } from "../../ui";

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
      {data && (
        <ListTable
          label="Communications"
          head={["When", "Type", "From AFC", "Summary"]}
          rows={comms}
          emptyText="Nothing has been recorded yet."
          tabs={[
            { value: "all", label: "All" },
            { value: "to", label: "To you", match: (c) => c.direction !== "inbound" },
            { value: "from", label: "From you", match: (c) => c.direction === "inbound" },
          ]}
          search={(c) => `${c.subject || ""} ${c.summary || ""} ${c.staff_name || ""}`}
          searchPlaceholder="Subject, summary or staff member"
          filters={[{ key: "type", label: "Type", anyLabel: "Any type", options: [...new Set(comms.map((c) => c.type_label))].map((t) => ({ value: t, label: t })), match: (c, v) => c.type_label === v }]}
          renderRow={(c) => (
            <TableRow key={c.id}>
              <TableCell>{formatDateTime(c.occurred_at)}</TableCell>
              <TableCell>{c.type_label}<div className="cell-sub">{c.direction === "inbound" ? "From you" : "To you"}</div></TableCell>
              <TableCell>{c.staff_name || "AFC"}</TableCell>
              <TableCell style={{ whiteSpace: "pre-wrap", maxWidth: 560 }}>
                {c.subject && <strong style={{ display: "block" }}>{c.subject}</strong>}
                {c.summary.length > 600 ? `${c.summary.slice(0, 600)}...` : c.summary}
              </TableCell>
            </TableRow>
          )}
        />
      )}
      {training.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>Your training</h2>
          <ListTable
            label="Your training"
            head={["Date", "Training", "Given by"]}
            rows={training}
            search={(t) => `${t.title} ${t.delivered_by || ""}`}
            searchPlaceholder="Training or trainer"
            renderRow={(t, i) => (
              <TableRow key={t.id || `s${i}`}><TableCell>{formatDate(t.held_on)}</TableCell><TableCell>{t.title}</TableCell><TableCell>{t.delivered_by || "-"}</TableCell></TableRow>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default MyCommunications;
