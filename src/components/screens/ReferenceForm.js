import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, ErrorOutline } from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";

import "../styles/signUp.css";
import "../styles/coms.css";
import AuthLogo from "../AuthLogo";
import { Btn, Field, Notice } from "../ui";
import { getReferenceForm, submitReferenceForm } from "../../services/comsService";

// The page a referee opens from the email: no account, one single-use link.
const ReferenceForm = () => {
  const { token } = useParams();
  const [state, setState] = useState("loading"); // loading | form | done | already | failed
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    getReferenceForm(token).then((res) => {
      if (!res.success) {
        setMessage(res.message || "This link is not valid any more.");
        return setState("failed");
      }
      setInfo(res.data);
      setState(res.data.submitted ? "already" : "form");
    });
  }, [token]);

  const set = (key, v) => setValues((x) => ({ ...x, [key]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const answers = {};
    const errs = {};
    info.questions.forEach((q) => {
      if (q.type === "yesno") {
        const v = values[q.key];
        if (v !== "yes" && v !== "no") errs[q.key] = "Please choose Yes or No";
        else {
          answers[q.key] = v === "yes";
          if (q.detail) {
            const d = (values[`${q.key}_detail`] || "").trim();
            // details are asked when the answer is the worrying one (detail_when is that answer: true = Yes)
            if (answers[q.key] === q.detail_when && !d) errs[`${q.key}_detail`] = "Please give details";
            if (d) answers[`${q.key}_detail`] = d;
          }
        }
      } else {
        const t = (values[q.key] || "").trim();
        if (!t && q.required) errs[q.key] = "Please answer this question";
        if (t) answers[q.key] = t;
      }
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await submitReferenceForm(token, answers);
    setBusy(false);
    if (res.success) setState("done");
    else {
      if (res.errors) setErrors(res.errors);
      setMessage(res.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="signup-container reference-page">
      <div className="signup-box">
        <AuthLogo />

        {state === "loading" && (
          <>
            <CircularProgress size={36} thickness={4} />
            <p className="signup-subtitle">Opening the form...</p>
          </>
        )}

        {state === "failed" && (
          <>
            <ErrorOutline className="signup-icon signup-icon-warn" />
            <h2>Link not valid</h2>
            <p className="signup-subtitle">{message} If you still wish to give a reference, please reply to the college's email or contact the college.</p>
          </>
        )}

        {(state === "done" || state === "already") && (
          <>
            <CheckCircle className="signup-icon signup-icon-success" />
            <h2>Thank you</h2>
            <p className="signup-subtitle">
              {state === "done" ? "Your reference has been sent to the college." : "Your reference has already been received."} You do not need to do anything else.
            </p>
          </>
        )}

        {state === "form" && (
          <form className="reference-form" onSubmit={submit} noValidate>
            <h2>Reference for {info.agent_name}</h2>
            <p className="signup-subtitle">
              Hello {info.referee_name}. {info.agent_name} has applied to become an education agent for Australian Federation College and named you as a referee.
              Please answer the questions below. It takes about five minutes, and your answers are used only to assess the application.
            </p>
            {message && <Notice severity="error" sx={{ mb: 2, textAlign: "left" }}>{message}</Notice>}
            {info.questions.map((q, i) =>
              q.type === "yesno" ? (
                <div className="reference-q" key={q.key}>
                  <FormControl error={Boolean(errors[q.key])} component="fieldset">
                    <FormLabel component="legend" sx={{ color: "var(--text-color)", fontWeight: 600, "&.Mui-focused": { color: "var(--text-color)" } }}>
                      {i + 1}. {q.label}
                    </FormLabel>
                    <RadioGroup row name={q.key} value={values[q.key] || ""} onChange={(e) => set(q.key, e.target.value)}>
                      <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                      <FormControlLabel value="no" control={<Radio />} label="No" />
                    </RadioGroup>
                    {errors[q.key] && <FormHelperText>{errors[q.key]}</FormHelperText>}
                  </FormControl>
                  {q.detail && values[q.key] && (values[q.key] === "yes") === q.detail_when && (
                    <Field id={`rq-${q.key}-d`} label="Please give details" multiline error={errors[`${q.key}_detail`]} value={values[`${q.key}_detail`] || ""} onChange={(e) => set(`${q.key}_detail`, e.target.value)} inputProps={{ maxLength: 2000 }} />
                  )}
                </div>
              ) : (
                <div className="reference-q" key={q.key}>
                  <Field id={`rq-${q.key}`} multiline label={`${i + 1}. ${q.label}${q.required ? "" : " (optional)"}`} error={errors[q.key]} value={values[q.key] || ""} onChange={(e) => set(q.key, e.target.value)} inputProps={{ maxLength: 2000 }} />
                </div>
              ),
            )}
            <div className="reference-actions">
              <Btn type="submit" kind="primary" size="large" disabled={busy}>{busy ? "Sending..." : "Send my reference"}</Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReferenceForm;
