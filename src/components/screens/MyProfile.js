import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../styles/adminPages.css";
import CustomSnackbar from "./CustomSnackbar";
import LoadingSpinner from "./LoadingSpinner";
import { StatusBadge, formatDate, formatDateTime } from "./admin/shared";
import { getHomeRoute, ROLE_LABELS, normalizeRole } from "../../const/roles";
import { getMyProfile, updateMyProfile } from "../../services/authService";
import { listAgreements } from "../../services/agreementService";

const PHONE_OK = (v) => /^\+?[\d\s()-]+$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15;

const Item = ({ label, children }) => (
  <div className="summary-item">
    <span>{label}</span>
    <strong>{children || "-"}</strong>
  </div>
);

// Every signed-in user can see their own details here. Agents also see their agency and agreement.
const MyProfile = ({ role }) => {
  const [data, setData] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const load = useCallback(async () => {
    const res = await getMyProfile(localStorage.getItem("Token"));
    setLoading(false);
    if (!res.success) return showMessage(res.message || "Could not load your details.", "error");
    setData(res.data);
    const u = res.data.user;
    setForm({ first_name: u.first_name || "", last_name: u.last_name || "", phone: u.phone || "" });
    if (res.data.user.role === "agent") {
      const ag = await listAgreements({ limit: 1 });
      if (ag.success && Array.isArray(ag.data)) setAgreement(ag.data[0] || null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const save = async (e) => {
    e.preventDefault();
    const problems = {};
    if (!form.first_name.trim()) problems.first_name = "Enter your first name";
    if (!form.last_name.trim()) problems.last_name = "Enter your last name";
    if (form.phone.trim() && !PHONE_OK(form.phone.trim())) problems.phone = "Enter a valid phone number";
    if (Object.keys(problems).length) return setErrors(problems);

    const body = { first_name: form.first_name.trim(), last_name: form.last_name.trim() };
    if (form.phone.trim()) body.phone = form.phone.trim();

    setBusy(true);
    const res = await updateMyProfile(localStorage.getItem("Token"), body);
    setBusy(false);
    if (res.success) {
      showMessage("Your details have been saved.");
      window.dispatchEvent(new Event("profileUpdated")); // refreshes the name in the header
      load();
    } else {
      showMessage(res.message || "Could not save your details.", "error");
    }
  };

  const u = data?.user;
  const agent = data?.agent;
  const changed = u && (form.first_name !== (u.first_name || "") || form.last_name !== (u.last_name || "") || form.phone !== (u.phone || ""));

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head pw-head">
        <h1>My profile</h1>
        <p>{u ? `${ROLE_LABELS[normalizeRole(u.role)] || u.role} account` : " "}</p>
      </div>

      {!u ? (
        <div className="admin-panel admin-empty">{loading ? "Loading your details..." : "Your details could not be loaded."}</div>
      ) : (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <section className="admin-panel">
            <h2>Account</h2>
            <div className="summary-grid">
              <Item label="Email">{u.email}</Item>
              <Item label="Member since">{formatDate(u.created_at)}</Item>
              <Item label="Last sign-in">{formatDateTime(u.last_login_at)}</Item>
            </div>
          </section>

          {agent && (
            <section className="admin-panel">
              <h2>Agency</h2>
              <div className="summary-grid">
                <Item label="Agency">{agent.agency_name}</Item>
                <Item label="Business number">{agent.business_number}</Item>
                <Item label="Country">{agent.country}</Item>
                <Item label="Agreement">
                  {agreement ? <StatusBadge status={agreement.status} view="agent" /> : <StatusBadge status="none" view="agent" />}
                  {agreement?.expires_at && agreement.status === "active" && ` until ${formatDate(agreement.expires_at)}`}
                </Item>
              </div>
              <p className="admin-hint" style={{ marginTop: 12 }}>
                To change your agency details, please contact the college.
              </p>
              <div className="action-row" style={{ marginTop: 14 }}>
                <Link className="row-btn" to="/agent/agreement">My agreement</Link>
              </div>
            </section>
          )}

          <section className="admin-panel">
            <h2>Your details</h2>
            <form noValidate onSubmit={save} className="dialog-form">
              <div className={`admin-field${errors.first_name ? " has-error" : ""}`}>
                <label htmlFor="pf-first">First name</label>
                <input id="pf-first" autoComplete="given-name" value={form.first_name} maxLength={50} onChange={set("first_name")} />
                {errors.first_name && <span className="admin-error">{errors.first_name}</span>}
              </div>
              <div className={`admin-field${errors.last_name ? " has-error" : ""}`}>
                <label htmlFor="pf-last">Last name</label>
                <input id="pf-last" autoComplete="family-name" value={form.last_name} maxLength={50} onChange={set("last_name")} />
                {errors.last_name && <span className="admin-error">{errors.last_name}</span>}
              </div>
              <div className={`admin-field${errors.phone ? " has-error" : ""}`}>
                <label htmlFor="pf-phone">Phone</label>
                <input id="pf-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
                {errors.phone && <span className="admin-error">{errors.phone}</span>}
              </div>
              <div className="action-row" style={{ justifyContent: "center" }}>
                <button type="submit" className="admin-btn" disabled={busy || !changed}>Save changes</button>
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <h2>Password</h2>
            <p className="admin-hint">Change your password at any time. You will stay signed in on this device.</p>
            <div className="action-row" style={{ marginTop: 14 }}>
              <Link className="row-btn" to="/account/password">Change password</Link>
            </div>
          </section>
        </div>
      )}

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default MyProfile;
