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
import { Badge, Btn, CheckField, Field, Notice, Panel, TONE_BY_STATUS, TabBar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

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
          {agent.tier && <Badge tone="quiet" label={TIER_LABELS[agent.tier]} />}
          {agent.risk_rating && <Badge tone={TONE_BY_STATUS[agent.risk_rating]} label={`${RISK_LABELS[agent.risk_rating]} risk`} />}
          <span className="cell-sub">
            {agent.country} · {agent.email}
          </span>
        </div>
      </div>

      {deleted && (
        <Notice severity="error" sx={{ mb: 2 }}>
          <strong>This agent was deleted on {formatDate(agent.deleted_at)}</strong>
          Reason: {agent.delete_reason || "-"}. It is hidden from the register but nothing is lost.
        </Notice>
      )}

      {!deleted && openApplication && missing.length > 0 && (
        <Notice severity="warning" sx={{ mb: 2 }}>
          <strong>Still missing from the application</strong>
          An agent cannot be approved until these are recorded:
          <ul className="missing-list">
            {missing.map((m) => (
              <li key={m.key}>{m.label}</li>
            ))}
          </ul>
        </Notice>
      )}

      {/* ---------- actions ---------- */}
      <Panel>
        <h2>Actions</h2>
        <div className="action-row">
          {!deleted && perms.edit && (
            <Btn onClick={() => open("details", detailForm(agent))}>
              Edit details
            </Btn>
          )}
          {!deleted && perms.portfolio && (
            <Btn
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
            </Btn>
          )}
          {!deleted && moves.length > 0 && (
            <Btn onClick={() => open("status", { status: moves[0].to, reason: "" })}>
              Change status
            </Btn>
          )}
          {!deleted && perms.create && ["prospect", "applied"].includes(agent.status) && !hasLogin && (
            <Btn onClick={sendLink} disabled={busy}>
              Send application link
            </Btn>
          )}
          {!deleted && perms.recordPrisms && ["approved", "onboarding", "active", "under_review"].includes(agent.status) && (
            <Btn onClick={() => open("milestone", { type: "prisms", date: today() })}>
              Record PRISMS entry
            </Btn>
          )}
          {!deleted && perms.recordInduction && ["approved", "onboarding", "active", "under_review"].includes(agent.status) && (
            <Btn onClick={() => open("milestone", { type: "induction", date: today() })}>
              Record induction
            </Btn>
          )}
          {!deleted && perms.remove && (
            <Btn kind="danger"  onClick={() => open("delete", { reason: "" })}>
              Delete
            </Btn>
          )}
          {deleted && perms.restore && (
            <Btn kind="success"  onClick={restore} disabled={busy}>
              Restore
            </Btn>
          )}
        </div>
      </Panel>

      {/* ---------- tabs ---------- */}
      <div className="record-tabs">
        <TabBar label="Agent record sections" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t.key, label: t.label }))} />
      </div>

      {tab === "overview" && (
        <>
          <Panel>
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
          </Panel>

          {sla && (
            <Panel>
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
            </Panel>
          )}

          <Panel>
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
          </Panel>

          <Panel>
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
              <TableContainer className="admin-table-wrap">
                <Table className="admin-table">
                  <TableHead>
                    <TableRow><TableCell>Name</TableCell><TableCell>Organisation</TableCell><TableCell>Email</TableCell><TableCell>Phone</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {agent.referees.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell><TableCell>{r.organisation}</TableCell><TableCell>{r.email}</TableCell><TableCell>{r.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Panel>
        </>
      )}

      {tab === "people" && (
        <Panel>
          <div className="admin-toolbar">
            <h2 style={{ margin: 0 }}>People</h2>
            {!deleted && perms.edit && (
              <Btn kind="primary" size="medium"  onClick={() => open("person", EMPTY_PERSON)}>
                Add person
              </Btn>
            )}
          </div>
          {agent.is_body_corporate && !agent.persons.some((p) => p.role === "director" && p.active) && (
            <Notice severity="warning" sx={{ mb: 2 }}>At least one director is needed for a body corporate.</Notice>
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
                    <Badge tone="quiet" label={PERSON_ROLE_LABELS[p.role]} />
                    {p.is_primary_contact && <Badge tone="quiet" label="Main contact" />}
                    {p.involved_in_enrolments && <Badge tone="quiet" label="Handles enrolments" />}
                    {p.marn && <Badge tone="quiet" label={`MARN ${p.marn}`} />}
                    {p.portal_user_id && <Badge tone="success" label="Has a portal login" />}
                  </div>
                </div>
                {!deleted && perms.edit && (
                  <div className="cell-actions">
                    <Btn
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
                    </Btn>
                    {!p.portal_user_id && (
                      <Btn kind="danger"  onClick={() => open("removePerson", { reason: "" }, p)}>
                        Remove
                      </Btn>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </Panel>
      )}

      {tab === "agreements" && (
        <Panel>
          <h2>Agreements</h2>
          {agent.agreements.length === 0 ? (
            <div className="admin-empty">
              No agreement yet. Agreements are sent from the <Link className="admin-link" to="/admin/agents">Agents page</Link> once the agent has an account.
            </div>
          ) : (
            <TableContainer className="admin-table-wrap">
              <Table className="admin-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Agreement</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell>Starts</TableCell>
                    <TableCell>Ends</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agent.agreements.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell data-label="Agreement">{a.title}</TableCell>
                      <TableCell data-label="Status"><StatusBadge status={a.display_status} /></TableCell>
                      <TableCell data-label="Sent">{formatDate(a.sent_at)}</TableCell>
                      <TableCell data-label="Starts">{formatDate(a.effective_date)}</TableCell>
                      <TableCell data-label="Ends">{formatDate(a.expires_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <p className="admin-hint" style={{ marginTop: 12 }}>
            {agent.has_signed_agreement
              ? "A fully signed agreement is in force."
              : "No fully signed agreement is in force. The agent cannot become Active until one is."}
          </p>
        </Panel>
      )}

      {tab === "history" && (
        <Panel>
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
        </Panel>
      )}

      {tab === "activity" && (
        <Panel>
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
        </Panel>
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
        <Field
          id="st-status"
          label="New status"
          error={errors.status}
          value={form.status || ""}
          onChange={setField("status")}
          options={moves.map((m) => ({ value: m.to, label: STATUS_LABELS[m.to] }))}
        />
        <Field id="st-reason" label={moves.find((m) => m.to === form.status)?.reason ? "Reason (required)" : "Note (optional)"} error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
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
          <Field id="d-name" label="Legal name" error={errors.legal_name} wide value={form.legal_name || ""} onChange={setField("legal_name")} inputProps={{ maxLength: 200 }} />
          <Field id="d-trading" label="Trading names (separate with commas)" wide value={form.trading_names || ""} onChange={setField("trading_names")} />
          <Field id="d-abn" label="ABN / ACN or business registration no." error={errors.abn_acn} value={form.abn_acn || ""} onChange={setField("abn_acn")} inputProps={{ maxLength: 40 }} />
          <Field
            id="d-country"
            label="Country"
            error={errors.country}
            value={form.country || ""}
            onChange={setField("country")}
            options={[{ value: "", label: "Choose a country" }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
          />
          <CheckField wide checked={!!form.is_body_corporate} onChange={(v) => setForm((f) => ({ ...f, is_body_corporate: v }))} label="This agent is a body corporate (company). A registered office and directors are then required." />
          <Field id="d-principal" label="Principal place of business" error={errors.principal_address} wide multiline value={form.principal_address || ""} onChange={setField("principal_address")} inputProps={{ maxLength: 500 }} />
          {form.is_body_corporate && (
            <Field id="d-office" label="Registered office address" error={errors.registered_office_address} wide multiline value={form.registered_office_address || ""} onChange={setField("registered_office_address")} inputProps={{ maxLength: 500 }} />
          )}
          <Field id="d-postal" label="Postal address (if different)" error={errors.postal_address} wide multiline value={form.postal_address || ""} onChange={setField("postal_address")} inputProps={{ maxLength: 500 }} />
          <Field id="d-phone" label="Phone" error={errors.phone} value={form.phone || ""} onChange={setField("phone")} />
          <Field id="d-email" label="Email" error={errors.email} type="email" value={form.email || ""} onChange={setField("email")} />
          <Field id="d-web" label="Website" error={errors.website} placeholder="https://" value={form.website || ""} onChange={setField("website")} />
          <Field id="d-marn" label="MARN (migration agents only)" error={errors.marn} value={form.marn || ""} onChange={setField("marn")} inputProps={{ maxLength: 20 }} />
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
          <Field
            id="p-mgr"
            label="Account manager"
            error={errors.account_manager_id}
            value={form.account_manager_id || ""}
            onChange={setField("account_manager_id")}
            options={[{ value: "", label: "No manager yet" }, ...meta.staff.map((m) => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))]}
          />
          <Field
            id="p-tier"
            label="Tier"
            error={errors.tier}
            value={form.tier || ""}
            onChange={setField("tier")}
            options={[{ value: "", label: "Not set" }, ...Object.entries(TIER_LABELS).map(([k, v]) => ({ value: k, label: v }))]}
          />
          <Field
            id="p-risk"
            label="Risk rating"
            error={errors.risk_rating}
            value={form.risk_rating || ""}
            onChange={setField("risk_rating")}
            options={[{ value: "", label: "Not set" }, ...Object.entries(RISK_LABELS).map(([k, v]) => ({ value: k, label: v }))]}
          />
          <Field id="p-days" label="Contact at least every (days)" error={errors.contact_cadence_days} value={form.contact_cadence_days || ""} onChange={setField("contact_cadence_days")} inputProps={{ inputMode: "numeric" }} />
          {form.risk_rating !== (agent.risk_rating || "") && form.risk_rating && (
            <Field id="p-why" label="Why this risk rating?" error={errors.risk_override_reason} wide multiline value={form.risk_override_reason || ""} onChange={setField("risk_override_reason")} inputProps={{ maxLength: 1000 }} />
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
          <Field id="pe-name" label="Name" error={errors.name} value={form.name || ""} onChange={setField("name")} inputProps={{ maxLength: 120 }} />
          <Field id="pe-email" label="Email" error={errors.email} type="email" value={form.email || ""} onChange={setField("email")} />
          <Field
            id="pe-role"
            label="Role"
            error={errors.role}
            value={form.role || "staff"}
            onChange={setField("role")}
            options={Object.entries(PERSON_ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Field id="pe-marn" label="MARN (if any)" error={errors.marn} value={form.marn || ""} onChange={setField("marn")} inputProps={{ maxLength: 20 }} />
          {form.role === "sub_agent" && (
            <Field id="pe-loc" label="Location" error={errors.location} wide value={form.location || ""} onChange={setField("location")} inputProps={{ maxLength: 160 }} />
          )}
          <CheckField wide checked={!!form.involved_in_enrolments} onChange={(v) => setForm((f) => ({ ...f, involved_in_enrolments: v }))} label="Involved in student enrolments (the college must record this person in PRISMS)" />
          <CheckField wide checked={!!form.is_primary_contact} onChange={(v) => setForm((f) => ({ ...f, is_primary_contact: v }))} label="Main contact for the college" />
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
        <Field id="del-reason" label="Reason (required)" error={errors.reason} multiline value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
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
        <Field id="ms-date" label="Date completed" error={errors.date} type="date" InputLabelProps={{ shrink: true }} value={form.date || ""} onChange={setField("date")} inputProps={{ max: today() }} />
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default AgentRecord;
