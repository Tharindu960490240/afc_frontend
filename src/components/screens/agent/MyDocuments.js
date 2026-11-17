import React, { useCallback, useEffect, useState } from "react";

import { formatDate } from "../admin/shared";
import { FilePick } from "../staff/DueDiligencePanel";
import { DOC_STATUS } from "../staff/DocumentsPanel";
import { MAX_FILE_MB, downloadMyDocument, fileToPayload, getMyDocuments, removeMyDocument, uploadMyDocument } from "../../../services/comsService";
import { Badge, Btn, Field, Notice, Panel } from "../../ui";

// The agent's side of the application checklist: attach the documents the college asks for.
const MyDocuments = () => {
  const [data, setData] = useState(null);
  const [kind, setKind] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickKey, setPickKey] = useState(0);

  const load = useCallback(async () => {
    const res = await getMyDocuments();
    if (res.success) setData(res.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (k, f, l) => {
    setError(""); setMsg("");
    if (!f) return setError("Choose a file first.");
    if (f.size > MAX_FILE_MB * 1024 * 1024) return setError(`The file is too large. The limit is ${MAX_FILE_MB} MB.`);
    if (k === "other" && (l || "").trim().length < 3) return setError("Describe the document.");
    setBusy(true);
    const res = await uploadMyDocument({ kind: k, label: k === "other" ? l.trim() : undefined, file: await fileToPayload(f) });
    setBusy(false);
    if (res.success) { setData(res.data); setMsg("Thank you. The college will review it."); setFile(null); setLabel(""); setPickKey((x) => x + 1); }
    else setError(res.errors?.file || res.message || "Could not upload the file.");
  };
  const remove = async (d) => {
    setBusy(true);
    const res = await removeMyDocument(d.id);
    setBusy(false);
    if (res.success) setData(res.data); else setError(res.message || "Could not remove it.");
  };
  const download = async (d) => { await downloadMyDocument(d.id, d.filing_name); };

  if (!data) return null;
  const kinds = data.kinds;
  const required = data.required;
  const docs = data.documents;
  const optionalKinds = ["mara_certificate", "other"];

  return (
    <Panel style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>Your documents</h2>
      <p className="app-hint">
        The college needs these with your application. Please attach a copy of your business registration certificate and a brief organisational profile,
        and your certificate of registration with MARA if you have one. PDF, JPG, PNG or DOCX, up to {MAX_FILE_MB} MB each.
      </p>
      {data.documents.some((d) => d.status === "needs_update") && (
        <Notice severity="warning" sx={{ mb: 1.5 }}>The college asked you to update a document. See the notes below and upload a new copy.</Notice>
      )}
      <ul className="dd-list">
        {required.map((r) => {
          const st = DOC_STATUS[r.status];
          const d = docs.filter((x) => x.kind === r.kind).pop();
          return (
            <li key={r.kind} className={r.status === "accepted" ? "is-done" : ""}>
              <span style={{ flex: 1 }}>
                <strong>{r.label}</strong>
                {d && <small>{d.original_name} · {formatDate(d.created_at)}</small>}
                {d?.status === "needs_update" && d.review_note && <small style={{ color: "var(--brand-red)" }}>{d.review_note}</small>}
              </span>
              <Badge tone={st.tone} label={st.label} />
            </li>
          );
        })}
        {docs.filter((d) => optionalKinds.includes(d.kind)).map((d) => (
          <li key={d.id}>
            <span style={{ flex: 1 }}>
              <strong>{kinds[d.kind].label}{d.kind === "other" && d.label ? `: ${d.label}` : ""}</strong>
              <small>{d.original_name} · {formatDate(d.created_at)}</small>
            </span>
            <Badge tone={DOC_STATUS[d.status].tone} label={DOC_STATUS[d.status].label} />
            <Btn onClick={() => download(d)}>Download</Btn>
            {data.open && d.status !== "accepted" && d.uploaded_by_agent && <Btn kind="danger" onClick={() => remove(d)} disabled={busy}>Remove</Btn>}
          </li>
        ))}
      </ul>

      {data.open ? (
        <div className="app-card" style={{ marginTop: 12 }}>
          {error && <Notice severity="error" sx={{ mb: 1 }}>{error}</Notice>}
          {msg && <Notice severity="success" sx={{ mb: 1 }}>{msg}</Notice>}
          <div className="app-grid two">
            <Field id="md-kind" label="Document type" value={kind} onChange={(e) => setKind(e.target.value)}
              options={[{ value: "", label: "Choose..." }, ...Object.keys(kinds).filter((k) => k !== "application_form" && kinds[k].active !== false).map((k) => ({ value: k, label: kinds[k].label }))]} />
            {kind === "other" && <Field id="md-label" label="Describe the document" value={label} onChange={(e) => setLabel(e.target.value)} inputProps={{ maxLength: 160 }} />}
          </div>
          <FilePick key={pickKey} id="md-file" label="File" file={file} onChange={setFile} />
          <div style={{ marginTop: 10 }}>
            <Btn kind="primary" size="medium" disabled={busy || !kind} onClick={() => send(kind, file, label)}>{busy ? "Uploading..." : "Upload"}</Btn>
          </div>
        </div>
      ) : (
        <Notice severity="info" sx={{ mt: 1.5 }}>Your application is no longer open for new documents. Please contact the college if something needs to change.</Notice>
      )}
    </Panel>
  );
};

export default MyDocuments;
