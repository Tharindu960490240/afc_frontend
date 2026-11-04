import React from "react";

export const STATUS_LABELS = {
  prospect: "Prospect",
  applied: "Application received",
  due_diligence: "Due diligence",
  approved: "Approved",
  onboarding: "Onboarding",
  active: "Active",
  under_review: "Under review",
  suspended: "Suspended",
  expired: "Expired",
  terminated: "Terminated",
  rejected: "Rejected",
};

// Tabs on the register: each one is a group of statuses
export const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "prospect,applied,due_diligence", label: "Applications" },
  { key: "approved,onboarding", label: "Onboarding" },
  { key: "active", label: "Active" },
  { key: "under_review,suspended", label: "Needs attention" },
  { key: "expired,terminated,rejected", label: "Closed" },
];

export const TIER_LABELS = { strategic: "Strategic", growth: "Growth", standard: "Standard", dormant: "Dormant" };
export const RISK_LABELS = { low: "Low", medium: "Medium", high: "High" };
export const SOURCE_LABELS = {
  eoi: "Expression of interest",
  website: "Website registration",
  invitation: "Invitation",
  staff: "Entered by staff",
  import: "Imported",
};
export const PERSON_ROLE_LABELS = { director: "Director", staff: "Staff", sub_agent: "Sub-agent / branch" };

export const AgentStatusBadge = ({ status }) => (
  <span className={`badge badge-st-${status}`}>{STATUS_LABELS[status] || status}</span>
);

// "5 working days left", "Due today", "2 working days overdue"
export const decisionText = (state, daysLeft) => {
  if (state === "done") return "Decided";
  if (daysLeft === null || daysLeft === undefined) return "Timer running";
  if (daysLeft > 1) return `${daysLeft} working days left`;
  if (daysLeft === 1) return "1 working day left";
  if (daysLeft === 0) return "Due today";
  return `${Math.abs(daysLeft)} working day${daysLeft === -1 ? "" : "s"} overdue`;
};

export const SlaChip = ({ state, daysLeft }) => {
  if (!state) return null;
  const cls = state === "red" ? "is-red" : state === "amber" ? "is-amber" : state === "done" ? "is-done" : "";
  return <span className={`sla-chip ${cls}`}>{decisionText(state, daysLeft)}</span>;
};

// "Days left" for an agreement end date (YYYY-MM-DD)
export const daysUntil = (dateText) => {
  if (!dateText) return null;
  const [y, m, d] = String(dateText).split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
};

// Plain-words names for the audit log
export const AUDIT_TEXT = {
  "agent.created": "Agent added",
  "agent.updated": "Details changed",
  "agent.status_changed": "Status changed",
  "agent.deleted": "Agent deleted",
  "agent.restored": "Agent restored",
  "agent.application_link_sent": "Application link sent",
  "agent.person_added": "Person added",
  "agent.person_updated": "Person changed",
  "agent.person_removed": "Person removed",
  "agent.prisms_recorded": "PRISMS entry recorded",
  "agent.induction_recorded": "Induction recorded",
  "agent.exported": "Register exported",
  "agent.registered": "Registered from the website",
  "agent.email_verified": "Confirmed their email",
  "agent.approved": "Registration approved",
  "agent.rejected": "Registration rejected",
  "holiday.added": "Public holiday added",
  "holiday.removed": "Public holiday removed",
  "invitation.created": "Invitation sent",
  "invitation.resent": "Invitation re-sent",
  "invitation.revoked": "Invitation revoked",
  "invitation.accepted": "Invitation accepted",
  "user.status_changed": "Account status changed",
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in attempt",
  "agreement.sent": "Agreement sent",
  "agreement.signed_by_agent": "Agreement signed by the agent",
  "agreement.approved": "Agreement countersigned",
  "agreement.rejected": "Agreement sent back",
  "agreement.cancelled": "Agreement cancelled",
};
export const auditText = (a) => AUDIT_TEXT[a] || a.replace(/[._]/g, " ");

const FIELD_LABELS = {
  legal_name: "Legal name", trading_names: "Trading names", abn_acn: "ABN / ACN", country: "Country",
  is_body_corporate: "Body corporate", principal_address: "Principal address",
  registered_office_address: "Registered office", postal_address: "Postal address", phone: "Phone",
  email: "Email", website: "Website", marn: "MARN", account_manager_id: "Account manager", tier: "Tier",
  risk_rating: "Risk rating", risk_override_reason: "Risk reason", contact_cadence_days: "Contact every (days)",
  status: "Status", name: "Name", role: "Role", reason: "Reason", date: "Date",
};
const show = (v) => (v === null || v === undefined || v === "" ? "(empty)" : Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));

// Shows "Phone: old -> new" for each changed field
export const ChangeDetail = ({ before, after, metadata }) => {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  const extra = metadata && metadata.reason ? metadata.reason : null;
  if (!keys.length && !extra) return null;
  return (
    <div className="audit-detail">
      {keys.map((k) => (
        <div key={k}>
          <b>{FIELD_LABELS[k] || k}:</b>{" "}
          {before && k in before && <span className="audit-old">{show(before[k])}</span>}
          {before && k in before && after && k in after && " → "}
          {after && k in after && <span className="audit-new">{show(after[k])}</span>}
        </div>
      ))}
      {extra && (
        <div>
          <b>Reason:</b> {extra}
        </div>
      )}
    </div>
  );
};
