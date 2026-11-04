// ===============================
// User roles
// The role always comes from the server (getProfile), never from the client.
// ===============================
export const ROLES = {
  ADMIN: "admin",
  AGENT: "agent",
  TEACHER: "teacher",
  STUDENT: "student",
  // College staff groups (Marketing & Sales block)
  CEO: "ceo",
  DIRECTOR: "director",
  MARKETING: "marketing_officer",
  ADMISSIONS: "admissions",
  COE_ADMIN: "coe_admin",
  ACCOUNTS: "accounts",
  COMPLIANCE: "compliance",
};

// Display names (used in the header and dashboards)
export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.AGENT]: "Agent",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.STUDENT]: "Student",
  [ROLES.CEO]: "CEO / PEO",
  [ROLES.DIRECTOR]: "Strategy & Growth Director",
  [ROLES.MARKETING]: "Sales & Marketing Officer",
  [ROLES.ADMISSIONS]: "Admissions",
  [ROLES.COE_ADMIN]: "Administration Manager / CoE Admin",
  [ROLES.ACCOUNTS]: "Accounts",
  [ROLES.COMPLIANCE]: "Compliance",
};

// Everyone who works for the college inside the portal
export const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.CEO,
  ROLES.DIRECTOR,
  ROLES.MARKETING,
  ROLES.ADMISSIONS,
  ROLES.COE_ADMIN,
  ROLES.ACCOUNTS,
  ROLES.COMPLIANCE,
];

// Staff roles an administrator can invite (the admin role is listed last on purpose)
export const INVITABLE_STAFF = STAFF_ROLES.filter((r) => r !== ROLES.ADMIN);

// Where each role lands after signing in.
export const ROLE_HOME = Object.fromEntries(
  Object.values(ROLES).map((r) => [r, `/${r}`]),
);

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const getHomeRoute = (role) => ROLE_HOME[normalizeRole(role)] || "/home";

export const isStaffRole = (role) => STAFF_ROLES.includes(normalizeRole(role));
