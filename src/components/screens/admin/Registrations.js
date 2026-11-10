import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { FormDialog, Pager, formatDate, formatDateTime } from "./shared";
import { Btn, DataTable, Field, Panel, TabBar, TableCell, TableRow } from "../../ui";
import {
  listRegistrations,
  getRegistrationCounts,
  approveRegistration,
  rejectRegistration,
} from "../../../services/registrationService";
import { getHomeRoute } from "../../../const/roles";

const PAGE_SIZE = 10;

const TABS = [
  { key: "pending_approval", label: "Waiting for approval" },
  { key: "unverified", label: "Email not confirmed" },
  { key: "rejected", label: "Rejected" },
];

// Agents who registered themselves from the college website.
const Registrations = ({ role }) => {
  const [tab, setTab] = useState("pending_approval");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoadingList(true);
    const [res, c] = await Promise.all([
      listRegistrations({ status: tab, page, limit: PAGE_SIZE }),
      getRegistrationCounts(),
    ]);
    if (id !== latest.current) return;
    setLoadingList(false);
    if (c.success) setCounts(c.data || {});
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      showMessage(res.message || "Could not load registrations.", "error");
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (r) => {
    setBusy(true);
    const res = await approveRegistration(r.id);
    setBusy(false);
    if (res.success) {
      showMessage(`${r.first_name} ${r.last_name} approved. They have been emailed.`);
      load();
    } else {
      showMessage(res.message || "Could not approve this registration.", "error");
    }
  };

  const confirmReject = async () => {
    setBusy(true);
    const res = await rejectRegistration(rejecting.id, reason.trim());
    setBusy(false);
    if (res.success) {
      setRejecting(null);
      showMessage("Registration rejected.");
      load();
    } else {
      showMessage(res.message || "Could not reject this registration.", "error");
    }
  };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Registrations</h1>
        <p>
          Agents who registered themselves from the college website. Approve them so they can sign in, then send their
          agreement from the Agents page.
        </p>
      </div>

      <Panel>
        <div className="admin-toolbar">
          <TabBar
            label="Registration status"
            value={tab}
            onChange={(v) => {
              setTab(v);
              setPage(1);
            }}
            tabs={TABS.map((t) => ({ value: t.key, label: `${t.label}${counts[t.key] ? ` (${counts[t.key]})` : ""}` }))}
          />
        </div>

        <DataTable
          label="Registrations"
          head={[
            "Agent",
            "Agency",
            "Country",
            "Registered",
            ...(tab === "rejected" ? ["Reason"] : []),
            { label: "Actions" },
          ]}
          isEmpty={!rows.length}
          emptyText={
            loadingList
              ? "Loading registrations..."
              : tab === "pending_approval"
                ? "Nobody is waiting for approval."
                : tab === "unverified"
                  ? "No registrations are waiting for an email confirmation."
                  : "No rejected registrations."
          }
        >
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell data-label="Agent">
                <div className="cell-main">
                  {r.first_name} {r.last_name}
                </div>
                <div className="cell-sub">
                  {r.email} · {r.phone}
                </div>
              </TableCell>
              <TableCell data-label="Agency">
                <div className="cell-main">{r.agency_name}</div>
                <div className="cell-sub">{r.business_number || "No business number"}</div>
              </TableCell>
              <TableCell data-label="Country">{r.country}</TableCell>
              <TableCell data-label="Registered">
                <div>{formatDate(r.created_at)}</div>
                <div className="cell-sub">
                  {r.email_verified_at ? `Email confirmed ${formatDateTime(r.email_verified_at)}` : "Email not confirmed"}
                </div>
              </TableCell>
              {tab === "rejected" && <TableCell data-label="Reason">{r.rejection_reason || "-"}</TableCell>}
              <TableCell data-label="">
                {r.status === "pending_approval" && (
                  <div className="cell-actions">
                    {r.agent_id && (
                      <Btn component={Link} to={`/coms/agents/${r.agent_id}`}>
                        View application
                      </Btn>
                    )}
                    <Btn kind="success" disabled={busy} onClick={() => approve(r)}>
                      Approve
                    </Btn>
                    <Btn
                      kind="danger"
                      disabled={busy}
                      onClick={() => {
                        setRejecting(r);
                        setReason("");
                      }}
                    >
                      Reject
                    </Btn>
                  </div>
                )}
                {r.status !== "pending_approval" && r.agent_id && (
                  <div className="cell-actions">
                    <Btn component={Link} to={`/coms/agents/${r.agent_id}`}>
                      View application
                    </Btn>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>

        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loadingList} onChange={setPage} />
      </Panel>

      <FormDialog
        open={Boolean(rejecting)}
        title="Reject this registration?"
        intro={rejecting ? `${rejecting.first_name} ${rejecting.last_name} will be told by email. They will not be able to sign in.` : ""}
        submitLabel="Reject"
        danger
        onSubmit={confirmReject}
        onCancel={() => setRejecting(null)}
      >
        <Field
          id="reg-reason"
          label="Note to the agent (optional)"
          multiline
          value={reason}
          inputProps={{ maxLength: 1000 }}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default Registrations;
