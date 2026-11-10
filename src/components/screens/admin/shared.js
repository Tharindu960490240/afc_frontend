import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Pagination from "@mui/material/Pagination";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Typography from "@mui/material/Typography";
import { Badge, Btn, CheckField, Field, TONE_BY_STATUS } from "../../ui";

// 12 Nov 2026
const toDate = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
};

// "Export CSV" button used on the list screens (NF-13). `run` starts the download and returns { success, message }.
export const ExportButton = ({ run, onError, label = "Export CSV" }) => {
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    const res = await run();
    setBusy(false);
    if (!res.success && onError) onError(res.message || "Could not export.");
  };
  return (
    <Btn onClick={click} disabled={busy}>
      {busy ? "Preparing..." : label}
    </Btn>
  );
};

export const formatDate = (value) => {
  if (!value) return "-";
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// 12 Nov 2026, 3:45 pm
export const formatDateTime = (value) => {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const ConfirmDialog = ({
  open,
  title,
  text,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>{text}</Typography>
    </DialogContent>
    <DialogActions>
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn kind={danger ? "dangerSolid" : "primary"} onClick={onConfirm}>
        {confirmLabel}
      </Btn>
    </DialogActions>
  </Dialog>
);

// "1-20 of 134" with page numbers.
export const Pager = ({ page, limit, total, onChange, disabled }) => {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <div className="admin-pager">
      <span>
        {from}-{to} of {total}
      </span>
      {pages > 1 && (
        <Pagination
          count={pages}
          page={page}
          disabled={disabled}
          onChange={(e, p) => onChange(p)}
          color="primary"
          shape="rounded"
          size="small"
          showFirstButton
          showLastButton
        />
      )}
    </div>
  );
};

// ===============================
// Agreements: shared pieces
// ===============================
const STATUS_LABELS = {
  admin: {
    none: "No agreement",
    sent: "Waiting for agent",
    submitted: "Needs countersigning",
    rejected: "Changes requested",
    active: "Active",
    expired: "Expired",
    cancelled: "Cancelled",
    superseded: "Replaced",
  },
  agent: {
    none: "No agreement",
    sent: "Ready to sign",
    submitted: "Awaiting college",
    rejected: "Changes needed",
    active: "Active",
    expired: "Expired",
    cancelled: "Withdrawn",
    superseded: "Replaced",
  },
};

export const StatusBadge = ({ status, view = "admin" }) => {
  const key = status || "none";
  return <Badge tone={TONE_BY_STATUS[key] || "neutral"} label={STATUS_LABELS[view][key] || key} />;
};

export const FILE_KIND_LABELS = {
  template: "Agreement from the college",
  signed_by_agent: "Signed by the agent",
  countersigned: "Countersigned by the college",
  final: "Final signed agreement",
};

export const EVENT_LABELS = {
  sent: "Agreement sent",
  submitted: "Signed by the agent",
  rejected: "Changes requested",
  approved: "Countersigned by the college",
  cancelled: "Cancelled",
};

export const formatBytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

// ===============================
// Reading and signing inside the portal
// ===============================
// Shows the agreement wording (blocks come from the API: h1, h2, p).
export const AgreementDocument = ({ blocks = [] }) => (
  <article className="agreement-doc" aria-label="Agreement text">
    {blocks.map((b, i) =>
      b.type === "h1" ? (
        <h2 key={i} className="agreement-doc-title">{b.text}</h2>
      ) : b.type === "h2" ? (
        <h3 key={i}>{b.text}</h3>
      ) : (
        <p key={i}>{b.text}</p>
      )
    )}
  </article>
);

// A small drawing box. Calls onChange with a PNG data URL, or "" when empty.
export const SignaturePad = ({ onChange, disabled = false }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b1f2a";
  }, []);

  const point = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01); // a tap leaves a dot
    ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasInk(true);
    onChange(canvasRef.current.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange("");
  };

  return (
    <div className="sig-pad">
      <canvas
        ref={canvasRef}
        width={560}
        height={160}
        aria-label="Draw your signature here"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <div className="sig-pad-bar">
        <span>{hasInk ? "Looks good" : "Draw with your mouse, finger or pen (optional)"}</span>
        <Btn onClick={clear} disabled={!hasInk}>
          Clear
        </Btn>
      </div>
    </div>
  );
};

