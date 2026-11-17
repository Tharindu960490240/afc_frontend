// ===============================
// App-wide constants: API address and every endpoint in one place.
//
// Pick the backend with REACT_APP_API_URL in the frontend .env file
// (restart `npm start` after changing it). Examples:
//   REACT_APP_API_URL=http://localhost:3200/api      (local, the default)
//   REACT_APP_API_URL=https://api.your-afc-domain/api (production)
// ===============================
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3200/api";

// Where the React app itself runs (used for links shown to users)
export const FRONTEND_BASE_URL = window.location.origin;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    ME: `${API_BASE_URL}/auth/me`,
    MY_PROFILE: `${API_BASE_URL}/auth/me/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/auth/me`,
    CHANGE_PASSWORD: `${API_BASE_URL}/auth/me/password`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    VALIDATE_RESET_TOKEN: `${API_BASE_URL}/auth/reset-password/validate`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    REGISTER_AGENT: `${API_BASE_URL}/auth/register-agent`,
    VERIFY_AGENT: `${API_BASE_URL}/auth/verify-agent`,
  },

  INVITATIONS: {
    BASE: `${API_BASE_URL}/invitations`,
    BY_TOKEN: (token) =>
      `${API_BASE_URL}/invitations/${encodeURIComponent(token)}`,
    ACCEPT: (token) =>
      `${API_BASE_URL}/invitations/${encodeURIComponent(token)}/accept`,
    RESEND: (id) => `${API_BASE_URL}/invitations/${id}/resend`,
    REVOKE: (id) => `${API_BASE_URL}/invitations/${id}`,
  },

  AGENTS: {
    BASE: `${API_BASE_URL}/agents`,
  },

  AGREEMENTS: {
    BASE: `${API_BASE_URL}/agreements`,
    BY_ID: (id) => `${API_BASE_URL}/agreements/${id}`,
    SIGN: (id) => `${API_BASE_URL}/agreements/${id}/sign`,
    PDF: (id) => `${API_BASE_URL}/agreements/${id}/pdf`,
    APPROVE: (id) => `${API_BASE_URL}/agreements/${id}/approve`,
    REJECT: (id) => `${API_BASE_URL}/agreements/${id}/reject`,
    CANCEL: (id) => `${API_BASE_URL}/agreements/${id}/cancel`,
    DOWNLOAD: (id, fileId) =>
      `${API_BASE_URL}/agreements/${id}/files/${fileId}/download`,
  },

  AGREEMENT_TEMPLATE: {
    BASE: `${API_BASE_URL}/agreement-template`,
    PREVIEW: `${API_BASE_URL}/agreement-template/preview`,
  },

  SETTINGS: {
    BASE: `${API_BASE_URL}/settings`,
    QUESTIONS: `${API_BASE_URL}/settings/reference-questions`,
    DOCUMENTS: `${API_BASE_URL}/settings/document-types`,
    TIMERS: `${API_BASE_URL}/settings/timers`,
    COLLEGE: `${API_BASE_URL}/settings/college`,
    SIGNATURE: `${API_BASE_URL}/settings/signature`,
    SIGNATURE_REMOVE: `${API_BASE_URL}/settings/signature/remove`,
    TASKS: `${API_BASE_URL}/settings/onboarding-tasks`,
  },

  AGENT_APPLICATION: `${API_BASE_URL}/agent-application`,
  REFERENCE: (token) => `${API_BASE_URL}/reference/${token}`, // the referee's own page (no sign-in)

  COMS: {
    AGENTS: `${API_BASE_URL}/coms/agents`,
    AGENTS_META: `${API_BASE_URL}/coms/agents/meta`,
    AGENTS_EXPORT: `${API_BASE_URL}/coms/agents/export`,
    AGENT: (id) => `${API_BASE_URL}/coms/agents/${id}`,
    AGENT_STATUS: (id) => `${API_BASE_URL}/coms/agents/${id}/status`,
    AGENT_LINK: (id) => `${API_BASE_URL}/coms/agents/${id}/application-link`,
    AGENT_MILESTONE: (id) => `${API_BASE_URL}/coms/agents/${id}/milestones`,
    AGENT_INDUCTION_MINE: `${API_BASE_URL}/agent-application/induction`,
    AGENT_INDUCTIONS: (id) => `${API_BASE_URL}/coms/agents/${id}/inductions`,
    AGENT_INDUCTION: (id, iid, action) => `${API_BASE_URL}/coms/agents/${id}/inductions/${iid}/${action}`,
    AGENT_DELETE: (id) => `${API_BASE_URL}/coms/agents/${id}/delete`,
    AGENT_RESTORE: (id) => `${API_BASE_URL}/coms/agents/${id}/restore`,
    AGENT_PERSONS: (id) => `${API_BASE_URL}/coms/agents/${id}/persons`,
    AGENT_PERSON: (id, pid) => `${API_BASE_URL}/coms/agents/${id}/persons/${pid}`,
    AGENT_PERSON_DELETE: (id, pid) => `${API_BASE_URL}/coms/agents/${id}/persons/${pid}/delete`,
    HOLIDAYS: `${API_BASE_URL}/coms/holidays`,
    HOLIDAY: (id) => `${API_BASE_URL}/coms/holidays/${id}`,
    AUDIT: `${API_BASE_URL}/coms/audit`,
    AUDIT_EXPORT: `${API_BASE_URL}/coms/audit/export`,
    HOLIDAYS_EXPORT: `${API_BASE_URL}/coms/holidays/export`,
    // Part 2: due diligence, decision, agreement, tasks
    DUE_DILIGENCE: (id) => `${API_BASE_URL}/coms/agents/${id}/due-diligence`,
    DD_CHECKS: (id) => `${API_BASE_URL}/coms/agents/${id}/due-diligence/checks`,
    DD_DECLARATIONS: (id) => `${API_BASE_URL}/coms/agents/${id}/due-diligence/declarations`,
    REFEREES: (id) => `${API_BASE_URL}/coms/agents/${id}/referees`,
    REFEREE: (id, rid) => `${API_BASE_URL}/coms/agents/${id}/referees/${rid}`,
    REFEREE_DELETE: (id, rid) => `${API_BASE_URL}/coms/agents/${id}/referees/${rid}/delete`,
    REFEREE_REQUEST: (id, rid) => `${API_BASE_URL}/coms/agents/${id}/referees/${rid}/request`,
    REFEREE_PHONE: (id, rid) => `${API_BASE_URL}/coms/agents/${id}/referees/${rid}/phone-check`,
    CHECK_REMIND: (id, cid) => `${API_BASE_URL}/coms/agents/${id}/reference-checks/${cid}/remind`,
    CHECK_OUTCOME: (id, cid) => `${API_BASE_URL}/coms/agents/${id}/reference-checks/${cid}/outcome`,
    REJECTION_DRAFT: (id) => `${API_BASE_URL}/coms/agents/${id}/rejection-draft`,
    DECISION: (id) => `${API_BASE_URL}/coms/agents/${id}/decision`,
    AGENT_AGREEMENT: (id) => `${API_BASE_URL}/coms/agents/${id}/agreement`,
    FILE: (id) => `${API_BASE_URL}/coms/files/${id}/download`,
    DOCUMENTS: (id) => `${API_BASE_URL}/coms/agents/${id}/documents`,
    DOCUMENT_REVIEW: (id, docId) => `${API_BASE_URL}/coms/agents/${id}/documents/${docId}/review`,
    DOCUMENT_DELETE: (id, docId) => `${API_BASE_URL}/coms/agents/${id}/documents/${docId}/delete`,
    DOCUMENT_DOWNLOAD: (id, docId) => `${API_BASE_URL}/coms/agents/${id}/documents/${docId}/download`,
    REQUEST_INFO: (id) => `${API_BASE_URL}/coms/agents/${id}/request-information`,
    CERTIFICATE: (id) => `${API_BASE_URL}/coms/agents/${id}/certificate`,
    CERTIFICATE_SEND: (id) => `${API_BASE_URL}/coms/agents/${id}/certificate/send`,
    MY_CERTIFICATE: `${API_BASE_URL}/agent-application/certificate`,
    MY_CERTIFICATE_DOWNLOAD: `${API_BASE_URL}/agent-application/certificate/download`,
    APPLICATION_PDF: (id) => `${API_BASE_URL}/coms/agents/${id}/application.pdf`,
    AGENT_TERMS: (id) => `${API_BASE_URL}/coms/agents/${id}/terms`,
    AGENT_TERMS_DRAFT: (id) => `${API_BASE_URL}/coms/agents/${id}/terms/draft`,
    AGENT_TERMS_SEND: (id) => `${API_BASE_URL}/coms/agents/${id}/terms/send`,
    MY_DOCUMENTS: `${API_BASE_URL}/agent-application/documents`,
    MY_DOCUMENT_DELETE: (docId) => `${API_BASE_URL}/agent-application/documents/${docId}/delete`,
    MY_DOCUMENT_DOWNLOAD: (docId) => `${API_BASE_URL}/agent-application/documents/${docId}/download`,
    TASKS: `${API_BASE_URL}/coms/tasks`,
    TASKS_META: `${API_BASE_URL}/coms/tasks/meta`,
    TASKS_EXPORT: `${API_BASE_URL}/coms/tasks/export`,
    TASK_COMPLETE: (id) => `${API_BASE_URL}/coms/tasks/${id}/complete`,
    TASK_ASSIGN: (id) => `${API_BASE_URL}/coms/tasks/${id}/assign`,
    TASK_CANCEL: (id) => `${API_BASE_URL}/coms/tasks/${id}/cancel`,
    TASK_EVIDENCE: (id) => `${API_BASE_URL}/coms/tasks/${id}/evidence`,
  },

  USERS: {
    BASE: `${API_BASE_URL}/users`,
    EXPORT: `${API_BASE_URL}/users/export`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/users/${id}/status`,
    AUTHORISED: (id) => `${API_BASE_URL}/users/${id}/authorised`,
  },
};

export const ROUTES = {
  SIGNIN: "/signin",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
};
