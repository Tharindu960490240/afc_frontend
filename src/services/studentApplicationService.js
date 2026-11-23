import { API_ENDPOINTS } from "../const/const";
import { apiDownload, apiRequest } from "./apiClient";

const E = API_ENDPOINTS.STUDENT_APPS;

// ---------- agents ----------
export const getFormConfig = () => apiRequest(E.CONFIG);
export const listMyApplications = () => apiRequest(E.BASE);
export const startApplication = () => apiRequest(E.BASE, { method: "POST", body: {} });
export const getApplication = (id) => apiRequest(E.ONE(id));
export const saveApplication = (id, data) => apiRequest(E.ONE(id), { method: "PUT", body: { data } });
export const discardApplication = (id) => apiRequest(E.DISCARD(id), { method: "POST", body: {} });
export const submitApplication = (id) => apiRequest(E.SUBMIT(id), { method: "POST", body: {} });
export const uploadApplicationDocument = (id, payload) => apiRequest(E.DOCS(id), { method: "POST", body: payload });
export const removeApplicationDocument = (id, docId) => apiRequest(E.DOC_REMOVE(id, docId), { method: "POST", body: {} });
export const downloadApplicationDocument = (id, docId, name) => apiDownload(E.DOC_DOWNLOAD(id, docId), name || "document");
export const downloadStudentForm = (formId, name) => apiDownload(E.FORM_DOWNLOAD(formId), name || "form");

// ---------- administrators ----------
export const getApplicationSettings = () => apiRequest(E.SETTINGS);
export const saveApplicationSettings = (payload) => apiRequest(E.SETTINGS, { method: "PUT", body: payload });
export const saveDocumentTypes = (items) => apiRequest(E.SETTINGS_TYPES, { method: "PUT", body: { items } });
export const uploadStudentForm = (payload) => apiRequest(E.SETTINGS_FORMS, { method: "POST", body: payload });
export const toggleStudentForm = (formId, active) => apiRequest(E.SETTINGS_FORM(formId), { method: "POST", body: { active } });

// ---------- staff ----------
const toQuery = (p = {}) => { const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null)).toString(); return s ? `?${s}` : ""; };
export const staffQueue = (params) => apiRequest(`${E.STAFF}${toQuery(params)}`);
export const staffApplication = (id) => apiRequest(E.STAFF_ONE(id));
export const startReview = (id) => apiRequest(E.STAFF_ACTION(id, "start-review"), { method: "POST", body: {} });
export const reviewDocument = (id, docId, payload) => apiRequest(`${E.STAFF_ONE(id)}/documents/${docId}/review`, { method: "POST", body: payload });
export const requestInfo = (id, note) => apiRequest(E.STAFF_ACTION(id, "request-info"), { method: "POST", body: { note } });
export const recordDecision = (id, payload) => apiRequest(E.STAFF_ACTION(id, "decision"), { method: "POST", body: payload });
export const withdrawApplication = (id, reason) => apiRequest(E.STAFF_ACTION(id, "withdraw"), { method: "POST", body: { reason } });

// Letter of Offer, payment, CoE and Verification of Enrolment (each returns the refreshed application)
const post = (id, path, body = {}) => apiRequest(E.STAFF_ACTION(id, path), { method: "POST", body });
export const prepareLetter = (id) => post(id, "letter");
export const saveLetter = (id, payload) => apiRequest(E.STAFF_ACTION(id, "letter"), { method: "PUT", body: payload });
export const issueLetter = (id) => post(id, "letter/issue");
export const reviseLetter = (id) => post(id, "letter/revise");
export const confirmPayment = (id, note) => post(id, "payment", note ? { note } : {});
export const recordCoe = (id, payload) => post(id, "coe", payload);
export const issueVoe = (id) => post(id, "voe");
export const downloadOutput = (id, kind, name) => apiDownload(E.FILE(id, kind), name || "document");
