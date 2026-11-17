import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import { formatDate } from "../admin/shared";
import { getMyInduction } from "../../../services/comsService";
import { getHomeRoute } from "../../../const/roles";
import { Btn, Notice, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const MODE_LABEL = { online: "Online", in_person: "In person", phone: "By phone" };

// The agent's own induction: when it is, who runs it and how to join, plus past sessions.
const MyInduction = ({ role }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getMyInduction().then((res) => setData(res.success ? res.data : { eligible: false, scheduled: null, history: [] }));
  }, []);

  const s = data && data.scheduled;
  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>
      <div className="admin-head">
        <h1>My induction</h1>
        <p>Your induction with the college covers how we work with agents and how to submit student applications.</p>
      </div>

      {!data && <div className="admin-panel admin-empty">Loading...</div>}

      {data && !data.eligible && (
        <div className="admin-panel admin-empty">
          <strong style={{ display: "block", marginBottom: 6 }}>Not available yet</strong>
          Your induction is arranged after the college approves your application. We will email you the date and how to join.
        </div>
      )}

      {data && data.eligible && (
        <>
          {data.recorded_at && <Notice severity="success" sx={{ mb: 2 }}>Your induction was completed on {formatDate(data.recorded_at)}.</Notice>}

          {s ? (
            <div className="app-card" style={{ marginBottom: 16 }}>
              <div className="app-card-head"><strong>Your upcoming induction</strong></div>
              <div className="summary-grid" style={{ margin: "16px 0" }}>
                <div className="summary-item"><span>Date</span><strong>{formatDate(s.date)}</strong></div>
                <div className="summary-item"><span>Time</span><strong>{s.time || "To be confirmed"}</strong></div>
                <div className="summary-item"><span>How</span><strong>{MODE_LABEL[s.mode]}</strong></div>
                <div className="summary-item"><span>Run by</span><strong>{s.run_by || "-"}</strong></div>
              </div>
              {s.meeting_url && (
                <Btn kind="primary" size="medium" component="a" href={s.meeting_url} target="_blank" rel="noreferrer">Join the meeting</Btn>
              )}
              {s.location && <p style={{ margin: "8px 0 0" }}><strong>{s.mode === "phone" ? "We will call you on:" : "Where:"}</strong> {s.location}</p>}
              <p className="app-hint" style={{ margin: "14px 0 0" }}>Times are in the college's time zone. If the time does not suit you, please reply to the email we sent or contact your account manager.</p>
            </div>
          ) : (
            !data.recorded_at && (
              <div className="admin-panel admin-empty">
                <strong style={{ display: "block", marginBottom: 6 }}>No induction booked yet</strong>
                The college will book it with you and email the date and how to join. You will see it here as well.
              </div>
            )
          )}

          {data.history.length > 0 && (
            <>
              <h2>Past sessions</h2>
              <TableContainer className="admin-table-wrap">
                <Table className="admin-table">
                  <TableHead><TableRow><TableCell>Date</TableCell><TableCell>How</TableCell><TableCell>Run by</TableCell></TableRow></TableHead>
                  <TableBody>
                    {data.history.map((h) => (
                      <TableRow key={h.id}><TableCell>{formatDate(h.date)}</TableCell><TableCell>{MODE_LABEL[h.mode]}</TableCell><TableCell>{h.run_by || "-"}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyInduction;
