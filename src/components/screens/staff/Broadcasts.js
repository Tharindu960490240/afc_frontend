import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

import "../../styles/adminPages.css";
import CustomSnackbar from "../CustomSnackbar";
import { ConfirmDialog, FormDialog, formatDate, formatDateTime } from "../admin/shared";
import { broadcastStep, createBroadcast, getBroadcast, listBroadcasts, updateBroadcast } from "../../../services/comsService";
import { getHomeRoute } from "../../../const/roles";
import { Badge, Btn, Field, Notice, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "../../ui";

const KINDS = [{ value: "product", label: "Product update" }, { value: "fee", label: "Fee update" }, { value: "policy", label: "Policy update" }, { value: "other", label: "Other" }];
const TONE = { draft: "warning", approved: "info", sent: "success", cancelled: "neutral" };
const LABEL = { draft: "Draft", approved: "Sending", sent: "Sent", cancelled: "Cancelled" };
const today = () => new Date().toLocaleDateString("en-CA");

// Updates to active agents (product, fee and policy changes). Marketing drafts, the Director or CEO approves, the system sends and records each delivery.
const Broadcasts = ({ role }) => {
  const [list, setList] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [target, setTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => { const res = await listBroadcasts(); setList(res.success ? res.data : []); }, []);
  useEffect(() => { load(); }, [load]);

  const open = (name, initial = {}, row = null) => { setForm(initial); setErrors({}); setTarget(row); setDialog(name); };
  const close = () => setDialog(null);
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const run = async (call, ok) => {
    const res = await call();
    if (res.success) { close(); setConfirm(null); showMessage(ok); load(); return res; }
    if (res.errors) setErrors(res.errors);
    setConfirm(null);
    showMessage(res.message || "Something went wrong.", "error");
    return null;
  };

  const submitNew = async () => {
    const e = {};
    if ((form.what_changed || "").trim().length < 5) e.what_changed = "Say what has changed (one point per line)";
    if (Object.keys(e).length) return setErrors(e);
    const res = await run(() => createBroadcast({ kind: form.kind || "product", what_changed: form.what_changed.trim(), effective_date: form.effective_date || undefined }), "Draft created. Read it and edit it before it is approved.");
    if (res) open("edit", { kind: res.data.kind, subject: res.data.subject, body: res.data.body }, res.data);
  };
  const submitEdit = () => {
    const e = {};
    if ((form.subject || "").trim().length < 3) e.subject = "Enter a subject";
    if ((form.body || "").trim().length < 20) e.body = "Write the message";
    if (Object.keys(e).length) return setErrors(e);
    return run(() => updateBroadcast(target.id, { kind: form.kind, subject: form.subject.trim(), body: form.body.trim() }), "Draft saved.");
  };
  const view = async (b) => { const res = await getBroadcast(b.id); if (res.success) setDetail(res.data); };

  return (
    <div className="admin-page">
      <Link to={getHomeRoute(role)} className="admin-back"><ArrowBack fontSize="small" /> Dashboard</Link>
      <div className="admin-head">
        <h1>Updates to agents</h1>
        <p>Tell active agents about product, fee and policy changes. The wording is drafted for you to edit, a Director or the CEO approves it, and the system sends it and records when each agent was told. Agents must hear within 24 hours of any material change.</p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Btn kind="primary" onClick={() => open("new", { kind: "product", effective_date: "" })}>New update</Btn>
      </div>
      {list === null ? null : list.length === 0 ? <div className="admin-empty">No updates yet.</div> : (
        <TableContainer className="admin-table-wrap">
          <Table className="admin-table">
            <TableHead><TableRow><TableCell>Update</TableCell><TableCell>Status</TableCell><TableCell>Drafted by</TableCell><TableCell>Approved</TableCell><TableCell>Agents told</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {list.map((b) => (
                <TableRow key={b.id}>
                  <TableCell data-label="Update"><strong>{b.subject}</strong><div className="app-hint" style={{ margin: 0 }}>{(KINDS.find((k) => k.value === b.kind) || {}).label}</div></TableCell>
                  <TableCell data-label="Status"><Badge tone={TONE[b.status]} label={LABEL[b.status]} /></TableCell>
                  <TableCell data-label="Drafted by">{b.drafted_by_name || "-"}</TableCell>
                  <TableCell data-label="Approved">{b.approved_at ? `${formatDate(b.approved_at)} by ${b.approved_by_name || "-"}` : "-"}</TableCell>
                  <TableCell data-label="Agents told">{b.status === "draft" || b.status === "cancelled" ? "-" : b.delivered}</TableCell>
                  <TableCell>
                    {b.status === "draft" && <Btn size="small" onClick={() => open("edit", { kind: b.kind, subject: b.subject, body: b.body }, b)}>Review and edit</Btn>}{" "}
                    {b.status === "draft" && b.can_approve && <Btn size="small" kind="primary" onClick={() => setConfirm({ kind: "approve", b })}>Approve and send</Btn>}{" "}
                    {b.status === "draft" && <Btn size="small" kind="danger" onClick={() => setConfirm({ kind: "cancel", b })}>Cancel</Btn>}
                    {b.status !== "draft" && <Btn size="small" onClick={() => view(b)}>View</Btn>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FormDialog open={dialog === "new"} title="New update to agents" intro="Say what changed. The message is drafted from this and you can edit it before it is approved." submitLabel="Create the draft" onSubmit={submitNew} onCancel={close}>
        <Field id="bc-kind" label="Type" value={form.kind || "product"} onChange={setField("kind")} options={KINDS} />
        <Field id="bc-what" label="What has changed (one point per line)" error={errors.what_changed} multiline rows={5} value={form.what_changed || ""} onChange={setField("what_changed")} inputProps={{ maxLength: 4000 }} />
        <Field id="bc-date" type="date" label="Applies from (optional)" InputLabelProps={{ shrink: true }} value={form.effective_date || ""} onChange={setField("effective_date")} inputProps={{ min: today() }} />
      </FormDialog>
      <FormDialog open={dialog === "edit"} title="Review the update" intro="This is a draft. Nothing is sent until the Director or CEO approves it." submitLabel="Save the draft" onSubmit={submitEdit} onCancel={close}>
        <Field id="be-subj" label="Subject" error={errors.subject} value={form.subject || ""} onChange={setField("subject")} inputProps={{ maxLength: 200 }} />
        <Field id="be-body" label="Message" error={errors.body} multiline rows={12} value={form.body || ""} onChange={setField("body")} inputProps={{ maxLength: 12000 }} />
      </FormDialog>
      <ConfirmDialog
        open={!!confirm}
        title={confirm && confirm.kind === "approve" ? "Approve and send this update?" : "Cancel this draft?"}
        text={confirm && confirm.kind === "approve" ? `"${confirm.b.subject}" is emailed to every active agent now, and each delivery is recorded.` : "The draft is closed and nothing is sent. It stays on record."}
        confirmLabel={confirm && confirm.kind === "approve" ? "Approve and send" : "Cancel the draft"}
        danger={!!confirm && confirm.kind === "cancel"}
        onConfirm={() => run(() => broadcastStep(confirm.b.id, confirm.kind === "approve" ? "approve" : "cancel"), confirm.kind === "approve" ? "Approved and sent to the active agents." : "Draft cancelled.")}
        onCancel={() => setConfirm(null)}
      />
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detail && detail.subject}</DialogTitle>
        <DialogContent>
          {detail && (
            <>
              <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>{detail.body}</p>
              <strong style={{ fontSize: 14 }}>Delivered to {detail.deliveries.length} agents</strong>
              {detail.status === "approved" && <Notice severity="warning" sx={{ mt: 1 }}>Some agents have not been reached yet. The daily job finishes sending.</Notice>}
              <ul style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 18 }}>
                {detail.deliveries.map((d) => <li key={d.agent_id}>{d.legal_name}: {formatDateTime(d.sent_at)}</li>)}
              </ul>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Btn onClick={() => setDetail(null)}>Close</Btn></DialogActions>
      </Dialog>
      <CustomSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} />
    </div>
  );
};

export default Broadcasts;
