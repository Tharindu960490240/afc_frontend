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
import { SearchBar, useDebounced } from "../admin/ListKit";
import { DataTable, FilterField, Panel, TabBar, TableCell, TableRow } from "../../ui";

const PAGE_SIZE = 25;
const ENTITIES = [
  { key: "", label: "Everything" },
  { key: "agent", label: "Agent register" },
  { key: "student_application", label: "Student applications" },
  { key: "agreement", label: "Agreements" },
  { key: "task", label: "Tasks" },
  { key: "user", label: "User accounts" },
  { key: "invitation", label: "Invitations" },
  { key: "course", label: "Courses" },
  { key: "holiday", label: "Public holidays" },
  { key: "file", label: "File downloads" },
];

const AuditLog = ({ role }) => {
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const search = useDebounced(searchText);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    const res = await listAudit({ entity_type: entity, from, to, search, page, limit: PAGE_SIZE });
    if (id !== latest.current) return;
    setLoading(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else setSnackbar({ open: true, message: res.message || "Could not load the audit log.", severity: "error" });
  }, [entity, from, to, search, page]);

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
        <div className="admin-toolbar">
          <TabBar
            label="Area"
            value={entity || "all"}
            onChange={(v) => { setEntity(v === "all" ? "" : v); setPage(1); }}
            tabs={ENTITIES.map((x) => ({ value: x.key || "all", label: x.label }))}
          />
        </div>
        <SearchBar value={searchText} onChange={(v) => { setSearchText(v); setPage(1); }} placeholder="Action, person or record number">
          <FilterField label="From date" type="date" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <FilterField label="To date" type="date" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <ExportButton
              run={() => exportAudit({ entity_type: entity, from, to, search })}
              onError={(m) => setSnackbar({ open: true, message: m, severity: "error" })}
            />
        </SearchBar>

        <DataTable label="Audit log" head={["When", "Who", "What"]} isEmpty={!rows.length} emptyText={loading ? "Loading..." : "Nothing recorded for this view."}>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDateTime(r.created_at)}</TableCell>
              <TableCell>
                {r.actor_first_name ? `${r.actor_first_name} ${r.actor_last_name}` : "System"}
                {r.ip && <div className="cell-sub">{r.ip}</div>}
              </TableCell>
              <TableCell>
                <span className="cell-main">{auditText(r.action)}</span>
                {r.entity_type === "agent" && r.entity_id && (
                  <div className="cell-sub">
                    <Link className="admin-link" to={`/coms/agents/${r.entity_id}`}>Open agent</Link>
                  </div>
                )}
                {r.entity_type === "student_application" && r.entity_id && (
                  <div className="cell-sub">
                    <Link className="admin-link" to={`/coms/applications/${r.entity_id}`}>Open application</Link>
                  </div>
                )}
                <ChangeDetail before={r.before} after={r.after} metadata={r.metadata} />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loading} onChange={setPage} />
      </Panel>
      <CustomSnackbar {...snackbar} onClose={handleClose} />
    </div>
  );
};

export default AuditLog;
