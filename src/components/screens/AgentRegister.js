import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Person,
  Lock,
  Phone,
  Visibility,
  VisibilityOff,
  Email,
  Business,
  MarkEmailRead,
} from "@mui/icons-material";
import {
  IconButton,
  TextField,
  InputAdornment,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  FormHelperText,
} from "@mui/material";

import "../styles/signUp.css";

import AuthLogo from "../AuthLogo";
import LoadingSpinner from "./LoadingSpinner";
import CustomSnackbar from "./CustomSnackbar";

import { registerAgent } from "../../services/registrationService";
import { COUNTRIES } from "../../const/countries";
import { validateSignUp } from "../../utils/validation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CONSENT_TEXT =
  "I agree to Australian Federation College collecting and handling my personal information to manage my registration and our work together, in line with the Australian Privacy Principles.";

const INITIAL_VALUES = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  agency_name: "",
  business_number: "",
  country: "",
  password: "",
  confirmPassword: "",
  consent: false,
};

// Public page for education agents. The college website links here.
const AgentRegister = () => {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const showMessage = (message, severity) => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const errors = useMemo(() => {
    const e = validateSignUp(values, "agent");
    if (!EMAIL_REGEX.test(values.email.trim())) e.email = "Enter a valid email address";
    return e;
  }, [values]);

  const showError = (name) => Boolean(errors[name] && (touched[name] || submitted));
  const setField = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const markTouched = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

  const fieldProps = (name, label, hint = " ") => ({
    className: "custom-textfield",
    size: "small",
    label,
    value: values[name],
    onChange: (e) => setField(name, e.target.value),
    onBlur: () => markTouched(name),
    error: showError(name),
    helperText: showError(name) ? errors[name] : hint,
    required: true,
  });

  const adornment = (Icon) => ({
    startAdornment: (
      <InputAdornment position="start">
        <Icon />
      </InputAdornment>
    ),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      showMessage("Please fix the highlighted fields.", "error");
      return;
    }

    const payload = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      password: values.password,
      agency_name: values.agency_name.trim(),
      business_number: values.business_number.trim(),
      country: values.country,
      consent: true,
    };

    setLoading(true);
    const res = await registerAgent(payload);
    setLoading(false);

    if (res.success) {
      setSentTo(payload.email);
      setValues(INITIAL_VALUES);
    } else {
      showMessage(res.message || "We could not register you. Please try again.", "error");
    }
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
            We sent a link to <strong>{sentTo}</strong>. Open it to confirm your email address. It can be used once and
            works for 24 hours.
          </p>
          <p className="signup-subtitle">
            After that, the college will review your registration and email you. Once approved you can sign in and sign
            your agent agreement.
          </p>
          <p className="signup-subtitle">Nothing in your inbox? Check your spam folder, or fill in the form again to get a new link.</p>
          <Link to="/signin" className="button-success signup-link-button">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ---------- the form ----------
  return (
    <div className="signup-container">
      <form className="signup-box" onSubmit={handleSubmit} noValidate>
        <AuthLogo />

        <span className="role-chip role-agent">Education agent</span>
        <h2>Register as an agent</h2>
        <p className="signup-subtitle">
          Tell us about you and your agency. We will email you a link to confirm your address, then the college reviews
          your registration.
        </p>

        <div className="form-row desktop-two">
          <TextField {...fieldProps("first_name", "First name")} autoComplete="given-name" InputProps={adornment(Person)} />
          <TextField {...fieldProps("last_name", "Last name")} autoComplete="family-name" InputProps={adornment(Person)} />
        </div>

        <div className="form-row full">
          <TextField
            {...fieldProps("email", "Email", "We will send a confirmation link here")}
            type="email"
            autoComplete="email"
            InputProps={adornment(Email)}
          />
        </div>

        <div className="form-row full">
          <TextField
            {...fieldProps("phone", "Phone number", "Include your country code if outside Australia")}
            autoComplete="tel"
            inputMode="tel"
            onChange={(e) => {
              if (/^[\d\s()+-]*$/.test(e.target.value)) setField("phone", e.target.value);
            }}
            InputProps={adornment(Phone)}
          />
        </div>

        <div className="form-row full">
          <TextField
            {...fieldProps("agency_name", "Agency or business name")}
            autoComplete="organization"
            InputProps={adornment(Business)}
          />
        </div>

        <div className="form-row desktop-two">
          <Autocomplete
            options={COUNTRIES}
            value={values.country || null}
            onChange={(e, v) => setField("country", v || "")}
            onBlur={() => markTouched("country")}
            renderInput={(params) => (
              <TextField
                {...params}
                className="custom-textfield"
                size="small"
                label="Country of business"
                required
                error={showError("country")}
                helperText={showError("country") ? errors.country : " "}
              />
            )}
          />
          <TextField
            {...fieldProps("business_number", "ABN or business number", "Optional. Your ABN if you have one")}
            required={false}
          />
        </div>

        <div className="form-row desktop-two">
          <TextField
            {...fieldProps("password", "Password", "8+ characters, upper and lower case, a number and one of @ $ ! % * ? &")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            InputProps={{
              ...adornment(Lock),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            {...fieldProps("confirmPassword", "Confirm password")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            InputProps={adornment(Lock)}
          />
        </div>

        <div className="signup-consent">
          <FormControlLabel
            control={
              <Checkbox
                checked={values.consent}
                onChange={(e) => {
                  setField("consent", e.target.checked);
                  markTouched("consent");
                }}
              />
            }
            label={CONSENT_TEXT}
          />
          {showError("consent") && <FormHelperText error>{errors.consent}</FormHelperText>}
        </div>

        <div className="button-group">
          <button type="submit" className="button-success">
            Register
          </button>
        </div>

        <p className="signin-link">
          Already registered? <Link to="/signin">Sign in</Link>
        </p>
      </form>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={loading} />
    </div>
  );
};

export default AgentRegister;
