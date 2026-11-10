import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { ConfirmDialog, StatusBadge, formatDate, formatDateTime } from "./shared";
import { getAgent, downloadAgreementFile } from "../../../services/agreementService";
import { setUserStatus } from "../../../services/adminService";
import { Badge, Btn, Panel, TONE_BY_STATUS, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const ACCOUNT_STATUS = {
  active: "Active",
  suspended: "Suspended",
  pending_approval: "Waiting for approval",
  unverified: "Email not confirmed",
  rejected: "Rejected",
};

// What each recorded action means, in plain words.
const ACTION_TEXT = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in attempt",
  "auth.login_blocked": "Sign-in blocked",
  "auth.password_changed": "Changed their password",
  "auth.reset_requested": "Asked for a password reset",
  "auth.password_reset": "Reset their password",
  "invitation.accepted": "Accepted the invitation and created the account",
  "agent.registered": "Registered from the website",
  "agent.registration_resent": "Asked for a new confirmation link",
  "agent.email_verified": "Confirmed their email",
  "agent.approved": "Registration approved",
  "agent.rejected": "Registration rejected",
  "user.status_changed": "Account status changed",
  "agreement.sent": "Agreement sent",
  "agreement.signed_by_agent": "Signed the agreement",
  "agreement.approved": "Agreement countersigned by the college",
  "agreement.rejected": "Agreement sent back",
  "agreement.cancelled": "Agreement cancelled",
  "agreement.file_downloaded": "Downloaded an agreement file",
  "agreement.pdf_viewed": "Opened an agreement PDF",
};
const actionText = (a) => ACTION_TEXT[a] || a.replace(/[._]/g, " ");

const Item = ({ label, children }) => (
  <div className="summary-item">
    <span>{label}</span>
    <strong>{children || "-"}</strong>
  </div>
);

