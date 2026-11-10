import React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { theme } from "./theme";
export { default as PasswordStrength, passwordScore, PASSWORD_RULES } from "./PasswordStrength";

// ===============================
// Theme
// ===============================
// CssBaseline is not used: the portal already has its own page styles and a reset would change them.
export const AppTheme = ({ children }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;
export { CssBaseline };

// ===============================
// Buttons
// ===============================
// kind: primary (filled navy) | outline (navy outline) | danger (red outline) | dangerSolid (filled red)
//       success (green outline) | ghost (plain text)
// Works on links too: <Btn component={Link} to="/x">
const KINDS = {
  primary: { variant: "contained", color: "primary" },
  outline: { variant: "outlined", color: "primary" },
  danger: { variant: "outlined", color: "error" },
  dangerSolid: { variant: "contained", color: "error" },
  success: { variant: "outlined", color: "success" },
  ghost: { variant: "text", color: "primary" },
};

export const Btn = React.forwardRef(({ kind = "outline", size = "small", ...rest }, ref) => (
  <Button ref={ref} size={size} {...KINDS[kind]} {...rest} />
));
Btn.displayName = "Btn";

// ===============================
// Form fields
// ===============================
// Text, number, password, textarea (multiline) and select in one component.
// options: [{ value, label }]. An option with value "" is shown as the "nothing chosen" line.
// error: the message to show (a string). helper: a hint shown when there is no error.
export const Field = ({ label, error, helper, options, multiline, rows, onChange, inputProps, InputLabelProps, SelectProps, wide, className = "", ...rest }) => {
  const isSelect = Array.isArray(options);
  const hasBlank = isSelect && options.some((o) => o.value === "");
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      className={`${wide ? "is-wide " : ""}${className}`.trim() || undefined}
      label={label}
      error={Boolean(error)}
      helperText={error || helper || undefined}
      select={isSelect}
      multiline={multiline}
      minRows={multiline ? rows || 3 : undefined}
      onChange={onChange}
      inputProps={inputProps}
      InputLabelProps={hasBlank ? { shrink: true, ...InputLabelProps } : InputLabelProps}
      SelectProps={isSelect ? { displayEmpty: hasBlank, MenuProps: { disableScrollLock: true }, ...SelectProps } : undefined}
      {...rest}
    >
      {isSelect && options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );
};

// A tick box with a label (the label can be any markup) and an optional error line.
export const CheckField = ({ label, checked, onChange, error, disabled, name, id, wide }) => (
  <FormControl error={Boolean(error)} disabled={disabled} className={wide ? "is-wide" : undefined}>
    <FormControlLabel
      control={<Checkbox checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked, e)} name={name} id={id} />}
      label={label}
      sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0.5 } }}
    />
    {error && <FormHelperText>{error}</FormHelperText>}
  </FormControl>
);

// ===============================
// Surfaces
// ===============================
export const Panel = ({ className = "", children, ...rest }) => (
  <Paper component="section" variant="outlined" className={`admin-panel ${className}`.trim()} {...rest}>
    {children}
  </Paper>
);

// A message block. severity: info | success | warning | error
export const Notice = ({ severity = "info", title, children, ...rest }) => (
  <Alert severity={severity} variant="outlined" {...rest}
    sx={{ background: "var(--card-color)", color: "var(--text-color)", "& strong": { display: "block", marginBottom: "2px" }, ...(rest.sx || {}) }}>
    {title && <strong style={{ display: "block", marginBottom: 2 }}>{title}</strong>}
    {children}
  </Alert>
);

// ===============================
// Tabs and filter pills
// ===============================
// tabs: [{ value, label }]
export const TabBar = ({ value, onChange, tabs, label = "Sections" }) => (
  <Tabs value={value} onChange={(e, v) => onChange(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label={label}
    sx={{ borderBottom: "1px solid var(--border-color)" }}>
    {tabs.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
  </Tabs>
);

// ===============================
// Badges
// ===============================
const TONES = {
  info: ["rgba(40, 44, 125, 0.12)", "#282c7d", "rgba(154, 160, 255, 0.18)", "#9aa0ff"],
  success: ["rgba(22, 163, 74, 0.14)", "#15803d", "rgba(22, 163, 74, 0.14)", "#4ade80"],
  warning: ["rgba(217, 119, 6, 0.16)", "#b45309", "rgba(217, 119, 6, 0.16)", "#fbbf24"],
  danger: ["rgba(237, 31, 36, 0.13)", "#c4161b", "rgba(237, 31, 36, 0.13)", "#f87171"],
  violet: ["rgba(124, 58, 237, 0.13)", "#6d28d9", "rgba(124, 58, 237, 0.13)", "#c4b5fd"],
  sky: ["rgba(2, 132, 199, 0.14)", "#0369a1", "rgba(2, 132, 199, 0.14)", "#7dd3fc"],
  neutral: ["rgba(107, 114, 128, 0.16)", "#4b5563", "rgba(107, 114, 128, 0.16)", "#9ca3af"],
  quiet: ["var(--side-nav-hover-bg)", "var(--text-color)", "var(--side-nav-hover-bg)", "var(--text-color)"],
};

export const Badge = ({ tone = "neutral", label, ...rest }) => {
  const [bg, fg, bgDark, fgDark] = TONES[tone] || TONES.neutral;
  return (
    <Chip size="small" label={label} {...rest}
      sx={{
        height: 24, borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg,
        "& .MuiChip-label": { px: 1.25 },
        "[data-theme='dark'] &": { background: bgDark, color: fgDark },
        ...(rest.sx || {}),
      }} />
  );
};

// Which colour each status gets, in one place.
export const TONE_BY_STATUS = {
  // agent lifecycle
  prospect: "info", applied: "info", due_diligence: "violet", approved: "sky", onboarding: "sky",
  active: "success", under_review: "warning", expired: "warning", suspended: "danger", terminated: "danger", rejected: "danger",
  // invitations and users
  pending: "info", accepted: "success", revoked: "danger", pending_approval: "warning", unverified: "warning",
  // agreements
  sent: "info", submitted: "warning", cancelled: "neutral", superseded: "neutral", none: "neutral",
  // risk
  low: "success", medium: "warning", high: "danger",
};

// ===============================
// Tables
// ===============================
// head: column titles (a string, or { label, hidden: true } for the unlabelled actions column).
// Pass the rows as children. isEmpty + emptyText show a message when there are no rows.
// The "admin-table" class keeps the stacked-card layout on phones (it reads each cell's data-label).
export const DataTable = ({ head, children, isEmpty, emptyText, label = "Table" }) => (
  <TableContainer className="admin-table-wrap">
    <Table className="admin-table" aria-label={label}>
      <TableHead>
        <TableRow>
          {head.map((h, i) =>
            typeof h === "string" ? <TableCell key={h}>{h}</TableCell> : <TableCell key={i} aria-label={h.label} />
          )}
        </TableRow>
      </TableHead>
      <TableBody>{children}</TableBody>
    </Table>
    {isEmpty && <div className="admin-empty">{emptyText}</div>}
  </TableContainer>
);
export { TableRow, TableCell, TableBody, TableHead, Table, TableContainer };

// A compact field for the filter bars above lists (search box or select).
export const FilterField = ({ sx, ...rest }) => (
  <Field fullWidth={false} sx={{ minWidth: 150, ...sx }} {...rest} />
);
