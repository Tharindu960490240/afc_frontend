import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckCircle from "@mui/icons-material/CheckCircle";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";

// The same rules the server enforces (see PASSWORD_REGEX in utils/validation.js).
export const PASSWORD_RULES = [
  { key: "length", label: "8 or more characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "A capital letter (A–Z)", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "A small letter (a–z)", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "A number (0–9)", test: (v) => /\d/.test(v) },
  { key: "symbol", label: "A symbol, e.g. @ $ ! % * ? &", test: (v) => /[@$!%*?&]/.test(v) },
];

// 0 to 5: how many rules are met.
export const passwordScore = (value = "") => PASSWORD_RULES.filter((r) => r.test(value)).length;

const LEVELS = [
  { text: "", color: "var(--border-color)" },
  { text: "Very weak", color: "#ed1f24" },
  { text: "Weak", color: "#ed1f24" },
  { text: "Fair", color: "#d97706" },
  { text: "Good", color: "#65a30d" },
  { text: "Strong", color: "#16a34a" },
];

// Shows what a new password still needs, with a five-step bar. Place it under the password field.
export default function PasswordStrength({ value = "", sx }) {
  const score = passwordScore(value);
  const level = LEVELS[score];
  const hasOther = /[^A-Za-z\d@$!%*?&]/.test(value);

  return (
    <Box
      role="status"
      aria-live="polite"
      className="pw-strength"
      sx={{
        border: "1px solid var(--dropdown-border, var(--border-color))",
        background: "var(--side-nav-hover-bg)",
        borderRadius: "12px",
        padding: "14px 16px 12px",
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "var(--muted-color)" }}>Your password needs</Typography>
        {score > 0 && (
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: level.color }}>{level.text}</Typography>
        )}
      </Box>

      <Box aria-hidden="true" sx={{ display: "flex", gap: "6px", mb: 1.5 }}>
        {PASSWORD_RULES.map((r, i) => (
          <Box
            key={r.key}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i < score ? level.color : "var(--border-color)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </Box>

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: "6px 24px",
        }}
      >
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <Box
              component="li"
              key={r.key}
              sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 14, color: ok ? "var(--text-color)" : "var(--muted-color)" }}
            >
              {ok ? (
                <CheckCircle sx={{ fontSize: 20, color: "#16a34a" }} />
              ) : (
                <RadioButtonUnchecked sx={{ fontSize: 20, color: "var(--muted-color)" }} />
              )}
              <span>
                {r.label}
                <span style={{ position: "absolute", left: -9999 }}>{ok ? " (done)" : " (needed)"}</span>
              </span>
            </Box>
          );
        })}
      </Box>

      {hasOther && (
        <Typography sx={{ mt: 1.25, fontSize: 13, color: "var(--brand-red)" }}>
          Only letters, numbers and these symbols are allowed: @ $ ! % * ? &
        </Typography>
      )}
    </Box>
  );
}
