import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle, ErrorOutline } from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";

import "../styles/signUp.css";

import AuthLogo from "../AuthLogo";
import { verifyAgentEmail } from "../../services/registrationService";

// The page the "Confirm my email" button in the registration email opens.
const AgentRegisterVerify = () => {
  const { token } = useParams();
  // "checking" | "done" | "failed"
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  // The link works once. React runs effects twice in development, so guard it.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    verifyAgentEmail(token).then((res) => {
      setMessage(res.message || "");
      setStatus(res.success ? "done" : "failed");
    });
  }, [token]);

  return (
    <div className="signup-container">
      <div className="signup-box">
        <AuthLogo />

        {status === "checking" && (
          <>
            <CircularProgress size={36} thickness={4} />
            <p className="signup-subtitle">Confirming your email...</p>
          </>
        )}

        {status === "done" && (
          <>
            <CheckCircle className="signup-icon signup-icon-success" />
            <h2>Email confirmed</h2>
            <p className="signup-subtitle">
              Thank you. The college will review your registration and email you when it is approved. After that you can
              sign in and sign your agent agreement.
            </p>
            <Link to="/signin" className="button-success signup-link-button">
              Go to sign in
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <ErrorOutline className="signup-icon signup-icon-warn" />
            <h2>Link not valid</h2>
            <p className="signup-subtitle">
              {message || "This confirmation link is not valid or has expired."} You can fill in the registration form
              again to get a new link.
            </p>
            <Link to="/register/agent" className="button-success signup-link-button">
              Register again
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default AgentRegisterVerify;
