import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MarkEmailRead } from "@mui/icons-material";

import "../styles/signUp.css";

import AuthLogo from "../AuthLogo";
import LoadingSpinner from "./LoadingSpinner";
import ApplicationForm from "./application/ApplicationForm";

import { registerAgent } from "../../services/registrationService";

// Public page for education agents. The college website links here.
// One long application: account, business (PRISMS fields), people, referees and declarations.
const AgentRegister = () => {
  const [sentTo, setSentTo] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (payload) => {
    setSending(true);
    const res = await registerAgent(payload);
    setSending(false);
    if (res.success) {
      setSentTo(payload.email);
      window.scrollTo({ top: 0 });
    }
    return res;
  };

  // ---------- after sending ----------
  if (sentTo) {
    return (
      <div className="signup-container">
        <div className="signup-box">
          <AuthLogo />
          <MarkEmailRead className="signup-icon signup-icon-success" />
          <h2>Check your email</h2>
          <p className="signup-subtitle">
            Your application is saved. We sent a link to <strong>{sentTo}</strong>. Open it to confirm your email address
            and send the application to the college. The link can be used once and works for 24 hours.
          </p>
          <p className="signup-subtitle">
            The college will acknowledge your application within 3 working days and aims to decide within 10. Once
            approved you can sign in and sign your agent agreement.
          </p>
          <p className="signup-subtitle">Nothing in your inbox? Check your spam folder, or fill in the form again to get a new link.</p>
          <Link to="/signin" className="button-success signup-link-button">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container app-wide">
      <div className="signup-box">
        <AuthLogo />
        <span className="role-chip role-agent">Education agent</span>
        <h2>Apply to become an agent</h2>
        <p className="signup-subtitle">
          Tell us about your business, the people in it and two referees. It takes about 10 minutes. You will confirm
          your email at the end, then the college reviews your application.
        </p>
        <ApplicationForm mode="public" onSubmit={handleSubmit} />
        <p className="signin-link">
          Already registered? <Link to="/signin">Sign in</Link>
        </p>
      </div>
      <LoadingSpinner open={sending} />
    </div>
  );
};

export default AgentRegister;