// Typed name + optional drawing + the "I agree" tick box.
// value: { name, position, image, accepted }. errors: { signed_name, accept, position }
export const SignatureFields = ({ value, onChange, errors = {}, withPosition = false, statement }) => (
  <div className="sig-fields">
    <div>
      <Field
        id="sig-name"
        label="Type your full name"
        autoComplete="name"
        value={value.name}
        inputProps={{ maxLength: 120 }}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        error={errors.signed_name}
      />
      {value.name.trim() && <div className="sig-preview" aria-hidden="true">{value.name}</div>}
    </div>

    {withPosition && (
      <Field
        id="sig-position"
        label="Your position"
        placeholder="For example: Director"
        value={value.position}
        inputProps={{ maxLength: 120 }}
        onChange={(e) => onChange({ ...value, position: e.target.value })}
        error={errors.position}
      />
    )}

    <div className="admin-field">
      <label>Draw your signature (optional)</label>
      <SignaturePad onChange={(image) => onChange({ ...value, image })} />
      {errors.signature_image && <span className="admin-error">{errors.signature_image}</span>}
    </div>

    <CheckField
      checked={value.accepted}
      onChange={(accepted) => onChange({ ...value, accepted })}
      label={statement}
      error={errors.accept}
    />
  </div>
);

export const EMPTY_SIGNATURE = { name: "", position: "", image: "", accepted: false };

// Checks the signing form before sending. Returns an errors object (empty when fine).
export const checkSignature = (value, withPosition = false) => {
  const e = {};
  if (value.name.trim().length < 2) e.signed_name = "Please type your full name";
  if (withPosition && value.position.trim().length < 2) e.position = "Please enter your position";
  if (!value.accepted) e.accept = "Please tick the box to confirm";
  return e;
};

// Shows who signed and when, for both parties.
export const SignatureSummary = ({ data }) => (
  <div className="sig-summary">
    {[
      { label: "Agent", name: data.agent_sig_name, at: data.agent_signed_at, extra: data.agency_name },
      { label: "College", name: data.admin_sig_name, at: data.admin_signed_at, extra: data.admin_sig_position },
    ].map((x) => (
      <div key={x.label} className={`sig-summary-item${x.name ? " is-signed" : ""}`}>
        <span>{x.label}</span>
        {x.name ? (
          <>
            <strong>{x.name}</strong>
            {x.extra && <em>{x.extra}</em>}
            <small>Signed {formatDateTime(x.at)}</small>
          </>
        ) : (
          <strong className="is-waiting">Not signed yet</strong>
        )}
      </div>
    ))}
  </div>
);

// A popup with a form. onSubmit runs when the button is pressed.
export const FormDialog = ({
  open,
  title,
  intro,
  children,
  submitLabel,
  danger = false,
  onSubmit,
  onCancel,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {intro && <Typography sx={{ fontSize: 14, lineHeight: 1.6, mb: 2 }}>{intro}</Typography>}
        <div className="dialog-form" style={{ paddingTop: 6 }}>{children}</div>
      </DialogContent>
      <DialogActions>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" kind={danger ? "dangerSolid" : "primary"}>
          {submitLabel}
        </Btn>
      </DialogActions>
    </form>
  </Dialog>
);

// Progress line for the agent: Sent -> You sign -> College review -> Active
const STEPS = ["Sent to you", "You sign", "College signs", "Active"];
const STEP_INDEX = { sent: 1, rejected: 1, submitted: 2, active: 3, expired: 3 };

export const AgreementSteps = ({ status }) => {
  const current = STEP_INDEX[status] ?? 0;
  const finished = status === "active";
  return (
    <Stepper activeStep={finished ? STEPS.length : current} alternativeLabel aria-label="Agreement progress" sx={{ mb: 2 }}>
      {STEPS.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};
