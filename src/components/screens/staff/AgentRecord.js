import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { FormDialog, StatusBadge, formatDate, formatDateTime } from "../admin/shared";
import {
  AgentStatusBadge,
  ChangeDetail,
  PERSON_ROLE_LABELS,
  RISK_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  SlaChip,
  TIER_LABELS,
  auditText,
  daysUntil,
} from "./comsShared";
import { COUNTRIES } from "../../../const/countries";
import {
  addAgentPerson,
  changeAgentStatus,
  deleteAgentRecord,
  getAgentMeta,
  getAgentRecord,
  recordMilestone,
  removeAgentPerson,
  restoreAgentRecord,
  sendApplicationLink,
  updateAgentPerson,
  updateAgentRecord,
} from "../../../services/comsService";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "agreements", label: "Agreements" },
  { key: "history", label: "Status history" },
  { key: "activity", label: "Activity" },
];

const today = () => new Date().toLocaleDateString("en-CA");

const Item = ({ label, children }) => (
  <div className="summary-item">
    <span>{label}</span>
    <strong>{children || "-"}</strong>
  </div>
);

const Field = ({ id, label, error, children, wide }) => (
  <div className={`admin-field${error ? " has-error" : ""}${wide ? " is-wide" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {error && <span className="admin-error">{error}</span>}
  </div>
);

const detailForm = (a) => ({
  legal_name: a.legal_name || "",
  trading_names: (a.trading_names || []).join(", "),
  abn_acn: a.abn_acn || "",
  country: a.country || "",
  is_body_corporate: !!a.is_body_corporate,
  principal_address: a.principal_address || "",
  registered_office_address: a.registered_office_address || "",
  postal_address: a.postal_address || "",
  phone: a.phone || "",
  email: a.email || "",
  website: a.website || "",
  marn: a.marn || "",
});

const EMPTY_PERSON = { name: "", email: "", role: "staff", marn: "", involved_in_enrolments: false, location: "", is_primary_contact: false };

const AgentRecord = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [meta, setMeta] = useState({ staff: [], transitions: {}, permissions: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");

  const [dialog, setDialog] = useState(null); // "status" | "details" | "portfolio" | "person" | "delete" | "removePerson" | "milestone"
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [target, setTarget] = useState(null); // person being edited / removed

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const load = useCallback(async () => {
    const res = await getAgentRecord(id);
    setLoading(false);
    if (res.success) setAgent(res.data);
    else showMessage(res.message || "Could not load this agent.", "error");
  }, [id]);

  useEffect(() => {
    load();
    getAgentMeta().then((res) => res.success && setMeta(res.data));
  }, [load]);

  const open = (name, initial = {}, person = null) => {
    setForm(initial);
    setErrors({});
    setTarget(person);
    setDialog(name);
  };
  const close = () => setDialog(null);
  const setField = (name) => (e) => setForm({ ...form, [name]: e.target.value });
  const setCheck = (name) => (e) => setForm({ ...form, [name]: e.target.checked });

  // runs an API call, then closes the dialog and reloads on success
  const run = async (call, okMessage) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) {
      close();
      if (okMessage) showMessage(okMessage);
      load();
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Something went wrong.", "error");
    }
    return res;
  };

  if (!agent) {
    return (
      <div className="admin-page">
        <Link to="/coms/agents" className="admin-back">
          <ArrowBack fontSize="small" /> Agent register
        </Link>
        <div className="admin-panel admin-empty">{loading ? "Loading agent..." : "Agent not found."}</div>
        <CustomSnackbar {...snackbar} onClose={handleClose} />
      </div>
    );
  }

  const perms = agent.permissions || {};
  const deleted = Boolean(agent.deleted_at);
  const moves = (meta.transitions || {})[agent.status] || [];
  const hasLogin = agent.persons.some((p) => p.portal_user_id);
  const left = daysUntil(agent.agreement_end);
  const openApplication = ["prospect", "applied", "due_diligence"].includes(agent.status);
  const missing = [...(agent.prisms_missing || []), ...(agent.application_missing || [])];

  // ---------- actions ----------
  const submitStatus = () => {
    const move = moves.find((m) => m.to === form.status);
    const e = {};
    if (!move) e.status = "Choose a new status";
    else if (move.reason && form.reason.trim().length < 3) e.reason = "Please give a reason";
    setErrors(e);
    if (Object.keys(e).length) return;
    run(() => changeAgentStatus(agent.id, form.status, form.reason.trim()), "Status changed.");
  };

  const submitDetails = () => {
    const f = form;
    const e = {};
    if (f.legal_name.trim().length < 2) e.legal_name = "Enter the legal name";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email address";
    if (!f.country) e.country = "Choose a country";
    setErrors(e);
    if (Object.keys(e).length) return;

    const next = {
      legal_name: f.legal_name.trim(),
      trading_names: f.trading_names.split(",").map((x) => x.trim()).filter(Boolean),
      abn_acn: f.abn_acn.trim() || null,
      country: f.country,
      is_body_corporate: f.is_body_corporate,
      principal_address: f.principal_address.trim() || null,
      registered_office_address: f.registered_office_address.trim() || null,
      postal_address: f.postal_address.trim() || null,
      phone: f.phone.trim() || null,
      email: f.email.trim(),
      website: f.website.trim() || null,
      marn: f.marn.trim() || null,
    };
    const before = detailForm(agent);
    const patch = {};
    Object.keys(next).forEach((k) => {
      const old = k === "trading_names" ? agent.trading_names || [] : before[k] === "" ? null : before[k];
      if (JSON.stringify(old) !== JSON.stringify(next[k])) patch[k] = next[k];
    });
    if (!Object.keys(patch).length) return close();
    run(() => updateAgentRecord(agent.id, patch), "Details saved.");
  };

  const submitPortfolio = () => {
    const patch = {};
    const cur = {
      account_manager_id: agent.account_manager_id ? String(agent.account_manager_id) : "",
      tier: agent.tier || "",
      risk_rating: agent.risk_rating || "",
      contact_cadence_days: String(agent.contact_cadence_days),
    };
    if (form.account_manager_id !== cur.account_manager_id) patch.account_manager_id = form.account_manager_id ? Number(form.account_manager_id) : null;
    if (form.tier !== cur.tier) patch.tier = form.tier || null;
    if (form.risk_rating !== cur.risk_rating) {
      patch.risk_rating = form.risk_rating || null;
      patch.risk_override_reason = form.risk_override_reason.trim() || null;
      if (form.risk_rating && form.risk_override_reason.trim().length < 3) {
        setErrors({ risk_override_reason: "Please say why you are setting the risk rating" });
        return;
      }
    }
    const days = Number(form.contact_cadence_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setErrors({ contact_cadence_days: "Enter a number of days from 1 to 365" });
      return;
    }
    if (String(days) !== cur.contact_cadence_days) patch.contact_cadence_days = days;
    if (!Object.keys(patch).length) return close();
    run(() => updateAgentRecord(agent.id, patch), "Saved.");
  };

  const submitPerson = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter the person's name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    setErrors(e);
    if (Object.keys(e).length) return;
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      marn: form.marn.trim() || null,
      involved_in_enrolments: form.involved_in_enrolments,
      location: form.role === "sub_agent" ? form.location.trim() || null : null,
      is_primary_contact: form.is_primary_contact,
    };
    if (target) run(() => updateAgentPerson(agent.id, target.id, body), "Person saved.");
    else run(() => addAgentPerson(agent.id, body), "Person added.");
  };

  const submitDelete = () => {
    if (form.reason.trim().length < 3) return setErrors({ reason: "Please give a reason" });
    if (dialog === "removePerson") run(() => removeAgentPerson(agent.id, target.id, form.reason.trim()), "Person removed.");
    else run(() => deleteAgentRecord(agent.id, form.reason.trim()), "Agent deleted. An administrator can restore it.");
  };

  const submitMilestone = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setErrors({ date: "Choose a date" });
    run(() => recordMilestone(agent.id, form.type, form.date), form.type === "prisms" ? "PRISMS entry recorded." : "Induction recorded.");
  };

  const sendLink = async () => {
    setBusy(true);
    const res = await sendApplicationLink(agent.id);
    setBusy(false);
    showMessage(res.message || (res.success ? "Application link sent." : "Could not send the link."), res.success ? "success" : "error");
    if (res.success) load();
  };

  const restore = async () => {
    setBusy(true);
    const res = await restoreAgentRecord(agent.id);
    setBusy(false);
    if (res.success) {
      showMessage("Agent restored.");
      load();
    } else showMessage(res.message || "Could not restore.", "error");
  };

  // ---------- views ----------
  const sla = agent.sla;

  return (
    <div className="admin-page">
      <Link to="/coms/agents" className="admin-back">
        <ArrowBack fontSize="small" /> Agent register
      </Link>

      <div className="admin-head">
        <h1>{agent.legal_name}</h1>
        <div className="record-head">
          <AgentStatusBadge status={agent.status} />
          {agent.tier && <span className="badge badge-quiet">{TIER_LABELS[agent.tier]}</span>}
          {agent.risk_rating && <span className={`badge badge-risk-${agent.risk_rating}`}>{RISK_LABELS[agent.risk_rating]} risk</span>}
          <span className="cell-sub">
            {agent.country} · {agent.email}
          </span>
        </div>
      </div>

      {deleted && (
        <div className="admin-notice is-danger">
          <strong>This agent was deleted on {formatDate(agent.deleted_at)}</strong>
          Reason: {agent.delete_reason || "-"}. It is hidden from the register but nothing is lost.
        </div>
      )}

      {!deleted && openApplication && missing.length > 0 && (
        <div className="admin-notice is-warning">
          <strong>Still missing from the application</strong>
          An agent cannot be approved until these are recorded:
          <ul className="missing-list">
            {missing.map((m) => (
              <li key={m.key}>{m.label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- actions ---------- */}
      <section className="admin-panel">
        <h2>Actions</h2>
        <div className="action-row">
          {!deleted && perms.edit && (
            <button type="button" className="row-btn" onClick={() => open("details", detailForm(agent))}>
              Edit details
            </button>
          )}
          {!deleted && perms.portfolio && (
            <button
              type="button"
              className="row-btn"
              onClick={() =>
                open("portfolio", {
                  account_manager_id: agent.account_manager_id ? String(agent.account_manager_id) : "",
                  tier: agent.tier || "",
                  risk_rating: agent.risk_rating || "",
                  risk_override_reason: "",
                  contact_cadence_days: String(agent.contact_cadence_days),
                })
              }
            >
              Manager, tier and risk
            </button>
          )}
          {!deleted && moves.length > 0 && (
            <button type="button" className="row-btn" onClick={() => open("status", { status: moves[0].to, reason: "" })}>
              Change status
            </button>
          )}
          {!deleted && perms.create && ["prospect", "applied"].includes(agent.status) && !hasLogin && (
            <button type="button" className="row-btn" onClick={sendLink} disabled={busy}>
              Send application link
            </button>
          )}
          {!deleted && perms.recordPrisms && ["approved", "onboarding", "active", "under_review"].includes(agent.status) && (
            <button type="button" className="row-btn" onClick={() => open("milestone", { type: "prisms", date: today() })}>
              Record PRISMS entry
            </button>
          )}
          {!deleted && perms.recordInduction && ["approved", "onboarding", "active", "under_review"].includes(agent.status) && (
            <button type="button" className="row-btn" onClick={() => open("milestone", { type: "induction", date: today() })}>
              Record induction
            </button>
          )}
          {!deleted && perms.remove && (
            <button type="button" className="row-btn is-danger" onClick={() => open("delete", { reason: "" })}>
              Delete
            </button>
          )}
          {deleted && perms.restore && (
            <button type="button" className="row-btn is-success" onClick={restore} disabled={busy}>
              Restore
            </button>
          )}
        </div>
      </section>

      {/* ---------- tabs ---------- */}
      <div className="filter-tabs record-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`filter-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <section className="admin-panel">
            <h2>At a glance</h2>
            <div className="summary-grid">
              <Item label="Status">{STATUS_LABELS[agent.status]}</Item>
              <Item label="How they came to us">{SOURCE_LABELS[agent.source] || agent.source}</Item>
              <Item label="Account manager">{agent.account_manager_name}</Item>
              <Item label="Tier">{agent.tier ? TIER_LABELS[agent.tier] : null}</Item>
              <Item label="Risk rating">
                {agent.risk_rating ? RISK_LABELS[agent.risk_rating] : null}
              </Item>
              <Item label="Contact at least every">{`${agent.contact_cadence_days} days`}</Item>
              <Item label="Agreement ends">
                {agent.agreement_end ? (
                  <>
                    {formatDate(agent.agreement_end)}
                    <span className={`badge-days${left !== null && left <= 60 ? " is-soon" : ""}`}>
                      {left < 0 ? "ended" : `${left} days left`}
                    </span>
                  </>
                ) : null}
              </Item>
              <Item label="PRISMS entry">{agent.prisms_recorded_at ? formatDate(agent.prisms_recorded_at) : "Not recorded"}</Item>
              <Item label="Induction">{agent.induction_recorded_at ? formatDate(agent.induction_recorded_at) : "Not recorded"}</Item>
            </div>
            {agent.risk_override_reason && <p className="admin-hint" style={{ marginTop: 12 }}>Risk note: {agent.risk_override_reason}</p>}
            {agent.rejection_reason && <p className="admin-hint" style={{ marginTop: 12 }}>Reason for rejection: {agent.rejection_reason}</p>}
          </section>

          {sla && (
            <section className="admin-panel">
              <h2>Application timer</h2>
              <div className="summary-grid">
                <Item label="Received">{formatDate(sla.received_on)}</Item>
                <Item label="Acknowledgement">
                  <span className={`sla-chip ${sla.acknowledgement.state === "overdue" ? "is-overdue" : sla.acknowledgement.state === "done" ? "is-done" : ""}`}>
                    {sla.acknowledgement.state === "done"
                      ? `Sent ${formatDate(sla.acknowledgement.sent_at)}`
                      : sla.acknowledgement.state === "overdue"
                        ? `Overdue, was due ${formatDate(sla.acknowledgement.due)}`
                        : `Due ${formatDate(sla.acknowledgement.due)}`}
                  </span>
                </Item>
                <Item label="Decision due">
                  {formatDate(sla.decision.due)}
                  <div style={{ marginTop: 6 }}>
                    <SlaChip state={sla.decision.state} daysLeft={sla.decision.working_days_left} />
                  </div>
                </Item>
                <Item label="Working days since receipt">{String(sla.working_days_elapsed)}</Item>
              </div>
              <p className="admin-hint" style={{ marginTop: 12 }}>
                Working days skip weekends and Tasmanian and Victorian public holidays. The timer turns amber on working day 7 and red on day 10.
              </p>
            </section>
          )}

          <section className="admin-panel">
            <h2>Business details (PRISMS)</h2>
            <div className="summary-grid">
              <Item label="Legal name">{agent.legal_name}</Item>
              <Item label="Trading names">{(agent.trading_names || []).join(", ")}</Item>
              <Item label="ABN / ACN or registration no.">{agent.abn_acn}</Item>
              <Item label="Type">{agent.is_body_corporate ? "Body corporate" : "Individual or partnership"}</Item>
              <Item label="Principal place of business">{agent.principal_address}</Item>
              {agent.is_body_corporate && <Item label="Registered office">{agent.registered_office_address}</Item>}
              <Item label="Postal address">{agent.postal_address}</Item>
              <Item label="Phone">{agent.phone}</Item>
              <Item label="Email">{agent.email}</Item>
              <Item label="Website">{agent.website}</Item>
              <Item label="MARN">{agent.marn}</Item>
            </div>
          </section>

          <section className="admin-panel">
            <h2>Application declarations and referees</h2>
            {!agent.application_submitted_at && (
              <p className="admin-hint" style={{ marginTop: 0 }}>
                The agent has not completed the application form yet. They can do this from the portal, or you can record the details with them.
              </p>
            )}
            <div className="summary-grid">
              <Item label="Application submitted">{agent.application_submitted_at ? formatDate(agent.application_submitted_at) : "Not yet"}</Item>
              <Item label="Conflict of interest">
                {agent.coi_declared === null || agent.coi_declared === undefined
                  ? "Not declared"
                  : agent.coi_declared ? `Yes: ${agent.coi_details || ""}` : "None declared"}
              </Item>
              <Item label="Code of ethics">{agent.code_of_ethics_ack_at ? `Accepted ${formatDate(agent.code_of_ethics_ack_at)}` : "Not accepted"}</Item>
              <Item label="Information confirmed true">{agent.information_confirmed_at ? formatDate(agent.information_confirmed_at) : "Not confirmed"}</Item>
            </div>
            <h3 style={{ margin: "16px 0 6px", fontSize: 15 }}>Referees</h3>
            {(agent.referees || []).length === 0 ? (
              <div className="admin-empty" style={{ padding: 12 }}>No referees recorded. Two are needed before a decision.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Organisation</th><th>Email</th><th>Phone</th></tr>
                  </thead>
                  <tbody>
                    {agent.referees.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td><td>{r.organisation}</td><td>{r.email}</td><td>{r.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === "people" && (
        <section className="admin-panel">
          <div className="admin-toolbar">
            <h2 style={{ margin: 0 }}>People</h2>
            {!deleted && perms.edit && (
              <button type="button" className="admin-btn" onClick={() => open("person", EMPTY_PERSON)}>
                Add person
              </button>
            )}
          </div>
          {agent.is_body_corporate && !agent.persons.some((p) => p.role === "director" && p.active) && (
            <div className="admin-notice is-warning">At least one director is needed for a body corporate.</div>
          )}
          {agent.persons.length === 0 ? (
            <div className="admin-empty">No one is recorded yet. Add the directors and the staff who deal with student enrolments.</div>
          ) : (
            agent.persons.map((p) => (
              <div className="person-card" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.email}
                    {p.location ? ` · ${p.location}` : ""}
                  </small>
                  <div className="person-tags">
                    <span className="badge badge-quiet">{PERSON_ROLE_LABELS[p.role]}</span>
                    {p.is_primary_contact && <span className="badge badge-quiet">Main contact</span>}
                    {p.involved_in_enrolments && <span className="badge badge-quiet">Handles enrolments</span>}
                    {p.marn && <span className="badge badge-quiet">MARN {p.marn}</span>}
                    {p.portal_user_id && <span className="badge badge-st-active">Has a portal login</span>}
                  </div>
                </div>
                {!deleted && perms.edit && (
                  <div className="cell-actions">
                    <button
                      type="button"
                      className="row-btn"
                      onClick={() =>
                        open(
                          "person",
                          {
                            name: p.name, email: p.email, role: p.role, marn: p.marn || "",
                            involved_in_enrolments: p.involved_in_enrolments, location: p.location || "",
                            is_primary_contact: p.is_primary_contact,
                          },
                          p,
                        )
                      }
                    >
                      Edit
                    </button>
                    {!p.portal_user_id && (
                      <button type="button" className="row-btn is-danger" onClick={() => open("removePerson", { reason: "" }, p)}>
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {tab === "agreements" && (
        <section className="admin-panel">
          <h2>Agreements</h2>
          {agent.agreements.length === 0 ? (
            <div className="admin-empty">
              No agreement yet. Agreements are sent from the <Link className="admin-link" to="/admin/agents">Agents page</Link> once the agent has an account.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Agreement</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Starts</th>
                    <th>Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {agent.agreements.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Agreement">{a.title}</td>
                      <td data-label="Status"><StatusBadge status={a.display_status} /></td>
                      <td data-label="Sent">{formatDate(a.sent_at)}</td>
                      <td data-label="Starts">{formatDate(a.effective_date)}</td>
                      <td data-label="Ends">{formatDate(a.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="admin-hint" style={{ marginTop: 12 }}>
            {agent.has_signed_agreement
              ? "A fully signed agreement is in force."
              : "No fully signed agreement is in force. The agent cannot become Active until one is."}
          </p>
        </section>
      )}

      {tab === "history" && (
        <section className="admin-panel">
          <h2>Status history</h2>
          <ul className="timeline">
            {agent.history.map((h) => (
              <li key={h.id}>
                <strong>
                  {h.from_status ? `${STATUS_LABELS[h.from_status]} → ${STATUS_LABELS[h.to_status]}` : STATUS_LABELS[h.to_status]}
                </strong>
                <span>
                  {formatDateTime(h.changed_at)}
                  {h.by_first_name ? ` · by ${h.by_first_name} ${h.by_last_name}` : ""}
                </span>
                {h.reason && <p>{h.reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "activity" && (
        <section className="admin-panel">
          <h2>Activity</h2>
          {agent.activity.length === 0 ? (
            <div className="admin-empty">Nothing recorded yet.</div>
          ) : (
            <ul className="timeline">
              {agent.activity.map((e) => (
                <li key={e.id}>
                  <strong>{auditText(e.action)}</strong>
                  <span>
                    {formatDateTime(e.created_at)}
                    {e.actor_first_name ? ` · by ${e.actor_first_name} ${e.actor_last_name}` : ""}
                  </span>
                  <ChangeDetail before={e.before} after={e.after} metadata={e.metadata} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- dialogs ---------- */}
      <FormDialog
        open={dialog === "status"}
        title="Change status"
        intro={`Now: ${STATUS_LABELS[agent.status]}. Only moves you are allowed to make are listed. Approving or rejecting an application is done after due diligence (coming in the next part).`}
        submitLabel="Change status"
        onSubmit={submitStatus}
        onCancel={close}
      >
        <Field id="st-status" label="New status" error={errors.status}>
          <select id="st-status" value={form.status || ""} onChange={setField("status")}>
            {moves.map((m) => (
              <option key={m.to} value={m.to}>{STATUS_LABELS[m.to]}</option>
            ))}
          </select>
        </Field>
        <Field id="st-reason" label={moves.find((m) => m.to === form.status)?.reason ? "Reason (required)" : "Note (optional)"} error={errors.reason}>
          <textarea id="st-reason" value={form.reason || ""} maxLength={1000} onChange={setField("reason")} />
        </Field>
      </FormDialog>

      <FormDialog
        open={dialog === "details"}
        title="Edit business details"
        intro="These are the details the college must hold for PRISMS."
        submitLabel="Save"
        onSubmit={submitDetails}
        onCancel={close}
      >
        <div className="field-grid">
          <Field id="d-name" label="Legal name" error={errors.legal_name} wide>
            <input id="d-name" value={form.legal_name || ""} maxLength={200} onChange={setField("legal_name")} />
          </Field>
          <Field id="d-trading" label="Trading names (separate with commas)" wide>
            <input id="d-trading" value={form.trading_names || ""} onChange={setField("trading_names")} />
          </Field>
          <Field id="d-abn" label="ABN / ACN or business registration no." error={errors.abn_acn}>
            <input id="d-abn" value={form.abn_acn || ""} maxLength={40} onChange={setField("abn_acn")} />
          </Field>
          <Field id="d-country" label="Country" error={errors.country}>
            <select id="d-country" value={form.country || ""} onChange={setField("country")}>
              <option value="">Choose a country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <label className="field-check is-wide">
            <input type="checkbox" checked={!!form.is_body_corporate} onChange={setCheck("is_body_corporate")} />
            <span>This agent is a body corporate (company). A registered office and directors are then required.</span>
          </label>
          <Field id="d-principal" label="Principal place of business" error={errors.principal_address} wide>
            <textarea id="d-principal" value={form.principal_address || ""} maxLength={500} onChange={setField("principal_address")} />
          </Field>
          {form.is_body_corporate && (
            <Field id="d-office" label="Registered office address" error={errors.registered_office_address} wide>
              <textarea id="d-office" value={form.registered_office_address || ""} maxLength={500} onChange={setField("registered_office_address")} />
            </Field>
          )}
          <Field id="d-postal" label="Postal address (if different)" error={errors.postal_address} wide>
            <textarea id="d-postal" value={form.postal_address || ""} maxLength={500} onChange={setField("postal_address")} />
          </Field>
          <Field id="d-phone" label="Phone" error={errors.phone}>
            <input id="d-phone" value={form.phone || ""} onChange={setField("phone")} />
          </Field>
          <Field id="d-email" label="Email" error={errors.email}>
            <input id="d-email" type="email" value={form.email || ""} onChange={setField("email")} />
          </Field>
          <Field id="d-web" label="Website" error={errors.website}>
            <input id="d-web" placeholder="https://" value={form.website || ""} onChange={setField("website")} />
          </Field>
          <Field id="d-marn" label="MARN (migration agents only)" error={errors.marn}>
            <input id="d-marn" value={form.marn || ""} maxLength={20} onChange={setField("marn")} />
          </Field>
        </div>
      </FormDialog>

      <FormDialog
        open={dialog === "portfolio"}
        title="Account manager, tier and risk"
        submitLabel="Save"
        onSubmit={submitPortfolio}
        onCancel={close}
      >
        <div className="field-grid">
          <Field id="p-mgr" label="Account manager" error={errors.account_manager_id}>
            <select id="p-mgr" value={form.account_manager_id || ""} onChange={setField("account_manager_id")}>
              <option value="">No manager yet</option>
              {meta.staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </Field>
          <Field id="p-tier" label="Tier" error={errors.tier}>
            <select id="p-tier" value={form.tier || ""} onChange={setField("tier")}>
              <option value="">Not set</option>
              {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="p-risk" label="Risk rating" error={errors.risk_rating}>
            <select id="p-risk" value={form.risk_rating || ""} onChange={setField("risk_rating")}>
              <option value="">Not set</option>
              {Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="p-days" label="Contact at least every (days)" error={errors.contact_cadence_days}>
            <input id="p-days" inputMode="numeric" value={form.contact_cadence_days || ""} onChange={setField("contact_cadence_days")} />
          </Field>
          {form.risk_rating !== (agent.risk_rating || "") && form.risk_rating && (
            <Field id="p-why" label="Why this risk rating?" error={errors.risk_override_reason} wide>
              <textarea id="p-why" value={form.risk_override_reason || ""} maxLength={1000} onChange={setField("risk_override_reason")} />
            </Field>
          )}
        </div>
      </FormDialog>

      <FormDialog
        open={dialog === "person"}
        title={target ? "Edit person" : "Add a person"}
        submitLabel={target ? "Save" : "Add person"}
        onSubmit={submitPerson}
        onCancel={close}
      >
        <div className="field-grid">
          <Field id="pe-name" label="Name" error={errors.name}>
            <input id="pe-name" value={form.name || ""} maxLength={120} onChange={setField("name")} />
          </Field>
          <Field id="pe-email" label="Email" error={errors.email}>
            <input id="pe-email" type="email" value={form.email || ""} onChange={setField("email")} />
          </Field>
          <Field id="pe-role" label="Role" error={errors.role}>
            <select id="pe-role" value={form.role || "staff"} onChange={setField("role")}>
              {Object.entries(PERSON_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="pe-marn" label="MARN (if any)" error={errors.marn}>
            <input id="pe-marn" value={form.marn || ""} maxLength={20} onChange={setField("marn")} />
          </Field>
          {form.role === "sub_agent" && (
            <Field id="pe-loc" label="Location" error={errors.location} wide>
              <input id="pe-loc" value={form.location || ""} maxLength={160} onChange={setField("location")} />
            </Field>
          )}
          <label className="field-check is-wide">
            <input type="checkbox" checked={!!form.involved_in_enrolments} onChange={setCheck("involved_in_enrolments")} />
            <span>Involved in student enrolments (the college must record this person in PRISMS)</span>
          </label>
          <label className="field-check is-wide">
            <input type="checkbox" checked={!!form.is_primary_contact} onChange={setCheck("is_primary_contact")} />
            <span>Main contact for the college</span>
          </label>
        </div>
      </FormDialog>

      <FormDialog
        open={dialog === "delete" || dialog === "removePerson"}
        title={dialog === "removePerson" ? `Remove ${target?.name || "person"}?` : "Delete this agent?"}
        intro={
          dialog === "removePerson"
            ? "They are hidden from the record but kept for 7 years."
            : "The agent is hidden from the register. Nothing is erased and an administrator can restore it."
        }
        submitLabel={dialog === "removePerson" ? "Remove" : "Delete"}
        danger
        onSubmit={submitDelete}
        onCancel={close}
      >
        <Field id="del-reason" label="Reason (required)" error={errors.reason}>
          <textarea id="del-reason" value={form.reason || ""} maxLength={1000} onChange={setField("reason")} />
        </Field>
      </FormDialog>

      <FormDialog
        open={dialog === "milestone"}
        title={form.type === "prisms" ? "Record PRISMS entry" : "Record induction"}
        intro={
          form.type === "prisms"
            ? "Confirm the agent has been entered in PRISMS. This is needed before the agent can become Active."
            : "Confirm the induction session has been held. This is needed before the agent can become Active."
        }
        submitLabel="Record"
        onSubmit={submitMilestone}
        onCancel={close}
      >
        <Field id="ms-date" label="Date completed" error={errors.date}>
          <input id="ms-date" type="date" max={today()} value={form.date || ""} onChange={setField("date")} />
        </Field>
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default AgentRecord;
