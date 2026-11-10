import { createTheme } from "@mui/material/styles";

// One MUI theme for the whole portal. Colours come from the CSS variables in App.css,
// so the light/dark switch in the header keeps working without any extra code here.
const line = "var(--dropdown-border, var(--border-color))";

export const theme = createTheme({
  palette: {
    primary: { main: "#282c7d", dark: "#1a1d5c", contrastText: "#ffffff" },
    error: { main: "#ed1f24" },
    success: { main: "#1b7f4b" },
    warning: { main: "#b45309" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "inherit",
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, borderRadius: 8, whiteSpace: "nowrap", lineHeight: 1.2 },
        sizeSmall: { minHeight: 36, padding: "6px 16px", fontSize: 13.5 },
        sizeMedium: { minHeight: 42, padding: "8px 20px", fontSize: 14 },
        containedPrimary: {
          background: "var(--button-success-bg)",
          color: "var(--button-text)",
          boxShadow: "0 2px 6px rgba(40, 44, 125, 0.28)",
          "&:hover": { filter: "brightness(1.1)", boxShadow: "0 3px 10px rgba(40, 44, 125, 0.35)" },
        },
        containedError: {
          background: "var(--button-error-bg)",
          boxShadow: "0 2px 6px rgba(237, 31, 36, 0.3)",
          "&:hover": { filter: "brightness(1.1)" },
        },
        outlinedPrimary: {
          borderWidth: 1.5,
          borderColor: "var(--link-color)",
          color: "var(--link-color)",
          background: "var(--card-color)",
          "&:hover": { borderWidth: 1.5, background: "var(--link-color)", borderColor: "var(--link-color)", color: "var(--card-color)" },
        },
        outlinedError: {
          borderWidth: 1.5,
          background: "var(--card-color)",
          "&:hover": { borderWidth: 1.5, background: "var(--brand-red)", color: "#fff" },
        },
        outlinedSuccess: {
          borderWidth: 1.5,
          background: "var(--card-color)",
          "&:hover": { borderWidth: 1.5, background: "#1b7f4b", color: "#fff" },
        },
        textPrimary: { color: "var(--link-color)" },
      },
    },
    MuiTextField: { defaultProps: { fullWidth: true, size: "small", variant: "outlined" } },
    MuiInputLabel: {
      styleOverrides: { root: { color: "var(--muted-color)", fontSize: 14, "&.Mui-focused": { color: "var(--link-color)" }, "&.Mui-error": { color: "var(--brand-red)" } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "var(--card-color)",
          color: "var(--text-color)",
          fontSize: 14,
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: line },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--link-color)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "var(--link-color)", borderWidth: 2 },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: "var(--brand-red)" },
          "&.Mui-disabled": { opacity: 0.7 },
        },
        input: { "&::placeholder": { color: "var(--muted-color)", opacity: 1 } },
      },
    },
    MuiSelect: { styleOverrides: { icon: { color: "var(--muted-color)" } } },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, marginRight: 2, fontSize: 12, "&.Mui-error": { color: "var(--brand-red)" } } } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: 14, color: "var(--text-color)" } } },
    MuiCheckbox: { styleOverrides: { root: { color: "var(--muted-color)", "&.Mui-checked": { color: "var(--link-color)" } } } },
    MuiRadio: { styleOverrides: { root: { color: "var(--muted-color)", "&.Mui-checked": { color: "var(--link-color)" } } } },
    MuiMenu: { styleOverrides: { paper: { background: "var(--card-color)", color: "var(--text-color)", border: `1px solid ${line}` } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: 14, "&:hover": { background: "var(--side-nav-hover-bg)" }, "&.Mui-selected": { background: "var(--side-nav-active-bg)" } } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiDialog: { styleOverrides: { paper: { background: "var(--card-color)", color: "var(--text-color)", borderRadius: 14 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 18, fontWeight: 700, color: "var(--text-color)" } } },
    MuiDialogActions: { styleOverrides: { root: { padding: "0 24px 20px", gap: 6 } } },
    MuiTableContainer: { styleOverrides: { root: { border: "1px solid var(--border-color)", borderRadius: 10, background: "var(--card-color)" } } },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: 14, color: "var(--text-color)", borderBottom: "1px solid var(--border-color)", padding: "12px 14px" },
        head: {
          fontSize: 12, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 700, whiteSpace: "nowrap",
          color: "var(--muted-color)", background: "var(--side-nav-hover-bg)",
        },
      },
    },
    MuiTableRow: { styleOverrides: { root: { "&:last-child td": { borderBottom: 0 }, "tbody &:hover": { background: "var(--side-nav-hover-bg)" } } } },
    MuiTabs: { styleOverrides: { indicator: { background: "var(--link-color)", height: 3 }, root: { minHeight: 42 } } },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, fontSize: 14, minHeight: 42, color: "var(--muted-color)", "&.Mui-selected": { color: "var(--link-color)" } },
      },
    },
    MuiPaginationItem: {
      styleOverrides: { root: { color: "var(--text-color)", "&.Mui-selected": { background: "var(--link-color)", color: "var(--card-color)", "&:hover": { background: "var(--link-hover-color)" } } } },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10, fontSize: 14, alignItems: "flex-start" } } },
    MuiStepLabel: { styleOverrides: { label: { color: "var(--muted-color)", "&.Mui-active, &.Mui-completed": { color: "var(--text-color)", fontWeight: 700 } } } },
    MuiStepIcon: { styleOverrides: { root: { "&.Mui-active, &.Mui-completed": { color: "var(--link-color)" } } } },
    MuiDivider: { styleOverrides: { root: { borderColor: "var(--border-color)" } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12 } } },
  },
});
