import { API_ENDPOINTS } from "../const/const";
import { apiRequest } from "./apiClient";

const S = API_ENDPOINTS.SETTINGS;
const put = (url, body) => apiRequest(url, { method: "PUT", body });

export const getSettings = () => apiRequest(S.BASE);
export const saveQuestions = (items) => put(S.QUESTIONS, { items });
export const saveDocumentTypes = (items) => put(S.DOCUMENTS, { items });
export const saveTimers = (timers) => put(S.TIMERS, timers);
export const saveCollege = (college) => put(S.COLLEGE, college);
export const saveSignature = (signature_image) => put(S.SIGNATURE, { signature_image });
export const removeSignature = () => apiRequest(S.SIGNATURE_REMOVE, { method: "POST", body: {} });
export const saveOnboardingTasks = (items) => put(S.TASKS, { items });
