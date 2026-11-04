// ===============================
// Agents registering themselves from the college website
//
// Public (no sign-in):
//   registerAgent(payload)   -> sends a "confirm your email" link
//   verifyAgentEmail(token)  -> the link from that email
// Admin (see Registrations page):
//   list / counts / approve / reject
//
// Endpoints are defined in src/const/const.js.
// ===============================
import { API_ENDPOINTS } from "../const/const";
import { apiRequest, toQuery } from "./apiClient";

const publicPost = async (url, body) => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ...json, success: res.ok && json.success !== false, status: res.status };
  } catch (error) {
    return { success: false, message: "Could not reach the server." };
  }
};

// payload: { first_name, last_name, email, phone, password, agency_name,
//            business_number, country, consent: true }
export const registerAgent = (payload) => publicPost(API_ENDPOINTS.AUTH.REGISTER_AGENT, payload);

export const verifyAgentEmail = (token) => publicPost(API_ENDPOINTS.AUTH.VERIFY_AGENT, { token });

// ---------- admin ----------
// params: { status?: "pending_approval"|"unverified"|"rejected", page, limit }
export const listRegistrations = (params) =>
  apiRequest(`${API_ENDPOINTS.REGISTRATIONS.BASE}${toQuery(params)}`);

// -> { data: { pending_approval?: n, unverified?: n, rejected?: n } }
export const getRegistrationCounts = () => apiRequest(API_ENDPOINTS.REGISTRATIONS.COUNTS);

export const approveRegistration = (id) =>
  apiRequest(API_ENDPOINTS.REGISTRATIONS.APPROVE(id), { method: "POST" });

export const rejectRegistration = (id, reason) =>
  apiRequest(API_ENDPOINTS.REGISTRATIONS.REJECT(id), {
    method: "POST",
    body: reason ? { reason } : {},
  });
