import { API_ENDPOINTS } from "../const/const";
import { apiRequest, apiDownload, toQuery } from "./apiClient";

const E = API_ENDPOINTS.COMS;

// ---------- agent register ----------
// params: { status, tier, risk, manager, country, search, sort, dir, page, limit }
export const listAgentRecords = (params) => apiRequest(`${E.AGENTS}${toQuery(params)}`);
export const getAgentMeta = () => apiRequest(E.AGENTS_META);
export const getAgentRecord = (id) => apiRequest(E.AGENT(id));

// { legal_name, email, country, phone?, contact_name?, send_link }
export const createAgentRecord = (payload) => apiRequest(E.AGENTS, { method: "POST", body: payload });
export const updateAgentRecord = (id, payload) => apiRequest(E.AGENT(id), { method: "PATCH", body: payload });
export const changeAgentStatus = (id, status, reason) =>
  apiRequest(E.AGENT_STATUS(id), { method: "POST", body: { status, ...(reason ? { reason } : {}) } });
export const sendApplicationLink = (id) => apiRequest(E.AGENT_LINK(id), { method: "POST" });
export const recordMilestone = (id, type, date) =>
  apiRequest(E.AGENT_MILESTONE(id), { method: "POST", body: { type, ...(date ? { date } : {}) } });
export const deleteAgentRecord = (id, reason) => apiRequest(E.AGENT_DELETE(id), { method: "POST", body: { reason } });
export const restoreAgentRecord = (id) => apiRequest(E.AGENT_RESTORE(id), { method: "POST" });

export const addAgentPerson = (id, payload) => apiRequest(E.AGENT_PERSONS(id), { method: "POST", body: payload });
export const updateAgentPerson = (id, pid, payload) => apiRequest(E.AGENT_PERSON(id, pid), { method: "PATCH", body: payload });
export const removeAgentPerson = (id, pid, reason) =>
  apiRequest(E.AGENT_PERSON_DELETE(id, pid), { method: "POST", body: { reason } });

export const exportAgentRecords = (params) =>
  apiDownload(`${E.AGENTS_EXPORT}${toQuery(params)}`, `agent-register-${new Date().toISOString().slice(0, 10)}.csv`);

// ---------- calendar and audit ----------
export const listHolidays = () => apiRequest(E.HOLIDAYS);
export const addHoliday = (payload) => apiRequest(E.HOLIDAYS, { method: "POST", body: payload });
export const removeHoliday = (id) => apiRequest(E.HOLIDAY(id), { method: "DELETE" });
export const listAudit = (params) => apiRequest(`${E.AUDIT}${toQuery(params)}`);
