import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import CustomSnackbar from "../CustomSnackbar";
import { FormDialog, formatDate } from "../admin/shared";
import { addMyLead, getMyLeads, updateMyLead } from "../../../services/comsService";
import { COUNTRIES } from "../../../const/countries";
import { getHomeRoute } from "../../../const/roles";
import { ListTable } from "../admin/ListKit";
import { Badge, Btn, Field, Notice, TableCell, TableRow } from "../../ui";

const OUTCOMES = [{ value: "pending", label: "Pending" }, { value: "submitted", label: "Submitted" }, { value: "not_proceeding", label: "Not proceeding" }];
const TONE = { pending: "warning", submitted: "success", not_proceeding: "neutral" };
const today = () => new Date().toLocaleDateString("en-CA");

// The agent's own log of student enquiries.
const MyLeads = ({ role }) => {
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [target, setTarget] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => { const res = await getMyLeads(); setData(res.success ? res.data : { eligible: false, leads: [] }); }, []);
  useEffect(() => { load(); }, [load]);

  const open = (initial, row = null) => { setForm(initial); setErrors({}); setTarget(row); setDialog(true); };
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const submit = async () => {
    const e = {};
    if ((form.student_name || "").trim().length < 2) e.student_name = "Enter the student's name";
    if (!form.country) e.country = "Choose the country";
    if ((form.course_interest || "").trim().length < 2) e.course_interest = "Enter the course they are interested in";
    if (!form.contact_date) e.contact_date = "Choose the date you were in contact";
    if (Object.keys(e).length) return setErrors(e);
    const body = { student_name: form.student_name.trim(), country: form.country, course_interest: form.course_interest.trim(), contact_date: form.contact_date, outcome: form.outcome || "pending", notes: (form.notes || "").trim() || undefined };
    const res = await (target ? updateMyLead(target.id, body) : addMyLead(body));
    if (res.success) { setDialog(false); showMessage(target ? "Lead updated." : "Lead added."); load(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Something went wrong.", "error"); }
  };

  const leads = (data && data.leads) || [];
  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>My leads</h1>
        <p>Keep a record of the students you are talking to. Update the outcome as things move on. AFC can see this list.</p>
      </div>
      {data && !data.eligible && <Notice severity="info" sx={{ mb: 2 }}>You can log leads once the college has approved your application.</Notice>}
      {data && data.eligible && (
        <ListTable
          label="My leads"
          head={["Student", "Country", "Course", "Contact date", "Outcome", ""]}
          rows={leads}
          emptyText="You have not logged any leads yet."
          tabs={[{ value: "all", label: "All" }, ...OUTCOMES.map((o) => ({ value: o.value, label: o.label, match: (l) => l.outcome === o.value }))]}
          search={(l) => `${l.student_name} ${l.country} ${l.course_interest} ${l.notes || ""}`}
          searchPlaceholder="Student, country or course"
          actions={<Btn kind="primary" size="medium" onClick={() => open({ outcome: "pending", contact_date: today() })}>Add a lead</Btn>}
          renderRow={(l) => (
            <TableRow key={l.id}>
              <TableCell><span className="cell-main">{l.student_name}</span>{l.notes && <div className="cell-sub">{l.notes}</div>}</TableCell>
              <TableCell>{l.country}</TableCell>
              <TableCell>{l.course_interest}</TableCell>
              <TableCell>{formatDate(l.contact_date)}</TableCell>
              <TableCell><Badge tone={TONE[l.outcome]} label={(OUTCOMES.find((o) => o.value === l.outcome) || {}).label} /></TableCell>
              <TableCell>{!l.application_id && <Btn onClick={() => open({ student_name: l.student_name, country: l.country, course_interest: l.course_interest, contact_date: l.contact_date, outcome: l.outcome, notes: l.notes || "" }, l)}>Update</Btn>}</TableCell>
            </TableRow>
          )}
        />
      )}
      <FormDialog open={dialog} title={target ? "Update lead" : "Add a lead"} intro="The student's name, country, the course they want and when you were in contact." submitLabel="Save" onSubmit={submit} onCancel={() => setDialog(false)}>
        <Field id="ld-name" label="Student name" error={errors.student_name} value={form.student_name || ""} onChange={setField("student_name")} inputProps={{ maxLength: 160 }} />
        <Field id="ld-country" label="Country of origin" error={errors.country} value={form.country || ""} onChange={setField("country")} options={[{ value: "", label: "Choose a country" }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]} />
        <Field id="ld-course" label="Course of interest" error={errors.course_interest} value={form.course_interest || ""} onChange={setField("course_interest")} inputProps={{ maxLength: 200 }} />
        <Field id="ld-date" type="date" label="Contact date" error={errors.contact_date} InputLabelProps={{ shrink: true }} value={form.contact_date || ""} onChange={setField("contact_date")} inputProps={{ max: today() }} />
        <Field id="ld-out" label="Outcome" value={form.outcome || "pending"} onChange={setField("outcome")} options={OUTCOMES} />
        <Field id="ld-notes" label="Notes (optional)" multiline rows={3} value={form.notes || ""} onChange={setField("notes")} inputProps={{ maxLength: 2000 }} />
      </FormDialog>
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} />
    </div>
  );
};

export default MyLeads;
