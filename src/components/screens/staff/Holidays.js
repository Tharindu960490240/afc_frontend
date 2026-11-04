import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { ConfirmDialog, formatDate } from "../admin/shared";
import { getHomeRoute, ROLES } from "../../../const/roles";
import { addHoliday, listHolidays, removeHoliday } from "../../../services/comsService";

const STATE = { TAS: "Tasmania", VIC: "Victoria" };
const EMPTY = { date: "", name: "", jurisdiction: "TAS" };

const dayName = (value) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", { weekday: "long" });
};

const Holidays = ({ role }) => {
  const canEdit = role === ROLES.ADMIN;
  const [rows, setRows] = useState([]);
  const [covered, setCovered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toRemove, setToRemove] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const load = useCallback(async () => {
    const res = await listHolidays();
    setLoading(false);
    if (res.success) {
      setRows(res.data || []);
      setCovered(res.coveredYears || []);
    } else showMessage(res.message || "Could not load the calendar.", "error");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const e = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) e.date = "Choose a date";
    if (form.name.trim().length < 2) e.name = "Enter the holiday name";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await addHoliday({ date: form.date, name: form.name.trim(), jurisdiction: form.jurisdiction });
    setBusy(false);
    if (res.success) {
      setForm(EMPTY);
      showMessage("Holiday added.");
      load();
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Could not add the holiday.", "error");
    }
  };

  const remove = async () => {
    const h = toRemove;
    setToRemove(null);
    setBusy(true);
    const res = await removeHoliday(h.id);
    setBusy(false);
    if (res.success) {
      showMessage("Holiday removed.");
      load();
    } else showMessage(res.message || "Could not remove it.", "error");
  };

  const byYear = rows.reduce((acc, h) => {
    const y = h.holiday_date.slice(0, 4);
    (acc[y] = acc[y] || []).push(h);
    return acc;
  }, {});
  const thisYear = new Date().getFullYear();
  const missingYears = [thisYear, thisYear + 1].filter((y) => !covered.includes(y));

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back">
        <ArrowBack fontSize="small" /> Dashboard
      </Link>

      <div className="admin-head">
        <h1>Public holidays</h1>
        <p>
          Deadlines such as the 3 and 10 working-day application timers skip weekends and these Tasmanian and Victorian public holidays.
        </p>
      </div>

      {missingYears.length > 0 && !loading && (
        <div className="admin-notice is-warning">
          <strong>Holidays missing for {missingYears.join(" and ")}</strong>
          Until they are added, only weekends are skipped for those years.
        </div>
      )}

      {canEdit && (
        <section className="admin-panel">
          <h2>Add a holiday</h2>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Add local days too, for example Launceston Show Day, or the Friday before the AFL Grand Final when it is announced.
          </p>
          <form
            noValidate
            className="field-grid"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <div className={`admin-field${errors.date ? " has-error" : ""}`}>
              <label htmlFor="h-date">Date</label>
              <input id="h-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              {errors.date && <span className="admin-error">{errors.date}</span>}
            </div>
            <div className={`admin-field${errors.name ? " has-error" : ""}`}>
              <label htmlFor="h-name">Name</label>
              <input id="h-name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <span className="admin-error">{errors.name}</span>}
            </div>
            <div className="admin-field">
              <label htmlFor="h-state">State</label>
              <select id="h-state" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}>
                {Object.entries(STATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label aria-hidden="true">&nbsp;</label>
              <button type="submit" className="admin-btn" disabled={busy}>Add holiday</button>
            </div>
          </form>
        </section>
      )}

      {Object.keys(byYear).sort().map((year) => (
        <section className="admin-panel" key={year}>
          <h2>{year}</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  <th>State</th>
                  {canEdit && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {byYear[year].map((h) => (
                  <tr key={h.id}>
                    <td data-label="Date">
                      {formatDate(h.holiday_date)}
                      <div className="cell-sub">{dayName(h.holiday_date)}</div>
                    </td>
                    <td data-label="Holiday">{h.name}</td>
                    <td data-label="State">{STATE[h.jurisdiction]}</td>
                    {canEdit && (
                      <td data-label="">
                        <div className="cell-actions">
                          <button type="button" className="row-btn is-danger" onClick={() => setToRemove(h)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!rows.length && <div className="admin-panel admin-empty">{loading ? "Loading..." : "No holidays yet."}</div>}

      <ConfirmDialog
        open={Boolean(toRemove)}
        title="Remove this holiday?"
        text={toRemove ? `${toRemove.name} (${formatDate(toRemove.holiday_date)}) will count as a working day again.` : ""}
        confirmLabel="Remove"
        danger
        onConfirm={remove}
        onCancel={() => setToRemove(null)}
      />
      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default Holidays;
