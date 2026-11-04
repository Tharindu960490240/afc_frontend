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
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");
  const sortable = (key, label) => (
    <th aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-sort" onClick={() => sortBy(key)}>
        {label}
        {arrow(key)}
      </button>
    </th>
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

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="filter-tabs" role="tablist">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key || "all"}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`filter-tab${tab === t.key ? " is-active" : ""}`}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="action-row" style={{ marginTop: 0 }}>
            <button type="button" className="row-btn" onClick={doExport} disabled={busy}>
              Export CSV
            </button>
            {meta.permissions.create && (
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  setForm(EMPTY);
                  setErrors({});
                  setAdding(true);
                }}
              >
                Add agent
              </button>
            )}
          </div>
        </div>

        <div className="filter-controls" style={{ marginBottom: 14 }}>
          <input
            className="admin-input is-search"
            type="search"
            placeholder="Search name, email or ABN"
            aria-label="Search agents"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className="admin-input" aria-label="Account manager" value={manager} onChange={(e) => { setManager(e.target.value); setPage(1); }}>
            <option value="">Any manager</option>
            <option value="unassigned">No manager yet</option>
            {meta.staff.map((s) => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
          <select className="admin-input" aria-label="Risk rating" value={risk} onChange={(e) => { setRisk(e.target.value); setPage(1); }}>
            <option value="">Any risk</option>
            {Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v} risk</option>)}
          </select>
          <select className="admin-input" aria-label="Tier" value={tier} onChange={(e) => { setTier(e.target.value); setPage(1); }}>
            <option value="">Any tier</option>
            {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {sortable("legal_name", "Agent")}
                {sortable("country", "Country")}
                {sortable("status", "Status")}
                <th>Manager</th>
                {sortable("agreement_end", "Agreement ends")}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const left = daysUntil(a.agreement_end);
                return (
                  <tr key={a.id}>
                    <td data-label="Agent">
                      <Link className="cell-main cell-link" to={`/coms/agents/${a.id}`}>
                        {a.legal_name}
                      </Link>
                      <div className="cell-sub">{a.email}</div>
                    </td>
                    <td data-label="Country">{a.country}</td>
                    <td data-label="Status">
                      <AgentStatusBadge status={a.status} />
                      {a.decision_state && (
                        <div style={{ marginTop: 6 }}>
                          <SlaChip state={a.decision_state} daysLeft={a.working_days_left} />
                        </div>
                      )}
                      {a.prisms_missing.length > 0 && ["prospect", "applied", "due_diligence"].includes(a.status) && (
                        <div className="cell-sub">{a.prisms_missing.length} PRISMS detail{a.prisms_missing.length === 1 ? "" : "s"} missing</div>
                      )}
                    </td>
                    <td data-label="Manager">
                      {a.account_manager_name || "-"}
                      {a.tier && <div className="cell-sub">{TIER_LABELS[a.tier]}</div>}
                    </td>
                    <td data-label="Agreement ends">
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
                    </td>
                    <td data-label="">
                      <div className="cell-actions">
                        <Link className="row-btn" to={`/coms/agents/${a.id}`}>
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <div className="admin-empty">
              {loadingList ? "Loading agents..." : "No agents match this view."}
            </div>
          )}
        </div>

        <Pager page={page} limit={PAGE_SIZE} total={total} disabled={loadingList} onChange={setPage} />
      </section>

      <FormDialog
        open={adding}
        title="Add an agent"
        intro="Record an expression of interest. The agent gets an email with a link to create their portal account and start the application."
        submitLabel="Add agent"
        onSubmit={submit}
        onCancel={() => setAdding(false)}
      >
        <div className={`admin-field${errors.legal_name ? " has-error" : ""}`}>
          <label htmlFor="eoi-name">Agent / company legal name</label>
          <input id="eoi-name" value={form.legal_name} maxLength={200} onChange={setField("legal_name")} />
          {errors.legal_name && <span className="admin-error">{errors.legal_name}</span>}
        </div>
        <div className="field-grid">
          <div className="admin-field">
            <label htmlFor="eoi-contact">Contact person (optional)</label>
            <input id="eoi-contact" value={form.contact_name} maxLength={50} onChange={setField("contact_name")} />
          </div>
          <div className={`admin-field${errors.email ? " has-error" : ""}`}>
            <label htmlFor="eoi-email">Email</label>
            <input id="eoi-email" type="email" value={form.email} onChange={setField("email")} />
            {errors.email && <span className="admin-error">{errors.email}</span>}
          </div>
          <div className={`admin-field${errors.country ? " has-error" : ""}`}>
            <label htmlFor="eoi-country">Country</label>
            <select id="eoi-country" value={form.country} onChange={setField("country")}>
              <option value="">Choose a country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.country && <span className="admin-error">{errors.country}</span>}
          </div>
          <div className={`admin-field${errors.phone ? " has-error" : ""}`}>
            <label htmlFor="eoi-phone">Phone (optional)</label>
            <input id="eoi-phone" value={form.phone} onChange={setField("phone")} />
            {errors.phone && <span className="admin-error">{errors.phone}</span>}
          </div>
        </div>
        <label className="field-check">
          <input type="checkbox" checked={form.send_link} onChange={(e) => setForm({ ...form, send_link: e.target.checked })} />
          <span>Email the application link now</span>
        </label>
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default AgentRegister;
