import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack, Visibility, VisibilityOff } from "@mui/icons-material";

import "../styles/adminPages.css";
import CustomSnackbar from "./CustomSnackbar";
import LoadingSpinner from "./LoadingSpinner";
import { getHomeRoute } from "../../const/roles";
import { changePassword } from "../../services/authService";
import { Btn, Field, Panel } from "../ui";
import { IconButton, InputAdornment } from "@mui/material";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,72}$/;
const EMPTY = { current: "", next: "", confirm: "" };

// Any signed-in user (admin, agent, teacher, student) can change their own password here.
const PasswordInput = ({ id, label, error, show, onToggle, ...props }) => (
  <Field
    id={id}
    label={label}
    type={show ? "text" : "password"}
    error={error}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end">
          <IconButton edge="end" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
          </IconButton>
        </InputAdornment>
      ),
    }}
    {...props}
  />
);

const ChangePassword = ({ role }) => {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = {};
    if (!form.current) problems.current = "Enter your current password";
    if (!PASSWORD_REGEX.test(form.next)) {
      problems.next = "Use 8-72 characters with upper and lower case letters, a number and one of @$!%*?&";
    } else if (form.next === form.current) {
      problems.next = "Choose a password you have not used before";
    }
    if (form.confirm !== form.next) problems.confirm = "The passwords do not match";
    if (Object.keys(problems).length) return setErrors(problems);

    setBusy(true);
    const res = await changePassword(localStorage.getItem("Token"), form.current, form.next);
    setBusy(false);

    if (res.success) {
      // the old token stops working after a change, the server hands back a new one
      if (res.data?.token) localStorage.setItem("Token", res.data.token);
      setForm(EMPTY);
      showMessage("Your password has been changed. We also sent you a confirmation email.");
    } else {
      setErrors({
        current: res.errors?.currentPassword,
        next: res.errors?.newPassword,
      });
      showMessage(res.message || "Could not change your password.", "error");
    }
  };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head pw-head">
        <h1>Change password</h1>
        <p>Choose a strong password that you do not use anywhere else.</p>
      </div>

      <Panel style={{ maxWidth: 520, margin: "0 auto" }}>
        <form noValidate onSubmit={submit} className="dialog-form">
          <PasswordInput id="pw-current" label="Current password" autoComplete="current-password"
            value={form.current} onChange={set("current")} error={errors.current} show={show} onToggle={() => setShow(!show)} />
          <PasswordInput id="pw-new" label="New password" autoComplete="new-password"
            value={form.next} onChange={set("next")} error={errors.next} show={show} onToggle={() => setShow(!show)} />
          <PasswordInput id="pw-confirm" label="Confirm new password" autoComplete="new-password"
            value={form.confirm} onChange={set("confirm")} error={errors.confirm} show={show} onToggle={() => setShow(!show)} />
          <p className="admin-hint">You will stay signed in on this device. Any other device will be signed out.</p>
          <div className="action-row" style={{ justifyContent: "center" }}>
            <Btn kind="primary" size="medium" type="submit"  disabled={busy}>Change password</Btn>
          </div>
        </form>
      </Panel>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default ChangePassword;
