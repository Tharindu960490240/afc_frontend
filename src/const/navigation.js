import {
  Dashboard,
  MailOutline,
  ManageAccounts,
  Groups,
  Description,
  WorkspacePremium,
  UploadFile,
  School,
  Folder,
  Assignment,
  Person,
  AssignmentInd,
  CalendarMonth,
  FactCheck,
  Checklist,
  Settings,
  Campaign,
  Forum,
  TrackChanges,
  MenuBook,
  Tune,
  PersonAdd,
} from "@mui/icons-material";

// ===============================
// Side menu + dashboard cards, one list per role.
// This is the single place to edit when a page is built:
//   set `ready: true` and make sure `path` matches the route in App.js.
//
// item: { icon, label, text, path, ready, group? }
//   - `text` is the short line shown on the dashboard card
//   - `home: true` marks the dashboard itself (not shown as a card)
//   - `group` puts a small heading above the item in the side menu
// ===============================
// ---- Marketing & Sales (COMS Block 1) ----
const registerItem = {
  icon: AssignmentInd, label: "Agent register", text: "Every education agent, from first interest to renewal.",
  path: "/coms/agents", ready: true, group: "Marketing & Sales",
};
const holidaysItem = {
  icon: CalendarMonth, label: "Public holidays", text: "Tasmanian and Victorian holidays used for working-day deadlines.",
  path: "/coms/holidays", ready: true,
};
const auditItem = {
  icon: FactCheck, label: "Audit log", text: "See who changed what, and when.", path: "/coms/audit", ready: true,
};
const tasksItem = { icon: Checklist, label: "Tasks", text: "PRISMS, ASQAnet, website and induction deadlines.", path: "/coms/tasks", ready: true };
const applicationsItem = { icon: PersonAdd, label: "Student applications", text: "Applications from agents: assess, request more information and decide.", path: "/coms/applications", ready: true };
const inductionItem = { icon: School, label: "Induction and materials", text: "Agent induction modules, policies and the marketing materials agents download.", path: "/coms/induction", ready: true };
const broadcastItem = { icon: Campaign, label: "Updates to agents", text: "Send product, fee and policy updates to active agents.", path: "/coms/broadcasts", ready: true };
const agreementsItem = { icon: Description, label: "Agreements", text: "Read and countersign agent agreements.", path: "/admin/agreements", ready: true };
const profileItem = {
  icon: Person, label: "My profile", text: "See and update your details and change your password.",
  path: "/account/profile", ready: true,
};
const staffMenu = (...items) => [
  { icon: Dashboard, label: "Dashboard", path: "/__home__", ready: true, home: true },
  ...items,
  profileItem,
];
const withHome = (menu, home) => menu.map((i) => (i.home ? { ...i, path: home } : i));

export const NAV_ITEMS = {
  ceo: withHome(staffMenu(registerItem, applicationsItem, agreementsItem, tasksItem, inductionItem, broadcastItem, holidaysItem, auditItem), "/ceo"),
  director: withHome(staffMenu(registerItem, applicationsItem, tasksItem, inductionItem, broadcastItem, holidaysItem), "/director"),
  marketing_officer: withHome(staffMenu(registerItem, applicationsItem, tasksItem, inductionItem, broadcastItem, holidaysItem), "/marketing_officer"),
  admissions: withHome(staffMenu(registerItem, applicationsItem), "/admissions"),
  coe_admin: withHome(staffMenu(registerItem, applicationsItem, tasksItem, holidaysItem), "/coe_admin"),
  accounts: withHome(staffMenu(registerItem, applicationsItem), "/accounts"),
  compliance: withHome(staffMenu(registerItem, applicationsItem, tasksItem, inductionItem, holidaysItem, auditItem), "/compliance"),
  admin: [
    { icon: Dashboard, label: "Dashboard", path: "/admin", ready: true, home: true },
    { icon: MailOutline, label: "Invitations", text: "Send sign-up links to agents, teachers and students.", path: "/admin/invitations", ready: true, group: "People" },
    { icon: ManageAccounts, label: "Users", text: "See everyone with an account and suspend or reactivate access.", path: "/admin/users", ready: true },
    registerItem,
    applicationsItem,
    tasksItem,
    inductionItem,
    broadcastItem,
    holidaysItem,
    { icon: MenuBook, label: "Courses", text: "The courses and campuses students can apply for.", path: "/admin/courses", ready: true },
    { icon: Tune, label: "Application settings", text: "Wording, required documents and forms for student applications.", path: "/admin/application-settings", ready: true },
    auditItem,
    { icon: Settings, label: "Settings", text: "Reference questions, documents, deadlines, onboarding tasks and certificate details.", path: "/admin/settings", ready: true },
    { icon: Description, label: "Agreements", text: "Countersign agent agreements and edit the agreement template.", path: "/admin/agreements", ready: true, group: "Agreements" },
  ],
  agent: [
    { icon: Dashboard, label: "Dashboard", path: "/agent", ready: true, home: true },
    { icon: Assignment, label: "My application", text: "Complete your business details, people and referees.", path: "/agent/application", ready: true, group: "Getting started" },
    { icon: UploadFile, label: "My agreement", text: "Read and sign your agent agreement online.", path: "/agent/agreement", ready: true },
    { icon: School, label: "My induction", text: "See when your induction is and how to join it.", path: "/agent/induction", ready: true },
    { icon: PersonAdd, label: "Student applications", text: "Submit the students you recommend and follow each application.", path: "/agent/applications", ready: true, group: "Working with AFC" },
    { icon: TrackChanges, label: "My leads", text: "Log the students you are talking to and track the outcome.", path: "/agent/leads", ready: true },
    { icon: Forum, label: "Communications", text: "Everything AFC has recorded about its contact with you.", path: "/agent/communications", ready: true },
    { icon: Person, label: "My profile", text: "See and update your details and change your password.", path: "/account/profile", ready: true },
  ],
  teacher: [
    { icon: Dashboard, label: "Dashboard", path: "/teacher", ready: true, home: true },
    { icon: Groups, label: "My students", text: "See the students assigned to you.", path: "/teacher/students", ready: false },
    { icon: Folder, label: "Class materials", text: "Share and manage class resources.", path: "/teacher/materials", ready: false },
    { icon: Person, label: "My profile", text: "See and update your details and change your password.", path: "/account/profile", ready: true },
  ],
  student: [
    { icon: Dashboard, label: "Dashboard", path: "/student", ready: true, home: true },
    { icon: Assignment, label: "My application", text: "See the status of your application.", path: "/student/application", ready: false },
    { icon: Folder, label: "My documents", text: "Upload and view your documents.", path: "/student/documents", ready: false },
    { icon: WorkspacePremium, label: "Offer letter", text: "Download your offer letter when it is ready.", path: "/student/offer", ready: false },
    { icon: Person, label: "My profile", text: "See and update your details and change your password.", path: "/account/profile", ready: true },
  ],
};