const AgentDetail = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // "suspended" | "active"

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const load = useCallback(async () => {
    const res = await getAgent(id);
    setLoading(false);
    if (res.success) setAgent(res.data);
    else showMessage(res.message || "Could not load this agent.", "error");
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async () => {
    const status = confirm;
    setConfirm(null);
    setBusy(true);
    const res = await setUserStatus(agent.id, status);
    setBusy(false);
    if (res.success) {
      showMessage(status === "suspended" ? "Agent suspended." : "Agent reactivated.");
      load();
    } else {
      showMessage(res.message || "Could not change the status.", "error");
    }
  };

  const download = async (a) => {
    const res = await downloadAgreementFile(a.id, {
      id: a.final_file_id,
      original_name: `AGR-${String(a.id).padStart(5, "0")} signed.pdf`,
    });
    if (!res.success && res.message) showMessage(res.message, "error");
  };

  if (!agent) {
    return (
      <div className="admin-page">
        <Link to="/admin/agents" className="admin-back">
          <ArrowBack fontSize="small" /> Agents
        </Link>
        <div className="admin-panel admin-empty">{loading ? "Loading agent..." : "Agent not found."}</div>
        <CustomSnackbar {...snackbar} onClose={handleClose} />
      </div>
    );
  }

  const canToggle = ["active", "suspended"].includes(agent.status);
  const isActive = agent.status === "active";
  const locked = agent.locked_until && new Date(agent.locked_until) > new Date();
  const openAgreement = agent.agreements.find((a) => ["sent", "submitted", "rejected"].includes(a.status));

  return (
    <div className="admin-page">
      <Link to="/admin/agents" className="admin-back">
        <ArrowBack fontSize="small" /> Agents
      </Link>

      <div className="admin-head">
        <h1>
          {agent.first_name} {agent.last_name}
        </h1>
        <p>
          {agent.agency_name} · {agent.country}
        </p>
      </div>

      {/* ---------- account ---------- */}
      <Panel>
        <h2>Account</h2>
        <div className="summary-grid">
          <Item label="Status">
            <Badge tone={TONE_BY_STATUS[agent.status] || "neutral"} label={ACCOUNT_STATUS[agent.status] || agent.status} />
            {locked && <span className="badge-days is-soon">locked after failed sign-ins</span>}
          </Item>
          <Item label="Joined">{formatDate(agent.created_at)}</Item>
          <Item label="Last sign-in">{formatDateTime(agent.last_login_at)}</Item>
          <Item label="How they joined">
            {agent.registered_via === "website" ? "Registered on the website" : "Invited by the college"}
          </Item>
          {agent.invitation && (
            <Item label="Invited by">
              {agent.invitation.invited_by_first_name
                ? `${agent.invitation.invited_by_first_name} ${agent.invitation.invited_by_last_name}`
                : "-"}{" "}
              on {formatDate(agent.invitation.created_at)}
            </Item>
          )}
          {agent.registered_via === "website" && (
            <Item label="Email confirmed">{agent.email_verified_at ? formatDateTime(agent.email_verified_at) : "Not yet"}</Item>
          )}
          {agent.decided_at && (
            <Item label={agent.status === "rejected" ? "Rejected" : "Approved"}>
              {formatDate(agent.decided_at)}
              {agent.decided_by_first_name ? ` by ${agent.decided_by_first_name} ${agent.decided_by_last_name}` : ""}
            </Item>
          )}
          <Item label="Privacy consent">{agent.consent_at ? formatDate(agent.consent_at) : "Not recorded"}</Item>
        </div>
        {agent.rejection_reason && <p className="admin-hint" style={{ marginTop: 12 }}>Reason given: {agent.rejection_reason}</p>}

        <div className="action-row" style={{ marginTop: 18 }}>
          {openAgreement && (
            <Btn component={Link}  to={`/admin/agreements/${openAgreement.id}`}>
              Open agreement
            </Btn>
          )}
          {agent.status === "pending_approval" && (
            <Btn component={Link}  to="/admin/registrations">
              Registrations
            </Btn>
          )}
          {canToggle && (
            <Btn
              kind={isActive ? "danger" : "outline"}
              disabled={busy}
              onClick={() => setConfirm(isActive ? "suspended" : "active")}
            >
              {isActive ? "Suspend" : "Reactivate"}
            </Btn>
          )}
        </div>
      </Panel>

      {/* ---------- contact and business ---------- */}
      <Panel>
        <h2>Contact and business</h2>
        <div className="summary-grid">
          <Item label="Email">{agent.email}</Item>
          <Item label="Phone">{agent.phone}</Item>
          <Item label="Agency">{agent.agency_name}</Item>
          <Item label="Business number">{agent.business_number}</Item>
          <Item label="Country">{agent.country}</Item>
          <Item label="Students submitted">{String(agent.students)}</Item>
        </div>
      </Panel>

      {/* ---------- agreements ---------- */}
      <Panel>
        <h2>Agreements</h2>
        {agent.agreements.length === 0 ? (
          <div className="admin-empty">
            No agreement yet. Send one from the <Link className="admin-link" to="/admin/agents">Agents page</Link>.
          </div>
        ) : (
          <TableContainer className="admin-table-wrap">
            <Table className="admin-table">
              <TableHead>
                <TableRow>
                  <TableCell>Agreement</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell aria-label="Actions" />
                </TableRow>
              </TableHead>
              <TableBody>
                {agent.agreements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell data-label="Agreement">{a.title}</TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell data-label="Sent">{formatDate(a.sent_at)}</TableCell>
                    <TableCell data-label="Expires">{a.expires_at ? formatDate(a.expires_at) : "-"}</TableCell>
                    <TableCell data-label="">
                      <div className="cell-actions">
                        {a.final_file_id && (
                          <Btn onClick={() => download(a)}>
                            Download PDF
                          </Btn>
                        )}
                        <Btn component={Link}  to={`/admin/agreements/${a.id}`}>
                          View
                        </Btn>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>

      {/* ---------- activity ---------- */}
      <Panel>
        <h2>Recent activity</h2>
        {agent.activity.length === 0 ? (
          <div className="admin-empty">Nothing recorded yet.</div>
        ) : (
          <ul className="timeline">
            {agent.activity.map((e) => (
              <li key={e.id}>
                <strong>{actionText(e.action)}</strong>
                <span>
                  {formatDateTime(e.created_at)}
                  {e.actor_id && e.actor_id !== agent.id && e.actor_first_name
                    ? ` · by ${e.actor_first_name} ${e.actor_last_name}`
                    : ""}
                  {e.ip ? ` · ${e.ip}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === "suspended" ? "Suspend this agent?" : "Reactivate this agent?"}
        text={
          confirm === "suspended"
            ? `${agent.first_name} ${agent.last_name} will be signed out and will not be able to sign in until you reactivate them.`
            : `${agent.first_name} ${agent.last_name} will be able to sign in again.`
        }
        confirmLabel={confirm === "suspended" ? "Suspend" : "Reactivate"}
        danger={confirm === "suspended"}
        onConfirm={changeStatus}
        onCancel={() => setConfirm(null)}
      />

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default AgentDetail;
