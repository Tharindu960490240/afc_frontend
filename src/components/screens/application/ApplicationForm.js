import React, { useMemo, useRef, useState } from "react";
import {
  Autocomplete, Checkbox, FormControlLabel, FormControl, FormHelperText, FormLabel,
  InputAdornment, IconButton, MenuItem, Radio, RadioGroup, Step, StepLabel, Stepper, TextField,
} from "@mui/material";
import { Add, Delete, Visibility, VisibilityOff } from "@mui/icons-material";

import "../../styles/application.css";
import { COUNTRIES } from "../../../const/countries";
import {
  blankPerson, blankReferee, businessNumberLabel, initialValues, isAustralia,
  stepOfError, stepsFor, toPayload, validateAll, validateStep,
} from "./applicationModel";
import { Btn, Notice } from "../../ui";

const CONSENT_TEXT =
  "I agree to Australian Federation College collecting and handling my personal information to manage my registration and our work together, in line with the Australian Privacy Principles.";
const ETHICS_TEXT =
  "I agree to act honestly and professionally, to give students accurate and complete information, to declare any conflict of interest, and to follow the National Code of Practice for Providers of Education and Training to Overseas Students and the college's agent code of ethics.";
const TRUE_TEXT = "I confirm that the information in this application is true and complete, and that I am authorised to apply for this business.";
const ROLE_LABEL = { director: "Director", staff: "Staff", sub_agent: "Sub-agent" };

