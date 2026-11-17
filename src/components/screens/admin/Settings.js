import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack, ArrowDownward, ArrowUpward } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { ROLE_LABELS } from "../../../const/roles";
import {
  getSettings, removeSignature, saveCollege, saveDocumentTypes, saveOnboardingTasks, saveQuestions, saveSignature, saveTimers,
} from "../../../services/settingsService";
import { Btn, CheckField, Field, Notice, Panel, TabBar } from "../../ui";

const TABS = [
  { value: "questions", label: "Reference questions" },
  { value: "documents", label: "Documents" },
  { value: "timers", label: "Deadlines" },
  { value: "tasks", label: "Onboarding tasks" },
  { value: "college", label: "College and certificate" },
];

let uid = 0;
const withId = (list) => list.map((x) => ({ ...x, _id: ++uid }));
const strip = (list) => list.map(({ _id, ...rest }) => rest);
const move = (list, i, d) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
const fieldErrors = (res) => {
  const out = {};
  Object.entries(res.errors || {}).forEach(([k, v]) => { out[k] = v; });
  return out;
};

// one row of a list the admin can reorder, with a card around it
const Row = ({ children, onUp, onDown, off }) => (
  <div className="app-card" style={off ? { opacity: 0.6 } : undefined}>
    <div className="field-grid">{children}</div>
    {(onUp || onDown) && (
      <div className="record-head" style={{ marginTop: 8 }}>
        <Btn size="small" onClick={onUp} disabled={!onUp} aria-label="Move up"><ArrowUpward fontSize="small" /></Btn>
        <Btn size="small" onClick={onDown} disabled={!onDown} aria-label="Move down"><ArrowDownward fontSize="small" /></Btn>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------- reference questions
const Questions = ({ data, save, busy, errors }) => {
  const [items, setItems] = useState(() => withId(data.reference_questions));
  useEffect(() => { setItems(withId(data.reference_questions)); }, [data.reference_questions]);
  const set = (i, patch) => setItems((l) => l.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const scored = (q) => q.type === "yesno" && q.favourable !== null && q.favourable !== undefined;
  return (
    <Panel>
      <h2>Reference questions</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        These are asked of every referee, on the emailed form and in phone checks. A reference is <strong>positive</strong> when every question with a
        "good answer" got that answer. Questions cannot be deleted, only switched off, so earlier references keep the wording they were answered with.
      </p>
      {errors.items && <Notice severity="error">{errors.items}</Notice>}
      {items.map((q, i) => (
        <Row key={q._id} off={!q.active} onUp={i > 0 ? () => setItems((l) => move(l, i, -1)) : null} onDown={i < items.length - 1 ? () => setItems((l) => move(l, i, 1)) : null}>
          <Field id={`q-${q._id}`} wide multiline rows={2} label="Question" value={q.label} error={errors[`items.${i}.label`]} onChange={(e) => set(i, { label: e.target.value })} inputProps={{ maxLength: 400 }} />
          <Field id={`qt-${q._id}`} label="Answer type" value={q.type} onChange={(e) => set(i, { type: e.target.value, favourable: e.target.value === "yesno" ? q.favourable : null })}
            options={[{ value: "yesno", label: "Yes or No" }, { value: "text", label: "Written answer" }]} />
          {q.type === "yesno" && (
            <Field id={`qf-${q._id}`} label="Good answer" value={q.favourable === true ? "yes" : q.favourable === false ? "no" : ""}
              onChange={(e) => set(i, { favourable: e.target.value === "yes" ? true : e.target.value === "no" ? false : null, ask_details: e.target.value ? q.ask_details : false })}
              options={[{ value: "", label: "Not scored (information only)" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          )}
          <CheckField label="Must be answered" checked={q.required} onChange={(v) => set(i, { required: v })} />
          {scored(q) && <CheckField label="Ask for details when the answer is not the good one" checked={!!q.ask_details} onChange={(v) => set(i, { ask_details: v })} />}
          <CheckField label="Switched on" checked={q.active} onChange={(v) => set(i, { active: v })} />
        </Row>
      ))}
      <div className="record-head">
        <Btn onClick={() => setItems((l) => [...l, ...withId([{ label: "", type: "yesno", required: true, favourable: null, ask_details: false, active: true }])])}>Add a question</Btn>
        <Btn kind="primary" size="medium" disabled={busy} onClick={() => save(saveQuestions(strip(items)), "Reference questions saved.")}>Save questions</Btn>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------- document types
const Documents = ({ data, save, busy, errors }) => {
  const [items, setItems] = useState(() => withId(data.document_types));
  useEffect(() => { setItems(withId(data.document_types)); }, [data.document_types]);
  const set = (i, patch) => setItems((l) => l.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <Panel>
      <h2>Documents in the agent folder</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        "Must be accepted" documents have to be received and accepted before an application can be approved. The short name is used when a file is
        named in the folder (for example "Agency - Police clearance - 2026-11-17.pdf"). Document types cannot be deleted, only switched off.
      </p>
      {errors.items && <Notice severity="error">{errors.items}</Notice>}
      {items.map((d, i) => (
        <Row key={d._id} off={!d.active} onUp={i > 0 ? () => setItems((l) => move(l, i, -1)) : null} onDown={i < items.length - 1 ? () => setItems((l) => move(l, i, 1)) : null}>
          <Field id={`d-${d._id}`} label="Document name" value={d.label} error={errors[`items.${i}.label`]} onChange={(e) => set(i, { label: e.target.value })} inputProps={{ maxLength: 160 }} />
          <Field id={`dn-${d._id}`} label="Short name for the file" value={d.file_name} error={errors[`items.${i}.file_name`]} onChange={(e) => set(i, { file_name: e.target.value })} inputProps={{ maxLength: 80 }} />
          <CheckField label="Must be accepted before approval" checked={d.required} disabled={d.key === "other"} error={errors[`items.${i}.required`]} onChange={(v) => set(i, { required: v, active: v ? true : d.active })} />
          <CheckField label="Switched on" checked={d.active} disabled={d.key === "other"} onChange={(v) => set(i, { active: v, required: v ? d.required : false })} />
        </Row>
      ))}
      <div className="record-head">
        <Btn onClick={() => setItems((l) => [...l, ...withId([{ label: "", file_name: "", required: false, active: true }])])}>Add a document type</Btn>
        <Btn kind="primary" size="medium" disabled={busy} onClick={() => save(saveDocumentTypes(strip(items)), "Document types saved.")}>Save documents</Btn>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------- timers
const TIMER_FIELDS = [
  ["ack_days", "Acknowledge an application within (working days)", 1, 30],
  ["decision_days", "Decide an application within (working days)", 1, 60],
  ["amber_after_days", "Show the amber warning from working day", 1, 60],
  ["referee_link_days", "Referee form link stays valid for (days)", 1, 90],
  ["referee_reminder_days", "Remind a referee every (working days)", 1, 30],
  ["referee_max_reminders", "Reminders per referee (at most)", 0, 10],
  ["task_escalation_days", "Registration task: escalate to a manager on working day", 1, 30],
];
const Timers = ({ data, save, busy, errors }) => {
  const [v, setV] = useState(() => ({ ...data.timers }));
  useEffect(() => { setV({ ...data.timers }); }, [data.timers]);
  return (
    <Panel>
      <h2>Deadlines and reminders</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        The clock starts when an application is received. Changes apply to applications received from now on; the red and amber warnings use the
        new values straight away.
      </p>
      <div className="field-grid">
        {TIMER_FIELDS.map(([k, label, min, max]) => (
          <Field key={k} id={`t-${k}`} type="number" label={label} value={v[k] ?? ""} error={errors[k]} inputProps={{ min, max }}
            onChange={(e) => setV({ ...v, [k]: e.target.value === "" ? "" : Number(e.target.value) })} />
        ))}
      </div>
      <div className="record-head" style={{ marginTop: 12 }}>
        <Btn kind="primary" size="medium" disabled={busy} onClick={() => save(saveTimers(v), "Deadlines saved.")}>Save deadlines</Btn>
        <Btn onClick={() => setV({ ...data.timer_defaults })}>Use the standard values</Btn>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------- onboarding tasks
const MUST_STAY_ON = ["PRISMS_ADD", "INDUCTION"];
const TASK_NAMES = {
  PRISMS_ADD: "Add the agent to PRISMS", ASQANET_START: "Report the agent to ASQAnet", WEBSITE_ADD: "List the agent on the website",
  COMMISSION_REPORT: "Report commission and bonus to Accounts", INDUCTION: "Agent induction",
};
const Tasks = ({ data, save, busy, errors }) => {
  const [items, setItems] = useState(() => data.onboarding_tasks.map((x) => ({ ...x })));
  useEffect(() => { setItems(data.onboarding_tasks.map((x) => ({ ...x }))); }, [data.onboarding_tasks]);
  const set = (i, patch) => setItems((l) => l.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const roles = data.roles.map((r) => ({ value: r, label: ROLE_LABELS[r] || r }));
  return (
    <Panel>
      <h2>Tasks created when an agreement is countersigned</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        Use <strong>{"{agent}"}</strong> in a task name to insert the agency name. Everyone in the chosen role is told about the task. Registration tasks (PRISMS, ASQAnet, website) are escalated to a manager on the working day set under Deadlines, and after the deadline only a manager can close them. Changes apply to agreements countersigned from now on.
      </p>
      {items.map((t, i) => (
        <div className="app-card" key={t.type} style={!t.enabled ? { opacity: 0.6 } : undefined}>
          <div className="app-card-head"><strong>{TASK_NAMES[t.type] || t.type}</strong></div>
          <div className="field-grid">
            <Field id={`tk-${t.type}`} wide label="Task name" value={t.title} error={errors[`items.${i}.title`]} onChange={(e) => set(i, { title: e.target.value })} inputProps={{ maxLength: 200 }} />
            <Field id={`tr-${t.type}`} label="Owner role" value={t.owner_role} error={errors[`items.${i}.owner_role`]} onChange={(e) => set(i, { owner_role: e.target.value })} options={roles} />
            <Field id={`td-${t.type}`} type="number" label="Due after (days)" value={t.due_days} inputProps={{ min: 1, max: 120 }} onChange={(e) => set(i, { due_days: Number(e.target.value) })} />
            <Field id={`tb-${t.type}`} label="Counted in" value={t.due_basis} onChange={(e) => set(i, { due_basis: e.target.value })}
              options={[{ value: "business", label: "Working days" }, { value: "calendar", label: "Calendar days" }]} />
            <CheckField label="Prefer the agent's account manager as owner" checked={t.prefer_account_manager} onChange={(v) => set(i, { prefer_account_manager: v })} />
            <CheckField label={MUST_STAY_ON.includes(t.type) ? "Switched on (needed to make the agent Active)" : "Switched on"} checked={t.enabled}
              disabled={MUST_STAY_ON.includes(t.type)} error={errors[`items.${i}.enabled`]} onChange={(v) => set(i, { enabled: v })} />
          </div>
        </div>
      ))}
      <div className="record-head">
        <Btn kind="primary" size="medium" disabled={busy} onClick={() => save(saveOnboardingTasks(items), "Onboarding tasks saved.")}>Save tasks</Btn>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------- college details and certificate
const College = ({ data, save, busy, errors, showMessage }) => {
  const toForm = (c) => ({ ...c, campuses: (c.campuses || []).join("\n") });
  const [v, setV] = useState(() => toForm(data.college));
  useEffect(() => { setV(toForm(data.college)); }, [data.college]);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const pick = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") return showMessage("Choose a PNG image (a signature on a transparent background looks best).", "error");
    if (file.size > 140 * 1024) return showMessage("The image is too large. Keep it under 140 KB.", "error");
    const reader = new FileReader();
    reader.onload = () => save(saveSignature(String(reader.result)), "Signature saved.");
    reader.readAsDataURL(file);
  };
  return (
    <>
      <Panel>
        <h2>College details</h2>
        <p className="admin-hint" style={{ marginTop: 0 }}>
          Shown in emails, the agreement, the application PDF and the certificate. Leave a box empty to use the standard value.
        </p>
        <div className="field-grid">
          <Field id="c-name" label="College name" value={v.name || ""} onChange={set("name")} error={errors.name} />
          <Field id="c-abn" label="ABN" value={v.abn || ""} onChange={set("abn")} error={errors.abn} />
          <Field id="c-rto" label="RTO code" value={v.rto || ""} onChange={set("rto")} error={errors.rto} />
          <Field id="c-cricos" label="CRICOS provider number" value={v.cricos || ""} onChange={set("cricos")} error={errors.cricos} />
          <Field id="c-phone" label="Phone" value={v.phone || ""} onChange={set("phone")} error={errors.phone} />
          <Field id="c-email" label="Email" value={v.email || ""} onChange={set("email")} error={errors.email} />
          <Field id="c-web" label="Website address" value={v.website || ""} onChange={set("website")} error={errors.website} />
          <Field id="c-weblabel" label="Website as shown (for example www.afcollege.edu.au)" value={v.websiteLabel || ""} onChange={set("websiteLabel")} error={errors.websiteLabel} />
          <Field id="c-campuses" wide multiline rows={3} label="Campus addresses (one per line)" value={v.campuses} onChange={set("campuses")} error={errors.campuses} />
        </div>
      </Panel>
      <Panel>
        <h2>Certificate of Appointment signatory</h2>
        <div className="field-grid">
          <Field id="c-sname" label="Name" value={v.signer_name || ""} onChange={set("signer_name")} error={errors.signer_name} />
          <Field id="c-spos" label="Position" value={v.signer_position || ""} onChange={set("signer_position")} error={errors.signer_position} />
        </div>
        <p className="admin-hint">
          Signature image: {data.has_custom_signature ? "a custom image is in use." : "the standard signature is in use."} Use a PNG with a transparent
          background, under 140 KB.
        </p>
        <div className="record-head">
          <Btn component="label" disabled={busy}>
            Upload a signature (PNG)
            <input hidden type="file" accept="image/png" onChange={pick} />
          </Btn>
          {data.has_custom_signature && <Btn disabled={busy} onClick={() => save(removeSignature(), "Back to the standard signature.")}>Use the standard signature</Btn>}
        </div>
      </Panel>
      <div className="record-head">
        <Btn kind="primary" size="medium" disabled={busy}
          onClick={() => save(saveCollege({ ...v, campuses: v.campuses.split("\n").map((s) => s.trim()).filter(Boolean) }), "College details saved.")}>
          Save college details
        </Btn>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- page
const Settings = () => {
  const [tab, setTab] = useState("questions");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => {
    const res = await getSettings();
    if (res.success) setData(res.data);
    else showMessage(res.message || "Could not load the settings.", "error");
  }, []);
  useEffect(() => { load(); }, [load]);

  // every Save button hands its request here
  const save = async (request, done) => {
    setBusy(true);
    setErrors({});
    const res = await request;
    setBusy(false);
    if (res.success) {
      setData(res.data);
      showMessage(done);
    } else {
      setErrors(fieldErrors(res));
      showMessage(res.message || "Could not save.", "error");
    }
  };

  return (
    <div className="admin-page">
      <Link to="/admin" className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Settings</h1>
        <p>Change what the system asks and how long things take, without a code change. Every change is recorded in the audit log.</p>
      </div>
      {!data ? <LoadingSpinner /> : (
        <>
          <TabBar value={tab} onChange={(v) => { setTab(v); setErrors({}); }} tabs={TABS} label="Settings sections" />
          <div style={{ marginTop: 16 }}>
            {tab === "questions" && <Questions data={data} save={save} busy={busy} errors={errors} />}
            {tab === "documents" && <Documents data={data} save={save} busy={busy} errors={errors} />}
            {tab === "timers" && <Timers data={data} save={save} busy={busy} errors={errors} />}
            {tab === "tasks" && <Tasks data={data} save={save} busy={busy} errors={errors} />}
            {tab === "college" && <College data={data} save={save} busy={busy} errors={errors} showMessage={showMessage} />}
          </div>
        </>
      )}
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default Settings;
