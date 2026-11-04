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

  REGISTRATIONS: {
    BASE: `${API_BASE_URL}/registrations`,
    COUNTS: `${API_BASE_URL}/registrations/counts`,
    APPROVE: (id) => `${API_BASE_URL}/registrations/${id}/approve`,
    REJECT: (id) => `${API_BASE_URL}/registrations/${id}/reject`,
  },

  AGREEMENT_TEMPLATE: {
    BASE: `${API_BASE_URL}/agreement-template`,
    PREVIEW: `${API_BASE_URL}/agreement-template/preview`,
  },

  COMS: {
    AGENTS: `${API_BASE_URL}/coms/agents`,
    AGENTS_META: `${API_BASE_URL}/coms/agents/meta`,
    AGENTS_EXPORT: `${API_BASE_URL}/coms/agents/export`,
    AGENT: (id) => `${API_BASE_URL}/coms/agents/${id}`,
    AGENT_STATUS: (id) => `${API_BASE_URL}/coms/agents/${id}/status`,
    AGENT_LINK: (id) => `${API_BASE_URL}/coms/agents/${id}/application-link`,
    AGENT_MILESTONE: (id) => `${API_BASE_URL}/coms/agents/${id}/milestones`,
    AGENT_DELETE: (id) => `${API_BASE_URL}/coms/agents/${id}/delete`,
    AGENT_RESTORE: (id) => `${API_BASE_URL}/coms/agents/${id}/restore`,
    AGENT_PERSONS: (id) => `${API_BASE_URL}/coms/agents/${id}/persons`,
    AGENT_PERSON: (id, pid) => `${API_BASE_URL}/coms/agents/${id}/persons/${pid}`,
    AGENT_PERSON_DELETE: (id, pid) => `${API_BASE_URL}/coms/agents/${id}/persons/${pid}/delete`,
    HOLIDAYS: `${API_BASE_URL}/coms/holidays`,
    HOLIDAY: (id) => `${API_BASE_URL}/coms/holidays/${id}`,
    AUDIT: `${API_BASE_URL}/coms/audit`,
  },

  USERS: {
    BASE: `${API_BASE_URL}/users`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/users/${id}/status`,
  },
};

export const ROUTES = {
  SIGNIN: "/signin",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
};
