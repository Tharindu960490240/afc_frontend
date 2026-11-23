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
// ---- Shared staff items. The side menu shows a small heading wherever `group` changes. ----
const item = (icon, label, text, path) => ({ icon, label, text, path, ready: true });
const registerItem = item(AssignmentInd, "Agent register", "Every education agent, from first interest to renewal.", "/coms/agents");
const agreementsItem = item(Description, "Agreements", "Read and countersign agent agreements.", "/admin/agreements");
const broadcastItem = item(Campaign, "Updates to agents", "Send product, fee and policy updates to active agents.", "/coms/broadcasts");
const inductionItem = item(School, "Induction and materials", "Agent induction modules, policies and the marketing materials agents download.", "/coms/induction");
const applicationsItem = item(PersonAdd, "Student applications", "Applications from agents: assess, request more information and decide.", "/coms/applications");
const tasksItem = item(Checklist, "Tasks", "PRISMS, ASQAnet, website and induction deadlines.", "/coms/tasks");
const holidaysItem = item(CalendarMonth, "Public holidays", "Tasmanian and Victorian holidays used for working-day deadlines.", "/coms/holidays");
const coursesItem = item(MenuBook, "Courses", "The courses and campuses students can apply for.", "/admin/courses");
const appSettingsItem = item(Tune, "Application settings", "Wording, required documents and forms for student applications.", "/admin/application-settings");
const usersItem = item(ManageAccounts, "Users", "See everyone with an account and suspend or reactivate access.", "/admin/users");
const invitationsItem = item(MailOutline, "Invitations", "Send sign-up links to agents, teachers and students.", "/admin/invitations");
const auditItem = item(FactCheck, "Audit log", "See who changed what, and when.", "/coms/audit");
const settingsItem = item(Settings, "Settings", "Reference questions, documents, deadlines, onboarding tasks and certificate details.", "/admin/settings");
const profileItem = item(Person, "My profile", "See and update your details and change your password.", "/account/profile");

// Put a heading above the first item of each section.
const G = { agents: "Agents", students: "Students", work: "Work", setup: "College setup", people: "People and records", account: "Account" };
const sections = (...parts) => parts.flatMap(([group, ...items]) => items.map((it, i) => (i === 0 ? { ...it, group } : it)));
const staffMenu = (...parts) => [
  { icon: Dashboard, label: "Dashboard", path: "/__home__", ready: true, home: true },
  ...sections(...parts, [G.account, profileItem]),
];
const withHome = (menu, home) => menu.map((i) => (i.home ? { ...i, path: home } : i));

export const NAV_ITEMS = {
  ceo: withHome(staffMenu([G.agents, registerItem, agreementsItem, inductionItem, broadcastItem], [G.students, applicationsItem], [G.work, tasksItem], [G.setup, holidaysItem], [G.people, auditItem]), "/ceo"),
  director: withHome(staffMenu([G.agents, registerItem, inductionItem, broadcastItem], [G.students, applicationsItem], [G.work, tasksItem], [G.setup, holidaysItem]), "/director"),
  marketing_officer: withHome(staffMenu([G.agents, registerItem, inductionItem, broadcastItem], [G.students, applicationsItem], [G.work, tasksItem], [G.setup, holidaysItem]), "/marketing_officer"),
  admissions: withHome(staffMenu([G.agents, registerItem], [G.students, applicationsItem]), "/admissions"),
  coe_admin: withHome(staffMenu([G.agents, registerItem], [G.students, applicationsItem], [G.work, tasksItem], [G.setup, holidaysItem]), "/coe_admin"),
  accounts: withHome(staffMenu([G.agents, registerItem], [G.students, applicationsItem]), "/accounts"),
  compliance: withHome(staffMenu([G.agents, registerItem, inductionItem], [G.students, applicationsItem], [G.work, tasksItem], [G.setup, holidaysItem], [G.people, auditItem]), "/compliance"),
  admin: [
    { icon: Dashboard, label: "Dashboard", path: "/admin", ready: true, home: true },
    ...sections(
      [G.agents, registerItem, agreementsItem, inductionItem, broadcastItem],
      [G.students, applicationsItem, coursesItem, appSettingsItem],
      [G.work, tasksItem],
      [G.people, usersItem, invitationsItem, auditItem],
      [G.setup, holidaysItem, settingsItem],
      [G.account, profileItem],
    ),
  ],
  agent: [
    { icon: Dashboard, label: "Dashboard", path: "/agent", ready: true, home: true },
    { icon: Assignment, label: "My application", text: "Complete your business details, people and referees.", path: "/agent/application", ready: true, group: "Getting started" },
    { icon: UploadFile, label: "My agreement", text: "Read and sign your agent agreement online.", path: "/agent/agreement", ready: true },
    { icon: School, label: "My induction", text: "See when your induction is and how to join it.", path: "/agent/induction", ready: true },
    { icon: PersonAdd, label: "Student applications", text: "Submit the students you recommend and follow each application.", path: "/agent/applications", ready: true, group: "Working with AFC" },
    { icon: TrackChanges, label: "My leads", text: "Log the students you are talking to and track the outcome.", path: "/agent/leads", ready: true },
    { icon: Forum, label: "Communications", text: "Everything AFC has recorded about its contact with you.", path: "/agent/communications", ready: true },
    { icon: Person, label: "My profile", text: "See and update your details and change your password.", path: "/account/profile", ready: true, group: "Account" },
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
