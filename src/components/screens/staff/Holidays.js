import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import "../../styles/coms.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import { ConfirmDialog, ExportButton, formatDate } from "../admin/shared";
import { getHomeRoute, ROLES } from "../../../const/roles";
import { addHoliday, exportHolidays, listHolidays, removeHoliday } from "../../../services/comsService";
import { Btn, Field, Notice, Panel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

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

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <ExportButton run={exportHolidays} onError={(m) => showMessage(m, "error")} />
      </div>

      {missingYears.length > 0 && !loading && (
        <Notice severity="warning" sx={{ mb: 2 }}>
          <strong>Holidays missing for {missingYears.join(" and ")}</strong>
          Until they are added, only weekends are skipped for those years.
        </Notice>
      )}

      {canEdit && (
        <Panel>
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
            <Field
              id="h-date"
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              error={errors.date}
            />
            <Field
              id="h-name"
              label="Name"
              value={form.name}
              inputProps={{ maxLength: 120 }}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <Field
              id="h-state"
              label="State"
              value={form.jurisdiction}
              onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
              options={Object.entries(STATE).map(([k, v]) => ({ value: k, label: v }))}
            />
            <div>
              <Btn kind="primary" size="medium" type="submit" disabled={busy}>Add holiday</Btn>
            </div>
          </form>
        </Panel>
      )}

      {Object.keys(byYear).sort().map((year) => (
        <Panel key={year}>
          <h2>{year}</h2>
          <TableContainer className="admin-table-wrap">
            <Table className="admin-table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Holiday</TableCell>
                  <TableCell>State</TableCell>
                  {canEdit && <TableCell aria-label="Actions" />}
                </TableRow>
              </TableHead>
              <TableBody>
                {byYear[year].map((h) => (
                  <TableRow key={h.id}>
                    <TableCell data-label="Date">
                      {formatDate(h.holiday_date)}
                      <div className="cell-sub">{dayName(h.holiday_date)}</div>
                    </TableCell>
                    <TableCell data-label="Holiday">{h.name}</TableCell>
                    <TableCell data-label="State">{STATE[h.jurisdiction]}</TableCell>
                    {canEdit && (
                      <TableCell data-label="">
                        <div className="cell-actions">
                          <Btn kind="danger"  onClick={() => setToRemove(h)}>
                            Remove
                          </Btn>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Panel>
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
