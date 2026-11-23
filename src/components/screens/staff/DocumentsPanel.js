import React, { useCallback, useEffect, useState } from "react";
import { Description } from "@mui/icons-material";

import { FormDialog, formatDate } from "../admin/shared";
import { FilePick } from "./DueDiligencePanel";
import {
  MAX_FILE_MB, downloadApplicationPdf, downloadDocument, fileToPayload, listDocuments, removeDocument, requestInformation,
  reviewDocument, uploadDocument,
} from "../../../services/comsService";
import { Badge, Btn, Field, Notice, Panel, TableCell, TableRow, DataTable } from "../../ui";

export const DOC_STATUS = {
  missing: { tone: "warning", label: "Not received" },
  received: { tone: "info", label: "Received: to review" },
  accepted: { tone: "success", label: "Accepted" },
  needs_update: { tone: "danger", label: "Needs an update" },
};

// The agent folder (Processing Agent Application, step 1): what the agent sent, reviewed one by one.
const DocumentsPanel = ({ agent, onChanged, showMessage }) => {
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null); // upload | review | remove | ask
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const canEdit = !!agent.permissions?.dueDiligence && !agent.deleted_at;
  const load = useCallback(async () => {
    const res = await listDocuments(agent.id);
    if (res.success) setData(res.data);
    else showMessage(res.message || "Could not load the documents.", "error");
  }, [agent.id, showMessage]);
  useEffect(() => { load(); }, [load]);

  const open = (name, init = {}, t = null) => { setForm(init); setErrors({}); setTarget(t); setDialog(name); };
  const close = () => setDialog(null);
  const setField = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const run = async (call, okMessage) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) { close(); if (okMessage) showMessage(okMessage); await load(); onChanged(); }
    else { if (res.errors) setErrors(res.errors); showMessage(res.message || "Something went wrong.", "error"); }
  };

  const submitUpload = async () => {
    const e = {};
    if (!form.file) e.file = "Choose a file";
    else if (form.file.size > MAX_FILE_MB * 1024 * 1024) e.file = `The file is too large. The limit is ${MAX_FILE_MB} MB.`;
    if (form.kind === "other" && (form.label || "").trim().length < 3) e.label = "Describe the document";
    setErrors(e);
    if (Object.keys(e).length) return;
    const file = await fileToPayload(form.file);
    run(() => uploadDocument(agent.id, { kind: form.kind, label: form.kind === "other" ? form.label.trim() : undefined, file }), "Document added to the folder.");
  };
  const submitReview = () => {
    if ((form.note || "").trim().length < 3) return setErrors({ note: "Say what needs to change" });
    run(() => reviewDocument(agent.id, target.id, { status: "needs_update", note: form.note.trim() }), "Marked as needing an update.");
  };
  const submitRemove = () => {
    if ((form.reason || "").trim().length < 3) return setErrors({ reason: "Please give a reason" });
    run(() => removeDocument(agent.id, target.id, form.reason.trim()), "Document removed.");
  };
  const submitAsk = () => {
    if ((form.message || "").trim().length < 10) return setErrors({ message: "Write what you need from the agent" });
    run(() => requestInformation(agent.id, form.message.trim()), "The agent has been emailed.");
  };
  const download = async (d) => {
    const res = await downloadDocument(agent.id, d.id, d.filing_name);
    if (!res.success) showMessage(res.message || "Could not download the file.", "error");
  };
  const pdf = async () => {
    const res = await downloadApplicationPdf(agent.id, `${agent.legal_name} - Education Agent Application Form.pdf`);
    if (!res.success) showMessage(res.message || "Could not create the PDF.", "error");
  };

  if (!data) return <Panel><div className="admin-empty">Loading documents...</div></Panel>;
  const kinds = data.kinds;
  const rows = [
    ...data.required.map((r) => ({ kind: r.kind, doc: data.documents.filter((d) => d.kind === r.kind).pop() })),
    { kind: "mara_certificate", doc: data.documents.filter((d) => d.kind === "mara_certificate").pop(), optional: true },
    ...data.documents.filter((d) => ["other", "application_form"].includes(d.kind)).map((doc) => ({ kind: doc.kind, doc })),
  ];

  return (
    <Panel>
      <div className="dd-head">
        <h2>Agent folder: application documents</h2>
        <div className="record-head">
          {agent.application_submitted_at && <Btn onClick={pdf}>Application form (PDF)</Btn>}
          {canEdit && <Btn onClick={() => open("ask", { message: "" })}>Ask the agent for more information</Btn>}
          {canEdit && <Btn kind="primary" onClick={() => open("upload", { kind: "business_registration", label: "", file: null })}>Add a document</Btn>}
        </div>
      </div>
      <Notice severity={data.complete ? "success" : "info"} sx={{ my: 1.5 }}>
        {data.complete
          ? "The required documents are received and accepted."
          : "The business registration certificate and organisational profile must be received and accepted before the application can be approved. Review each document and, if something is wrong, ask the agent for an update."}
      </Notice>
      <DataTable label="DocumentsPanel" head={["Document", "File", "Status", ""]}>
            {rows.map(({ kind, doc, optional }, i) => {
              const status = doc ? doc.status : optional ? "optional" : "missing";
              const st = DOC_STATUS[status] || { tone: "quiet", label: "If available" };
              return (
                <TableRow key={doc ? doc.id : `${kind}-${i}`}>
                  <TableCell>
                    <strong>{kinds[kind].label}</strong>
                    {doc?.kind === "other" && doc.label && <small style={{ display: "block" }}>{doc.label}</small>}
                  </TableCell>
                  <TableCell>
                    {doc ? (
                      <>
                        <Description fontSize="inherit" /> {doc.original_name}
                        <small style={{ display: "block" }}>
                          {formatDate(doc.created_at)}{doc.uploaded_by_agent ? " · sent by the agent" : doc.uploaded_by_name ? ` · added by ${doc.uploaded_by_name}` : ""}
                        </small>
                        {doc.status === "needs_update" && doc.review_note && <small style={{ display: "block", color: "var(--brand-red)" }}>{doc.review_note}</small>}
                      </>
                    ) : "None yet"}
                  </TableCell>
                  <TableCell><Badge tone={st.tone} label={st.label} /></TableCell>
                  <TableCell>
                    <div className="record-head">
                      {doc && <Btn onClick={() => download(doc)}>Download</Btn>}
                      {doc && canEdit && doc.status !== "accepted" && (
                        <Btn kind="success" onClick={() => run(() => reviewDocument(agent.id, doc.id, { status: "accepted" }), "Document accepted.")} disabled={busy}>Accept</Btn>
                      )}
                      {doc && canEdit && doc.status !== "needs_update" && (
                        <Btn onClick={() => open("review", { note: "" }, doc)}>Needs update</Btn>
                      )}
                      {doc && canEdit && <Btn kind="danger" onClick={() => open("remove", { reason: "" }, doc)}>Remove</Btn>}
                      {!doc && canEdit && <Btn onClick={() => open("upload", { kind, label: "", file: null })}>Add</Btn>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </DataTable>
      <p className="dd-none" style={{ marginTop: 10 }}>
        Downloads are named like <em>{agent.legal_name} - Business registration - 2026-11-17.pdf</em>, so they can be saved straight into the agent folder.
      </p>

      <FormDialog open={dialog === "upload"} title="Add a document" submitLabel="Add" onSubmit={submitUpload} onCancel={close}>
        <Field id="doc-kind" label="Document type" value={form.kind || ""} onChange={setField("kind")}
          options={Object.keys(kinds).filter((k) => kinds[k].active !== false).map((k) => ({ value: k, label: kinds[k].label }))} />
        {form.kind === "other" && <Field id="doc-label" label="Describe the document" error={errors.label} value={form.label || ""} onChange={setField("label")} inputProps={{ maxLength: 160 }} />}
        <FilePick id="doc-file" label="File" file={form.file} error={errors.file} onChange={(f) => setForm((x) => ({ ...x, file: f }))} />
      </FormDialog>
      <FormDialog open={dialog === "review"} title="This document needs an update" submitLabel="Save" onSubmit={submitReview} onCancel={close}
        intro="Say what is wrong. The agent sees this on their application page, and it is included when you email them.">
        <Field id="rv-note" label="What needs to change" multiline error={errors.note} value={form.note || ""} onChange={setField("note")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>
      <FormDialog open={dialog === "remove"} title="Remove this document?" submitLabel="Remove" onSubmit={submitRemove} onCancel={close}
        intro="It is kept in the audit trail but no longer shown on the folder.">
        <Field id="dr-reason" label="Reason (required)" multiline error={errors.reason} value={form.reason || ""} onChange={setField("reason")} inputProps={{ maxLength: 1000 }} />
      </FormDialog>
      <FormDialog open={dialog === "ask"} title="Ask the agent for more information" submitLabel="Send email" onSubmit={submitAsk} onCancel={close}
        intro="Use this when something in the application or its documents is not accurate or not valid. The agent gets an email with your message and any documents marked as needing an update.">
        <Field id="ask-msg" label="Your message" multiline rows={5} error={errors.message} value={form.message || ""} onChange={setField("message")} inputProps={{ maxLength: 3000 }} />
      </FormDialog>
    </Panel>
  );
};

export default DocumentsPanel;
