import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import CustomSnackbar from "../CustomSnackbar";
import { ExportButton, Pager, StatusBadge, formatDate } from "./shared";
import { Btn, DataTable, Panel, TabBar, TableCell, TableRow } from "../../ui";
import { exportAgreements, listAgreements, downloadAgreementFile } from "../../../services/agreementService";
import { getHomeRoute } from "../../../const/roles";

const PAGE_SIZE = 10;

const TABS = [
  { key: "", label: "All" },
  { key: "submitted", label: "Needs countersigning" },
  { key: "sent", label: "Waiting for agent" },
  { key: "rejected", label: "Changes requested" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

const Agreements = ({ role }) => {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoadingList(true);
    const res = await listAgreements({ status, page, limit: PAGE_SIZE });
    if (id !== latest.current) return;
    setLoadingList(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      setSnackbar({ open: true, message: res.message || "Could not load agreements.", severity: "error" });
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Agreements</h1>
        <p>
          Agreements waiting for you to countersign are listed first.{" "}
          <Link className="admin-link" to="/admin/agreements/template">Edit agreement template</Link>
        </p>
      </div>

      <Panel>
        <div className="admin-toolbar">
          <TabBar
            label="Agreement status"
            value={status || "all"}
            onChange={(v) => {
              setStatus(v === "all" ? "" : v);
              setPage(1);
            }}
            tabs={TABS.map((t) => ({ value: t.key || "all", label: t.label }))}
          />
          <ExportButton
            run={() => exportAgreements({ status })}
            onError={(m) => setSnackbar({ open: true, message: m, severity: "error" })}
          />
        </div>

        <DataTable
          label="Agreements"
          head={["Agent", "Agreement", "Status", "Sent", "Expires", { label: "Actions" }]}
          isEmpty={!rows.length}
          emptyText={loadingList ? "Loading agreements..." : "No agreements here yet. Send one from the Agents page."}
        >
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell data-label="Agent">
                <div className="cell-main">
                  {a.agent_first_name} {a.agent_last_name}
                </div>
                <div className="cell-sub">{a.agency_name || a.agent_email}</div>
              </TableCell>
              <TableCell data-label="Agreement">{a.title}</TableCell>
              <TableCell data-label="Status">
                <StatusBadge status={a.status} />
              </TableCell>
              <TableCell data-label="Sent">{formatDate(a.sent_at)}</TableCell>
              <TableCell data-label="Expires">{a.expires_at ? formatDate(a.expires_at) : "-"}</TableCell>
              <TableCell data-label="">
                <div className="cell-actions">
                  {a.final_file_id && (
                    <Btn
                      onClick={async () => {
                        const r = await downloadAgreementFile(a.id, {
                          id: a.final_file_id,
                          original_name: `AGR-${String(a.id).padStart(5, "0")} signed.pdf`,
                        });
                        if (!r.success)
                          setSnackbar({ open: true, message: r.message || "Could not download the file.", severity: "error" });
                      }}
                    >
                      Download PDF
                    </Btn>
                  )}
                  <Btn component={Link} to={`/admin/agreements/${a.id}`}>
                    {a.status === "submitted" ? "Countersign" : "View"}
                  </Btn>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>

        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loadingList} onChange={setPage} />
      </Panel>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
    </div>
  );
};

export default Agreements;