// mode "public": website page with an account step. mode "portal": an invited agent who is already signed in.
// onSubmit(payload) must resolve to { success, message?, errors? }.
const ApplicationForm = ({ mode, initial, onSubmit, accountEmail }) => {
  const steps = useMemo(() => stepsFor(mode), [mode]);
  const [values, setValues] = useState(() => initial || initialValues());
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState({});
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const top = useRef(null);

  const current = steps[step].key;
  const ctxValues = useMemo(() => ({ ...values, consentRequired: mode === "public", email: values.email || accountEmail || "" }), [values, mode, accountEmail]);
  const errors = useMemo(() => ({ ...validateStep(current, ctxValues), ...serverErrors }), [current, ctxValues, serverErrors]);
  const show = (key) => Boolean(errors[key] && (attempted[current] || touched[key] || serverErrors[key]));
  const msg = (key, hint = " ") => (show(key) ? errors[key] : hint);

  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const clearServer = (key) => setServerErrors((s) => { if (!s[key]) return s; const n = { ...s }; delete n[key]; return n; });
  const setField = (name, value) => { setValues((p) => ({ ...p, [name]: value })); clearServer(name); };
  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }));
  const setItem = (list, i, name, value) => {
    setValues((p) => ({ ...p, [list]: p[list].map((x, j) => (j === i ? { ...x, [name]: value } : x)) }));
    clearServer(`${list}.${i}.${name}`);
  };

  // a text field bound to values[name] or values[list][i][name]
  const text = (name, label, { required = true, hint, list, i, ...rest } = {}) => {
    const key = list ? `${list}.${i}.${name}` : name;
    const value = list ? values[list][i][name] : values[name];
    return (
      <TextField
        className="custom-textfield" size="small" label={label} value={value} required={required} fullWidth
        onChange={(e) => (list ? setItem(list, i, name, e.target.value) : setField(name, e.target.value))}
        onBlur={() => touch(key)} error={show(key)} helperText={msg(key, hint)} {...rest}
      />
    );
  };

  const next = () => {
    setAttempted((a) => ({ ...a, [current]: true }));
    if (Object.keys(validateStep(current, ctxValues)).length) { scrollTop(); return; }
    setStep((s) => s + 1);
    setBanner("");
    scrollTop();
  };
  const back = () => { setStep((s) => Math.max(0, s - 1)); setBanner(""); scrollTop(); };

  const submit = async () => {
    const all = validateAll(ctxValues, mode);
    const keys = Object.keys(all);
    if (keys.length) {
      const first = Math.min(...keys.map((k) => stepOfError(k, mode)));
      setAttempted(Object.fromEntries(steps.map((s) => [s.key, true])));
      setStep(first);
      setBanner("Some answers need attention. We have taken you to the first one.");
      scrollTop();
      return;
    }
    setBusy(true);
    const res = await onSubmit(toPayload(values, mode));
    setBusy(false);
    if (res.success) return;
    const errs = res.errors || {};
    setServerErrors(errs);
    const keysFromServer = Object.keys(errs);
    if (keysFromServer.length) {
      setAttempted(Object.fromEntries(steps.map((s) => [s.key, true])));
      setStep(Math.min(...keysFromServer.map((k) => stepOfError(k, mode))));
    }
    setBanner(res.message || "We could not send your application. Please try again.");
    scrollTop();
  };

  // ---------- steps ----------
  const account = (
    <>
      <p className="app-lead">First, the account you will use to sign in. We will email a link to confirm your address.</p>
      <div className="app-grid two">
        {text("first_name", "First name", { autoComplete: "given-name" })}
        {text("last_name", "Last name", { autoComplete: "family-name" })}
      </div>
      <div className="app-grid">
        {text("email", "Email", { type: "email", autoComplete: "email", hint: "We will send a confirmation link here" })}
        {text("phone", "Your phone number", { autoComplete: "tel", hint: "Include your country code if outside Australia" })}
      </div>
      <div className="app-grid two">
        {text("password", "Password", {
          type: showPassword ? "text" : "password", autoComplete: "new-password",
          hint: "8+ characters, upper and lower case, a number and one of @ $ ! % * ? &",
          InputProps: { endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>) },
        })}
        {text("confirmPassword", "Confirm password", { type: showPassword ? "text" : "password", autoComplete: "new-password" })}
      </div>
    </>
  );

  const yesNo = (name, legend, { hint } = {}) => (
    <FormControl error={show(name)} className="app-radio">
      <FormLabel>{legend}</FormLabel>
      <RadioGroup row value={values[name]} onChange={(e) => { setField(name, e.target.value); touch(name); }}>
        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
        <FormControlLabel value="no" control={<Radio />} label="No" />
      </RadioGroup>
      <FormHelperText>{msg(name, hint || " ")}</FormHelperText>
    </FormControl>
  );

  const business = (
    <>
      <p className="app-lead">These details go to the government system the college must report to (PRISMS), so please enter them exactly as registered.</p>
      <div className="app-grid">
        {text("legal_name", "Legal name of the business", { autoComplete: "organization", hint: "As it appears on your business registration" })}
        {text("trading_names", "Trading names (if different)", { required: false, hint: "Separate several names with commas" })}
      </div>
      <div className="app-grid two">
        <Autocomplete
          options={COUNTRIES} value={values.country || null}
          onChange={(e, v) => setField("country", v || "")} onBlur={() => touch("country")}
          renderInput={(params) => (
            <TextField {...params} className="custom-textfield" size="small" label="Country of business" required
              error={show("country")} helperText={msg("country")} />
          )}
        />
        {text("abn_acn", businessNumberLabel(values.country), {
          hint: isAustralia(values.country) ? "11-digit ABN or 9-digit ACN" : "Your company or business registration number",
        })}
      </div>
      {yesNo("is_body_corporate", "Is the business a body corporate (a company)?", { hint: "Choose No for a sole trader or an individual agent" })}
      <div className="app-grid">
        {text("principal_address", "Principal place of business", { multiline: true, minRows: 2, hint: "Street address, city, postcode and country" })}
        {text("registered_office_address", "Registered office address", {
          required: values.is_body_corporate === "yes", multiline: true, minRows: 2,
          hint: values.is_body_corporate === "yes" ? "Required for a company" : "Only if different from the principal place of business",
        })}
        {values.is_body_corporate === "yes" && !values.registered_office_address && values.principal_address && (
          <Btn kind="ghost" onClick={() => setField("registered_office_address", values.principal_address)}>
            Same as the principal place of business
          </Btn>
        )}
        {text("postal_address", "Postal address", { required: false, multiline: true, minRows: 2, hint: "Leave blank if the same" })}
      </div>
      <div className="app-grid two">
        {text("business_phone", "Business phone", { required: false, hint: "Leave blank to use your own phone number" })}
        {text("website", "Website", { required: false, hint: "For example https://example.com" })}
      </div>
      <div className="app-grid two">
        {text("marn", "Agency MARN (if any)", { required: false, hint: "Migration agent number, 7 digits" })}
      </div>
    </>
  );

  const people = (
    <>
      <p className="app-lead">Tell us who is in the business. We need every director and the staff who will recruit students for the college. We usually expect at least two staff.</p>
      <h3 className="app-sub">About you</h3>
      <div className="app-card">
        <FormControl className="app-radio">
          <FormLabel>Your role in the business</FormLabel>
          <RadioGroup row value={values.applicant_role} onChange={(e) => setField("applicant_role", e.target.value)}>
            <FormControlLabel value="director" control={<Radio />} label="Director or owner" />
            <FormControlLabel value="staff" control={<Radio />} label="Staff member" />
          </RadioGroup>
        </FormControl>
        <div className="app-grid two">
          {text("applicant_marn", "Your MARN (if any)", { required: false, hint: "7 digits" })}
          <FormControlLabel
            control={<Checkbox checked={values.applicant_in_enrolments} onChange={(e) => setField("applicant_in_enrolments", e.target.checked)} />}
            label="I am involved in student enrolments"
          />
        </div>
      </div>

      <h3 className="app-sub">Directors, staff and sub-agents</h3>
      {errors.people && (attempted[current] || serverErrors.people) && <Notice severity="error" sx={{ mb: 1.5 }}>{errors.people}</Notice>}
      {values.people.length === 0 && <p className="app-empty">No one added yet.</p>}
      {values.people.map((p, i) => (
        <div className="app-card" key={i}>
          <div className="app-card-head">
            <strong>{p.name.trim() || `Person ${i + 1}`}</strong>
            <IconButton aria-label="Remove this person" onClick={() => setValues((s) => ({ ...s, people: s.people.filter((_, j) => j !== i) }))}>
              <Delete />
            </IconButton>
          </div>
          <div className="app-grid two">
            {text("name", "Full name", { list: "people", i })}
            {text("email", "Email", { list: "people", i, type: "email" })}
          </div>
          <div className="app-grid two">
            <TextField select className="custom-textfield" size="small" label="Role" value={p.role} fullWidth
              onChange={(e) => setItem("people", i, "role", e.target.value)} helperText=" ">
              {Object.entries(ROLE_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </TextField>
            {text("marn", "MARN (if any)", { list: "people", i, required: false, hint: "7 digits" })}
          </div>
          {p.role === "sub_agent" && (
            <div className="app-grid">{text("location", "Location of the sub-agent", { list: "people", i, required: false, hint: "City and country" })}</div>
          )}
          <FormControlLabel
            control={<Checkbox checked={p.involved_in_enrolments} onChange={(e) => setItem("people", i, "involved_in_enrolments", e.target.checked)} />}
            label="Involved in student enrolments"
          />
        </div>
      ))}
      <Btn startIcon={<Add fontSize="small" />} disabled={values.people.length >= 30}
        onClick={() => setValues((s) => ({ ...s, people: [...s.people, blankPerson()] }))}>
        Add a person
      </Btn>
    </>
  );

  const referees = (
    <>
      <p className="app-lead">
        Please give two referees who know your business professionally, for example an education provider you have worked with. They must not be family members. The college will contact them to check your application.
      </p>
      {values.referees.map((r, i) => (
        <div className="app-card" key={i}>
          <div className="app-card-head">
            <strong>Referee {i + 1}</strong>
            {i >= 2 && (
              <IconButton aria-label="Remove this referee" onClick={() => setValues((s) => ({ ...s, referees: s.referees.filter((_, j) => j !== i) }))}>
                <Delete />
              </IconButton>
            )}
          </div>
          <div className="app-grid two">
            {text("name", "Full name", { list: "referees", i })}
            {text("organisation", "Organisation", { list: "referees", i })}
          </div>
          <div className="app-grid two">
            {text("email", "Email", { list: "referees", i, type: "email" })}
            {text("phone", "Phone", { list: "referees", i, hint: "A number we can call, with country code" })}
          </div>
        </div>
      ))}
      {values.referees.length < 3 && (
        <Btn startIcon={<Add fontSize="small" />} onClick={() => setValues((s) => ({ ...s, referees: [...s.referees, blankReferee()] }))}>
          Add a third referee (optional)
        </Btn>
      )}
    </>
  );

  const check = (name, label) => (
    <div className="app-check">
      <FormControlLabel
        control={<Checkbox checked={!!values[name]} onChange={(e) => { setField(name, e.target.checked); touch(name); }} />}
        label={label}
      />
      {show(name) && <FormHelperText error>{errors[name]}</FormHelperText>}
    </div>
  );

  const declarations = (
    <>
      <p className="app-lead">A few declarations the college is required to hold on file.</p>
      {yesNo("coi_declared", "Do you, or anyone in your business, have a conflict of interest with the college, its staff, or another education provider the college competes with?")}
      {values.coi_declared === "yes" && (
        <div className="app-grid">
          {text("coi_details", "Please describe it", { multiline: true, minRows: 3, hint: "Who is involved and what the connection is" })}
        </div>
      )}
      {check("code_of_ethics", ETHICS_TEXT)}
      {check("information_true", TRUE_TEXT)}
      {mode === "public" && check("consent", CONSENT_TEXT)}
    </>
  );

  const line = (label, value) => value ? (<div className="app-row"><span>{label}</span><strong>{value}</strong></div>) : null;
  const section = (title, stepKey, rows) => (
    <div className="app-card">
      <div className="app-card-head">
        <strong>{title}</strong>
        <Btn kind="ghost" onClick={() => setStep(steps.findIndex((s) => s.key === stepKey))}>Edit</Btn>
      </div>
      {rows}
    </div>
  );
  const review = (
    <>
      <p className="app-lead">Please check everything before you send it. You can go back and change any section.</p>
      {mode === "public" && section("Your account", "account", <>
        {line("Name", `${values.first_name} ${values.last_name}`)}{line("Email", values.email)}{line("Phone", values.phone)}</>)}
      {section("Business", "business", <>
        {line("Legal name", values.legal_name)}{line("Trading names", values.trading_names)}{line("Country", values.country)}
        {line(businessNumberLabel(values.country), values.abn_acn)}{line("Body corporate", values.is_body_corporate === "yes" ? "Yes" : "No")}
        {line("Principal place of business", values.principal_address)}{line("Registered office", values.registered_office_address)}
        {line("Postal address", values.postal_address)}{line("Business phone", values.business_phone)}
        {line("Website", values.website)}{line("Agency MARN", values.marn)}</>)}
      {section("People", "people", <>
        {line("You", `${values.applicant_role === "director" ? "Director or owner" : "Staff member"}${values.applicant_in_enrolments ? ", involved in enrolments" : ""}`)}
        {values.people.map((p, i) => <React.Fragment key={i}>{line(ROLE_LABEL[p.role], `${p.name} (${p.email})`)}</React.Fragment>)}</>)}
      {section("Referees", "referees", values.referees.map((r, i) => <React.Fragment key={i}>{line(`Referee ${i + 1}`, `${r.name}, ${r.organisation} (${r.email})`)}</React.Fragment>))}
      {section("Declarations", "declarations", <>
        {line("Conflict of interest", values.coi_declared === "yes" ? `Yes: ${values.coi_details}` : "None declared")}
        {line("Code of ethics", "Accepted")}{line("Information is correct", "Confirmed")}</>)}
    </>
  );

  const body = { account, business, people, referees, declarations, review }[current];

  return (
    <div className="app-form" ref={top}>
      <Stepper activeStep={step} alternativeLabel className="app-steps" aria-label="Progress" sx={{ mb: 2.5 }}>
        {steps.map((s) => (
          <Step key={s.key}>
            <StepLabel>{s.title}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <p className="app-step-mobile">Step {step + 1} of {steps.length}: <strong>{steps[step].title}</strong></p>

      {banner && <Notice severity="error" role="alert" sx={{ mb: 2 }}>{banner}</Notice>}
      <div className="app-body">{body}</div>

      <div className="app-actions">
        <Btn size="medium" onClick={back} disabled={step === 0 || busy}>Back</Btn>
        {current === "review" ? (
          <Btn kind="primary" size="medium" onClick={submit} disabled={busy}>
            {busy ? "Sending..." : "Submit application"}
          </Btn>
        ) : (
          <Btn kind="primary" size="medium" onClick={next}>Next</Btn>
        )}
      </div>
    </div>
  );
};

export default ApplicationForm;
