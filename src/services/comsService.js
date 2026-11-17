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
  apiDownload(`${E.AGENTS_EXPORT}${toQuery(params)}`, `agent-register-${new Date().toLocaleDateString("en-CA")}.csv`);

// ---------- calendar and audit ----------
export const listHolidays = () => apiRequest(E.HOLIDAYS);
export const addHoliday = (payload) => apiRequest(E.HOLIDAYS, { method: "POST", body: payload });
export const removeHoliday = (id) => apiRequest(E.HOLIDAY(id), { method: "DELETE" });
export const exportHolidays = () => apiDownload(E.HOLIDAYS_EXPORT, `public-holidays-${new Date().toLocaleDateString("en-CA")}.csv`);
export const exportAudit = (params) => apiDownload(`${E.AUDIT_EXPORT}${toQuery(params)}`, `audit-log-${new Date().toLocaleDateString("en-CA")}.csv`);
export const listAudit = (params) => apiRequest(`${E.AUDIT}${toQuery(params)}`);

// ---------- the signed-in agent's own application ----------
export const getMyApplication = () => apiRequest(API_ENDPOINTS.AGENT_APPLICATION);
export const submitMyApplication = (payload) => apiRequest(API_ENDPOINTS.AGENT_APPLICATION, { method: "POST", body: payload });

// ---------- Part 2: due diligence, decision, agreement ----------
// Evidence files travel inside the request as base64 (see the server's upload rules: 3 MB, PDF/JPG/PNG/DOCX/XLSX/EML/MSG).
export const MAX_FILE_MB = 3;
export const fileToPayload = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(",")[1] || "" });
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });

export const getDueDiligence = (id) => apiRequest(E.DUE_DILIGENCE(id));
export const addReferee = (id, payload) => apiRequest(E.REFEREES(id), { method: "POST", body: payload });
export const updateReferee = (id, rid, payload) => apiRequest(E.REFEREE(id, rid), { method: "PATCH", body: payload });
export const removeReferee = (id, rid, reason) => apiRequest(E.REFEREE_DELETE(id, rid), { method: "POST", body: { reason } });
export const requestReference = (id, rid) => apiRequest(E.REFEREE_REQUEST(id, rid), { method: "POST" });
export const recordPhoneCheck = (id, rid, payload) => apiRequest(E.REFEREE_PHONE(id, rid), { method: "POST", body: payload });
export const remindReferee = (id, cid) => apiRequest(E.CHECK_REMIND(id, cid), { method: "POST" });
export const setReferenceOutcome = (id, cid, payload) => apiRequest(E.CHECK_OUTCOME(id, cid), { method: "POST", body: payload });
export const recordDueDiligenceCheck = (id, payload) => apiRequest(E.DD_CHECKS(id), { method: "POST", body: payload });
export const recordDeclarations = (id, payload) => apiRequest(E.DD_DECLARATIONS(id), { method: "POST", body: payload });
export const getRejectionDraft = (id, reason) => apiRequest(E.REJECTION_DRAFT(id), { method: "POST", body: { reason } });
export const decideAgent = (id, payload) => apiRequest(E.DECISION(id), { method: "POST", body: payload });
export const sendAgentAgreement = (id, payload) => apiRequest(E.AGENT_AGREEMENT(id), { method: "POST", body: payload || {} });
export const downloadComsFile = (fileId, name) => apiDownload(E.FILE(fileId), name || "file");

// ---------- the agent folder: documents, requests for information, commission and bonus ----------
export const listDocuments = (id) => apiRequest(E.DOCUMENTS(id));
export const uploadDocument = (id, payload) => apiRequest(E.DOCUMENTS(id), { method: "POST", body: payload });
export const reviewDocument = (id, docId, payload) => apiRequest(E.DOCUMENT_REVIEW(id, docId), { method: "POST", body: payload });
export const removeDocument = (id, docId, reason) => apiRequest(E.DOCUMENT_DELETE(id, docId), { method: "POST", body: { reason } });
export const downloadDocument = (id, docId, name) => apiDownload(E.DOCUMENT_DOWNLOAD(id, docId), name || "document");
export const requestInformation = (id, message) => apiRequest(E.REQUEST_INFO(id), { method: "POST", body: { message } });
export const downloadApplicationPdf = (id, name) => apiDownload(E.APPLICATION_PDF(id), name || "Education Agent Application Form.pdf");
export const recordTerms = (id, payload) => apiRequest(E.AGENT_TERMS(id), { method: "POST", body: payload });
export const getMyDocuments = () => apiRequest(E.MY_DOCUMENTS);
export const uploadMyDocument = (payload) => apiRequest(E.MY_DOCUMENTS, { method: "POST", body: payload });
export const removeMyDocument = (docId) => apiRequest(E.MY_DOCUMENT_DELETE(docId), { method: "POST", body: {} });
export const downloadMyDocument = (docId, name) => apiDownload(E.MY_DOCUMENT_DOWNLOAD(docId), name || "document");

// ---------- Part 2: tasks ----------
export const getTaskMeta = () => apiRequest(E.TASKS_META);
export const listTasks = (params) => apiRequest(`${E.TASKS}${toQuery(params)}`);
export const createTask = (payload) => apiRequest(E.TASKS, { method: "POST", body: payload });
export const completeTask = (id, payload) => apiRequest(E.TASK_COMPLETE(id), { method: "POST", body: payload });
export const assignTask = (id, ownerId) => apiRequest(E.TASK_ASSIGN(id), { method: "POST", body: { owner_id: ownerId } });
export const cancelTask = (id, reason) => apiRequest(E.TASK_CANCEL(id), { method: "POST", body: { reason } });
export const downloadTaskEvidence = (id, name) => apiDownload(E.TASK_EVIDENCE(id), name || "evidence");
export const exportTasks = (params) => apiDownload(`${E.TASKS_EXPORT}${toQuery(params)}`, `tasks-${new Date().toLocaleDateString("en-CA")}.csv`);

// ---------- the referee's own page ----------
export const getReferenceForm = (token) => apiRequest(API_ENDPOINTS.REFERENCE(token));
export const submitReferenceForm = (token, answers) => apiRequest(API_ENDPOINTS.REFERENCE(token), { method: "POST", body: { answers } });
