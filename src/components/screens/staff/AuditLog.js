import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import CustomSnackbar from "../CustomSnackbar";
import { ExportButton, Pager, formatDateTime } from "../admin/shared";
import { ChangeDetail, auditText } from "./comsShared";
import { getHomeRoute } from "../../../const/roles";
import { exportAudit, listAudit } from "../../../services/comsService";
import { FilterField, Panel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

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

      <Panel>
        <div className="filter-controls" style={{ marginBottom: 14 }}>
          <FilterField
            label="Area"
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
            options={ENTITIES.map((x) => ({ value: x.key, label: x.label }))}
          />
          <FilterField
            label="From date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
          <FilterField
            label="To date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
          <ExportButton
            run={() => exportAudit({ entity_type: entity, from, to })}
            onError={(m) => setSnackbar({ open: true, message: m, severity: "error" })}
          />
        </div>

        <TableContainer className="admin-table-wrap">
          <Table className="admin-table">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Who</TableCell>
                <TableCell>What</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell data-label="When">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell data-label="Who">
                    {r.actor_first_name ? `${r.actor_first_name} ${r.actor_last_name}` : "System"}
                    {r.ip && <div className="cell-sub">{r.ip}</div>}
                  </TableCell>
                  <TableCell data-label="What">
                    <span className="cell-main">{auditText(r.action)}</span>
                    {r.entity_type === "agent" && r.entity_id && (
                      <div className="cell-sub">
                        <Link className="admin-link" to={`/coms/agents/${r.entity_id}`}>Open agent</Link>
                      </div>
                    )}
                    <ChangeDetail before={r.before} after={r.after} metadata={r.metadata} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!rows.length && <div className="admin-empty">{loading ? "Loading..." : "Nothing recorded for this view."}</div>}
        </TableContainer>
        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loading} onChange={setPage} />
      </Panel>
      <CustomSnackbar {...snackbar} onClose={handleClose} />
    </div>
  );
};

export default AuditLog;
