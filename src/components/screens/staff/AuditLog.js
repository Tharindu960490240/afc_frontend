import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import CustomSnackbar from "../CustomSnackbar";
import { Pager, formatDateTime } from "../admin/shared";
import { ChangeDetail, auditText } from "./comsShared";
import { getHomeRoute } from "../../../const/roles";
import { listAudit } from "../../../services/comsService";

const PAGE_SIZE = 25;
const ENTITIES = [
  { key: "", label: "Everything" },
  { key: "agent", label: "Agent register" },
  { key: "holiday", label: "Public holidays" },
  { key: "invitation", label: "Invitations" },
  { key: "user", label: "User accounts" },
  { key: "agreement", label: "Agreements" },
];

const AuditLog = ({ role }) => {
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    const res = await listAudit({ entity_type: entity, from, to, page, limit: PAGE_SIZE });
    if (id !== latest.current) return;
    setLoading(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else setSnackbar({ open: true, message: res.message || "Could not load the audit log.", severity: "error" });
  }, [entity, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Audit log</h1>
        <p>Every change is recorded with who made it, when, and the old and new values. Entries cannot be edited or deleted.</p>
      </div>

      <section className="admin-panel">
        <div className="filter-controls" style={{ marginBottom: 14 }}>
          <select className="admin-input" aria-label="Area" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
            {ENTITIES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          <input className="admin-input" type="date" aria-label="From date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <input className="admin-input" type="date" aria-label="To date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="When">{formatDateTime(r.created_at)}</td>
                  <td data-label="Who">
                    {r.actor_first_name ? `${r.actor_first_name} ${r.actor_last_name}` : "System"}
                    {r.ip && <div className="cell-sub">{r.ip}</div>}
                  </td>
                  <td data-label="What">
                    <span className="cell-main">{auditText(r.action)}</span>
                    {r.entity_type === "agent" && r.entity_id && (
                      <div className="cell-sub">
                        <Link className="admin-link" to={`/coms/agents/${r.entity_id}`}>Open agent</Link>
                      </div>
                    )}
                    <ChangeDetail before={r.before} after={r.after} metadata={r.metadata} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="admin-empty">{loading ? "Loading..." : "Nothing recorded for this view."}</div>}
        </div>
        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loading} onChange={setPage} />
      </section>
      <CustomSnackbar {...snackbar} onClose={handleClose} />
    </div>
  );
};

export default AuditLog;
