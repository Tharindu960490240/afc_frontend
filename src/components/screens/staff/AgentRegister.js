import TableSortLabel from "@mui/material/TableSortLabel";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { FormDialog, Pager, formatDate } from "../admin/shared";
import {
  AgentStatusBadge,
  SlaChip,
  STATUS_TABS,
  TIER_LABELS,
  RISK_LABELS,
  daysUntil,
} from "./comsShared";
import { COUNTRIES } from "../../../const/countries";
import { getHomeRoute } from "../../../const/roles";
import {
  createAgentRecord,
  exportAgentRecords,
  getAgentMeta,
  listAgentRecords,
} from "../../../services/comsService";
import { CheckField, Field, FilterField, TabBar, Btn, Panel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const PAGE_SIZE = 15;
const EMPTY = { legal_name: "", contact_name: "", email: "", phone: "", country: "", send_link: true };

const AgentRegister = ({ role }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [manager, setManager] = useState("");
  const [risk, setRisk] = useState("");
  const [tier, setTier] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [meta, setMeta] = useState({ staff: [], permissions: {} });

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    getAgentMeta().then((res) => res.success && setMeta(res.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const filters = { status: tab, search, manager, risk, tier };

  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoadingList(true);
    const res = await listAgentRecords({
      status: tab, search, manager, risk, tier,
      sort: sort.key, dir: sort.dir, page, limit: PAGE_SIZE,
    });
    if (id !== latest.current) return;
    setLoadingList(false);
    if (res.success) {
      setRows(res.data || []);
      setTotal(res.pagination?.total || 0);
    } else {
      showMessage(res.message || "Could not load the agent register.", "error");
    }
  }, [tab, search, manager, risk, tier, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const submit = async () => {
    const e = {};
    if (form.legal_name.trim().length < 2) e.legal_name = "Enter the agent's legal name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!form.country) e.country = "Choose a country";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const res = await createAgentRecord({
      legal_name: form.legal_name.trim(),
      email: form.email.trim(),
      country: form.country,
      ...(form.contact_name.trim() ? { contact_name: form.contact_name.trim() } : {}),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      send_link: form.send_link,
    });
    setBusy(false);

    if (res.success) {
      setAdding(false);
      showMessage(res.message || "Agent added.");
      navigate(`/coms/agents/${res.data.id}`);
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Could not add the agent.", "error");
    }
  };

  const doExport = async () => {
    setBusy(true);
    const res = await exportAgentRecords(filters);
    setBusy(false);
    if (!res.success) showMessage(res.message || "Could not export.", "error");
  };

  const sortBy = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "legal_name" ? "asc" : "desc" }));
  const sortable = (key, label) => (
    <TableCell sortDirection={sort.key === key ? sort.dir : false}>
      <TableSortLabel active={sort.key === key} direction={sort.key === key ? sort.dir : "asc"} onClick={() => sortBy(key)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Agent register</h1>
        <p>Every education agent, from first interest to renewal, in one place.</p>
      </div>

      <Panel>
        <div className="admin-toolbar">
          <TabBar
            label="Agent status"
            value={tab || "all"}
            onChange={(v) => {
              setTab(v === "all" ? "" : v);
              setPage(1);
            }}
            tabs={STATUS_TABS.map((t) => ({ value: t.key || "all", label: t.label }))}
          />
          <div className="action-row" style={{ marginTop: 0 }}>
            <Btn onClick={doExport} disabled={busy}>
              Export CSV
            </Btn>
            {meta.permissions.create && (
              <Btn kind="primary" size="medium"
                onClick={() => {
                  setForm(EMPTY);
                  setErrors({});
                  setAdding(true);
                }}
              >
                Add agent
              </Btn>
            )}
          </div>
        </div>

        <div className="filter-controls" style={{ marginBottom: 14 }}>
          <FilterField
            type="search"
            label="Search"
            placeholder="Name, email or ABN"
            sx={{ minWidth: 240 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <FilterField
            label="Account manager"
            value={manager}
            onChange={(e) => { setManager(e.target.value); setPage(1); }}
            options={[
              { value: "", label: "Any manager" },
              { value: "unassigned", label: "No manager yet" },
              ...meta.staff.map((m) => ({ value: m.id, label: `${m.first_name} ${m.last_name}` })),
            ]}
          />
          <FilterField
            label="Risk rating"
            value={risk}
            onChange={(e) => { setRisk(e.target.value); setPage(1); }}
            options={[{ value: "", label: "Any risk" }, ...Object.entries(RISK_LABELS).map(([k, v]) => ({ value: k, label: `${v} risk` }))]}
          />
          <FilterField
            label="Tier"
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            options={[{ value: "", label: "Any tier" }, ...Object.entries(TIER_LABELS).map(([k, v]) => ({ value: k, label: v }))]}
          />
        </div>

        <TableContainer className="admin-table-wrap">
          <Table className="admin-table">
            <TableHead>
              <TableRow>
                {sortable("legal_name", "Agent")}
                {sortable("country", "Country")}
                {sortable("status", "Status")}
                <TableCell>Manager</TableCell>
                {sortable("agreement_end", "Agreement ends")}
                <TableCell aria-label="Actions" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((a) => {
                const left = daysUntil(a.agreement_end);
                return (
                  <TableRow key={a.id}>
                    <TableCell data-label="Agent">
                      <Link className="cell-main cell-link" to={`/coms/agents/${a.id}`}>
                        {a.legal_name}
                      </Link>
                      <div className="cell-sub">{a.email}</div>
                    </TableCell>
                    <TableCell data-label="Country">{a.country}</TableCell>
                    <TableCell data-label="Status">
                      <AgentStatusBadge status={a.status} />
                      {a.decision_state && (
                        <div style={{ marginTop: 6 }}>
                          <SlaChip state={a.decision_state} daysLeft={a.working_days_left} />
                        </div>
                      )}
                      {a.prisms_missing.length > 0 && ["prospect", "applied", "due_diligence"].includes(a.status) && (
                        <div className="cell-sub">{a.prisms_missing.length} PRISMS detail{a.prisms_missing.length === 1 ? "" : "s"} missing</div>
                      )}
                    </TableCell>
                    <TableCell data-label="Manager">
                      {a.account_manager_name || "-"}
                      {a.tier && <div className="cell-sub">{TIER_LABELS[a.tier]}</div>}
                    </TableCell>
                    <TableCell data-label="Agreement ends">
                      {a.agreement_end ? (
                        <>
                          {formatDate(a.agreement_end)}
                          <span className={`badge-days${left !== null && left <= 60 ? " is-soon" : ""}`}>
                            {left < 0 ? "ended" : `${left} days`}
                          </span>
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell data-label="">
                      <div className="cell-actions">
                        <Btn component={Link}  to={`/coms/agents/${a.id}`}>
                          Open
                        </Btn>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!rows.length && (
            <div className="admin-empty">
              {loadingList ? "Loading agents..." : "No agents match this view."}
            </div>
          )}
        </TableContainer>

        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loadingList} onChange={setPage} />
      </Panel>

      <FormDialog
        open={adding}
        title="Add an agent"
        intro="Record an expression of interest. The agent gets an email with a link to create their portal account and start the application."
        submitLabel="Add agent"
        onSubmit={submit}
        onCancel={() => setAdding(false)}
      >
        <Field
          id="eoi-name"
          label="Agent / company legal name"
          value={form.legal_name}
          inputProps={{ maxLength: 200 }}
          onChange={setField("legal_name")}
          error={errors.legal_name}
        />
        <div className="field-grid">
          <Field
            id="eoi-contact"
            label="Contact person (optional)"
            value={form.contact_name}
            inputProps={{ maxLength: 50 }}
            onChange={setField("contact_name")}
          />
          <Field id="eoi-email" label="Email" type="email" value={form.email} onChange={setField("email")} error={errors.email} />
          <Field
            id="eoi-country"
            label="Country"
            value={form.country}
            onChange={setField("country")}
            error={errors.country}
            options={[{ value: "", label: "Choose a country" }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
          />
          <Field id="eoi-phone" label="Phone (optional)" value={form.phone} onChange={setField("phone")} error={errors.phone} />
        </div>
        <CheckField
          checked={form.send_link}
          onChange={(send_link) => setForm({ ...form, send_link })}
          label="Email the application link now"
        />
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default AgentRegister;
