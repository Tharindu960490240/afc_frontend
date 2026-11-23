import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { getHomeRoute } from "../../../const/roles";
import { addCourse, listCourses, saveCourse } from "../../../services/courseService";
import { Badge, Btn, CheckField, DataTable, Field, Notice, Panel, TableCell, TableRow } from "../../ui";

const TYPES = [
  { value: "VET", label: "VET (nationally recognised course)" },
  { value: "ELICOS", label: "ELICOS (General English)" },
];
const EMPTY = { code: "", name: "", specialisation: "", course_type: "VET", cricos_code: "", duration_weeks: "", tuition_fee: "", entry_requirements: "", campus_ids: [], active: true };

const toForm = (c) => ({
  code: c.code || "", name: c.name, specialisation: c.specialisation || "", course_type: c.course_type, cricos_code: c.cricos_code || "",
  duration_weeks: c.duration_weeks ?? "", tuition_fee: c.tuition_fee ?? "", entry_requirements: c.entry_requirements || "",
  campus_ids: (c.campus_ids || []).map(Number), active: c.active,
});

// Everything the API needs; blank boxes are left out so they stay empty.
const toPayload = (f) => {
  const p = { name: f.name.trim(), course_type: f.course_type, campus_ids: f.campus_ids, active: f.active };
  ["code", "specialisation", "cricos_code", "entry_requirements"].forEach((k) => { if (String(f[k]).trim()) p[k] = String(f[k]).trim(); });
  ["duration_weeks", "tuition_fee"].forEach((k) => { if (String(f[k]).trim() !== "") p[k] = Number(f[k]); });
  return p;
};

const Courses = ({ role }) => {
  const [data, setData] = useState({ campuses: [], courses: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id|null, form }
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const load = useCallback(async () => {
    const res = await listCourses();
    setLoading(false);
    if (res.success) setData(res.data);
    else showMessage(res.message || "Could not load the courses.", "error");
  }, []);
  useEffect(() => { load(); }, [load]);

  const campusName = (id) => (data.campuses.find((c) => Number(c.id) === Number(id)) || {}).name || "";
  const open = (course) => { setErrors({}); setEditing(course ? { id: course.id, form: toForm(course) } : { id: null, form: { ...EMPTY } }); };
  const set = (patch) => setEditing((e) => ({ ...e, form: { ...e.form, ...patch } }));
  const toggleCampus = (id, on) => set({ campus_ids: on ? [...editing.form.campus_ids, id] : editing.form.campus_ids.filter((x) => x !== id) });

  const save = async () => {
    const f = editing.form;
    const e = {};
    if (f.name.trim().length < 3) e.name = "Enter the course name";
    if (f.course_type === "VET" && !f.code.trim()) e.code = "Enter the course code";
    if (!f.campus_ids.length) e.campus_ids = "Choose at least one campus";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = editing.id ? await saveCourse(editing.id, toPayload(f)) : await addCourse(toPayload(f));
    setBusy(false);
    if (res.success) {
      setEditing(null);
      showMessage(res.message || "Saved.");
      load();
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Could not save the course.", "error");
    }
  };

  const f = editing ? editing.form : null;
  const missing = data.courses.filter((c) => c.active && (!c.cricos_code || !c.duration_weeks || c.tuition_fee == null)).length;

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Courses</h1>
        <p>
          The courses students can apply for, and the campus each one runs at. They are taken from the AFC Application for Enrolment Form
          (International) V3.1. Agents choose from this list when they submit a student application. A course is switched off, never deleted.
        </p>
      </div>

      {!loading && missing > 0 && (
        <Notice severity="info" sx={{ mb: 2 }}>
          <strong>{missing} courses still need CRICOS code, duration or tuition fee</strong>
          These are not on the enrolment form. Add them as AFC provides them; they are used on the Letter of Offer.
        </Notice>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn kind="primary" onClick={() => open(null)}>Add a course</Btn>
      </div>

      {loading ? <LoadingSpinner /> : (
        <Panel>
          <DataTable
            label="Courses"
            head={["Code", "Course", "Campuses", "CRICOS", "Weeks", "Fee", "Status", ""]}
            isEmpty={!data.courses.length}
            emptyText="No courses yet."
          >
            {data.courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.code || (c.course_type === "ELICOS" ? "ELICOS" : "")}</TableCell>
                <TableCell>
                  {c.name}
                  {c.specialisation && <div className="admin-hint" style={{ margin: 0 }}>{c.specialisation}</div>}
                </TableCell>
                <TableCell>{(c.campus_ids || []).map(campusName).join(", ")}</TableCell>
                <TableCell>{c.cricos_code || "-"}</TableCell>
                <TableCell>{c.duration_weeks || "-"}</TableCell>
                <TableCell>{c.tuition_fee == null ? "-" : `$${Number(c.tuition_fee).toLocaleString("en-AU")}`}</TableCell>
                <TableCell><Badge tone={c.active ? "success" : "neutral"} label={c.active ? "On" : "Off"} /></TableCell>
                <TableCell><Btn onClick={() => open(c)}>Edit</Btn></TableCell>
              </TableRow>
            ))}
          </DataTable>
        </Panel>
      )}

      <Dialog open={Boolean(editing)} onClose={() => !busy && setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing && editing.id ? "Edit course" : "Add a course"}</DialogTitle>
        <DialogContent>
          {f && (
            <div className="field-grid" style={{ marginTop: 8 }}>
              <Field label="Course type" value={f.course_type} onChange={(e) => set({ course_type: e.target.value })} options={TYPES} />
              <Field label="Course code" value={f.code} error={errors.code} inputProps={{ maxLength: 30 }} onChange={(e) => set({ code: e.target.value })} helper={f.course_type === "ELICOS" ? "Not needed for General English" : undefined} />
              <Field label="Course name" wide value={f.name} error={errors.name} inputProps={{ maxLength: 200 }} onChange={(e) => set({ name: e.target.value })} />
              <Field label="Specialisation (if any)" wide value={f.specialisation} error={errors.specialisation} inputProps={{ maxLength: 200 }} onChange={(e) => set({ specialisation: e.target.value })} />
              <Field label="CRICOS course code" value={f.cricos_code} inputProps={{ maxLength: 20 }} onChange={(e) => set({ cricos_code: e.target.value })} />
              <Field label="Duration (weeks)" type="number" value={f.duration_weeks} error={errors.duration_weeks} onChange={(e) => set({ duration_weeks: e.target.value })} />
              <Field label="Tuition fee (AUD)" type="number" value={f.tuition_fee} error={errors.tuition_fee} onChange={(e) => set({ tuition_fee: e.target.value })} />
              <Field label="Entry requirements" wide multiline rows={3} value={f.entry_requirements} inputProps={{ maxLength: 4000 }} onChange={(e) => set({ entry_requirements: e.target.value })} />
              <div className="is-wide">
                <strong style={{ display: "block", marginBottom: 4 }}>Runs at</strong>
                {data.campuses.map((c) => (
                  <CheckField key={c.id} label={c.name} checked={f.campus_ids.includes(Number(c.id))} onChange={(on) => toggleCampus(Number(c.id), on)} />
                ))}
                {errors.campus_ids && <div className="admin-hint" style={{ color: "#b3261e" }}>{errors.campus_ids}</div>}
              </div>
              <CheckField wide label="Switched on (agents can choose it)" checked={f.active} onChange={(on) => set({ active: on })} />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Btn onClick={() => setEditing(null)} disabled={busy}>Cancel</Btn>
          <Btn kind="primary" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Btn>
        </DialogActions>
      </Dialog>

      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleClose} />
    </div>
  );
};

export default Courses;
