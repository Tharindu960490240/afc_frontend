import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import {
  FormDialog,
  Pager,
  StatusBadge,
  formatDate,
} from "./shared";
import { Btn, DataTable, Field, FilterField, Panel, TabBar, TableCell, TableRow } from "../../ui";
import { listAgents, sendAgreement } from "../../../services/agreementService";
import { getHomeRoute } from "../../../const/roles";

const PAGE_SIZE = 10;

const TABS = [
  { key: "", label: "All" },
  { key: "none", label: "No agreement" },
  { key: "sent", label: "Waiting for agent" },
  { key: "submitted", label: "Needs countersigning" },
  { key: "rejected", label: "Changes requested" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring soon" },
  { key: "expired", label: "Expired" },
];

const EMPTY_FORM = { title: "Education Agent Agreement", note: "", months: "12" };

const Agents = ({ role }) => {
  const [tab, setTab] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  const [target, setTarget] = useState(null); // agent we are sending to
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoadingList(true);
    const res = await listAgents({ agreement: tab, search, page, limit: PAGE_SIZE });
    if (id !== latest.current) return;
    setLoadingList(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      showMessage(res.message || "Could not load agents.", "error");
    }
  }, [tab, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openSend = (agent) => {
    setTarget(agent);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleSend = async () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = "Enter a title";
    setErrors(e);
    if (Object.keys(e).length) return;

    const data = {
      agent_id: target.id,
      title: form.title.trim(),
      validity_months: Number(form.months),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    };

    const agent = target;
    setSending(true);
    const res = await sendAgreement(data);
    setSending(false);

    if (res.success) {
      setTarget(null);
      showMessage(`Agreement sent to ${agent.first_name} ${agent.last_name}`);
      load();
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Could not send the agreement.", "error");
    }
  };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Agents</h1>
        <p>Send agreements to agents and see where each one is up to.</p>
      </div>

      <Panel>
        <div className="admin-toolbar">
          <TabBar
            label="Agreement status"
            value={tab || "all"}
            onChange={(v) => {
              setTab(v === "all" ? "" : v);
              setPage(1);
            }}
            tabs={TABS.map((t) => ({ value: t.key || "all", label: t.label }))}
          />
          <div className="filter-controls">
            <FilterField
              type="search"
              label="Search"
              placeholder="Name, email or agency"
              sx={{ minWidth: 240 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <DataTable
          label="Agents"
          head={["Agent", "Country", "Agreement", "Expires", { label: "Actions" }]}
          isEmpty={!rows.length}
          emptyText={
            loadingList
              ? "Loading agents..."
              : "No agents match this view. Invite agents from the Invitations page."
          }
        >
          {rows.map((a) => {
            const inProgress = ["sent", "submitted", "rejected"].includes(a.agreement_status);
            const soon = a.agreement_status === "active" && Number(a.days_left) <= 60;
            return (
              <TableRow key={a.id}>
                <TableCell data-label="Agent">
                  <Link className="cell-main cell-link" to={`/admin/agents/${a.id}`}>
                    {a.first_name} {a.last_name}
                  </Link>
                  <div className="cell-sub">
                    {a.agency_name ? `${a.agency_name} · ` : ""}
                    {a.email}
                  </div>
                </TableCell>
                <TableCell data-label="Country">{a.country || "-"}</TableCell>
                <TableCell data-label="Agreement">
                  <StatusBadge status={a.agreement_status} />
                </TableCell>
                <TableCell data-label="Expires">
                  {a.expires_at ? (
                    <>
                      {formatDate(a.expires_at)}
                      {a.agreement_status === "active" && (
                        <span className={`badge-days${soon ? " is-soon" : ""}`}>
                          {a.days_left} days
                        </span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell data-label="">
                  <div className="cell-actions">
                    <Btn component={Link} to={`/admin/agents/${a.id}`}>
                      Details
                    </Btn>
                    {!inProgress && (
                      <Btn onClick={() => openSend(a)}>
                        {a.agreement_status ? "Send renewal" : "Send agreement"}
                      </Btn>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>

        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loadingList} onChange={setPage} />
      </Panel>

      <FormDialog
        open={Boolean(target)}
        title="Send agreement"
        intro={
          target
            ? `The portal writes the agreement for ${target.first_name} ${target.last_name} from the agreement template, using their agency details. They get an email reminder to sign in; nothing is attached to the email.`
            : ""
        }
        submitLabel="Send agreement"
        onSubmit={handleSend}
        onCancel={() => setTarget(null)}
      >
        <p className="admin-hint" style={{ margin: 0 }}>
          To change the wording, <Link className="admin-link" to="/admin/agreements/template">edit the agreement template</Link> first.
        </p>

        <Field
          id="agr-title"
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={errors.title}
        />

        <Field
          id="agr-months"
          label="Valid for"
          value={form.months}
          onChange={(e) => setForm({ ...form, months: e.target.value })}
          helper="Counts from the start date you choose when you countersign it."
          options={[
            { value: "6", label: "6 months" },
            { value: "12", label: "12 months (1 year)" },
            { value: "24", label: "24 months" },
            { value: "36", label: "36 months" },
          ]}
        />

        <Field
          id="agr-note"
          label="Message to the agent (optional)"
          multiline
          value={form.note}
          inputProps={{ maxLength: 1000 }}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={sending} />
    </div>
  );
};

export default Agents;
