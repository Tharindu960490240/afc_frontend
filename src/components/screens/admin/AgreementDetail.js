import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

import "../../styles/adminPages.css";
import LoadingSpinner from "../LoadingSpinner";
import CustomSnackbar from "../CustomSnackbar";
import {
  AgreementDocument,
  EMPTY_SIGNATURE,
  EVENT_LABELS,
  FILE_KIND_LABELS,
  FormDialog,
  SignatureFields,
  SignatureSummary,
  StatusBadge,
  checkSignature,
  formatBytes,
  formatDate,
  formatDateTime,
} from "./shared";
import {
  getAgreement,
  approveAgreement,
  rejectAgreement,
  cancelAgreement,
  downloadAgreementFile,
  downloadAgreementPdf,
} from "../../../services/agreementService";
import { Btn, Field, Notice, Panel } from "../../ui";

const todayText = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

const AgreementDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // "approve" | "reject" | "cancel"
  const [errors, setErrors] = useState({});

  const [sig, setSig] = useState({ ...EMPTY_SIGNATURE });
  const [effective, setEffective] = useState(todayText());
  const [months, setMonths] = useState("");
  const [reason, setReason] = useState("");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const load = useCallback(async () => {
    const res = await getAgreement(id);
    setLoading(false);
    if (res.success) setData(res.data);
    else showMessage(res.message || "Could not load this agreement.", "error");
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (name) => {
    setDialog(name);
    setErrors({});
    setSig({ ...EMPTY_SIGNATURE });
    setReason("");
    setEffective(todayText());
    setMonths(String(data?.validity_months || 12));
  };

  const run = async (call, okMessage) => {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.success) {
      setDialog(null);
      showMessage(okMessage);
      load();
    } else {
      if (res.errors) setErrors(res.errors);
      showMessage(res.message || "Something went wrong.", "error");
    }
  };

  const handleApprove = () => {
    const problems = checkSignature(sig, true);
    if (Object.keys(problems).length) return setErrors(problems);
    run(
      () =>
        approveAgreement(id, {
          signed_name: sig.name.trim(),
          position: sig.position.trim(),
          signature_image: sig.image || undefined,
          accept: true,
          effective_date: effective,
          validity_months: Number(months),
        }),
      "Agreement countersigned. The agent has been notified and the final PDF is ready."
    );
  };

  const handleReject = () => {
    if (reason.trim().length < 3) return setErrors({ reason: "Please give a reason" });
    run(() => rejectAgreement(id, reason.trim()), "Agreement sent back to the agent.");
  };

  const handleDownload = async (f) => {
    const res = await downloadAgreementFile(id, f);
    if (!res.success && res.message) showMessage(res.message, "error");
  };

  const handlePdf = async () => {
    const res = await downloadAgreementPdf(id, `${data.reference}.pdf`);
    if (!res.success && res.message) showMessage(res.message, "error");
  };

  if (!data) {
    return (
      <div className="admin-page">
        <Link to="/admin/agreements" className="admin-back">
          <ArrowBack fontSize="small" /> Agreements
        </Link>
        <div className="admin-panel admin-empty">{loading ? "Loading agreement..." : "Agreement not found."}</div>
        <CustomSnackbar {...snackbar} onClose={handleClose} />
      </div>
    );
  }

  const status = data.status;
  const canReview = status === "submitted";
  const canCancel = ["sent", "submitted", "rejected", "active"].includes(data.stored_status);

  return (
    <div className="admin-page">
      <Link to="/admin/agreements" className="admin-back">
        <ArrowBack fontSize="small" /> Agreements
      </Link>

      <div className="admin-head">
        <h1>{data.title}</h1>
        <p>
          {data.agent_first_name} {data.agent_last_name}
          {data.agency_name ? ` · ${data.agency_name}` : ""} · {data.agent_email}
        </p>
      </div>

      {/* ---------- what needs doing ---------- */}
      {canReview && (
        <Notice severity="warning" sx={{ mb: 2 }}>
          <strong>Waiting for your review</strong>
          Read the agreement below. Countersign it to finish, or send it back with a reason.
        </Notice>
      )}
      {status === "sent" && (
        <Notice severity="info" sx={{ mb: 2 }}>
          <strong>Waiting for the agent to sign</strong>
          The agent has been emailed. We remind them every 3 days.
        </Notice>
      )}
      {status === "rejected" && (
        <Notice severity="error" sx={{ mb: 2 }}>
          <strong>Sent back to the agent</strong>
          {data.rejection_reason} The agent has to read and sign again.
        </Notice>
      )}
      {status === "expired" && (
        <Notice severity="error" sx={{ mb: 2 }}>
          <strong>This agreement has expired</strong>
          Send a renewal from the Agents page.
        </Notice>
      )}

      <Panel>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Status</span>
            <strong><StatusBadge status={status} /></strong>
          </div>
          <div className="summary-item">
            <span>Sent</span>
            <strong>{formatDate(data.sent_at)}</strong>
          </div>
          <div className="summary-item">
            <span>Valid for</span>
            <strong>{data.validity_months} months</strong>
          </div>
          <div className="summary-item">
            <span>Start date</span>
            <strong>{data.effective_date ? formatDate(data.effective_date) : "-"}</strong>
          </div>
          <div className="summary-item">
            <span>Expires</span>
            <strong>
              {data.expires_at ? formatDate(data.expires_at) : "-"}
              {data.stored_status === "active" && data.days_left != null && (
                <span className={`badge-days${Number(data.days_left) <= 60 ? " is-soon" : ""}`}>
                  {Number(data.days_left) < 0 ? "expired" : `${data.days_left} days left`}
                </span>
              )}
            </strong>
          </div>
        </div>

        {(canReview || canCancel || data.in_portal) && (
          <div className="action-row" style={{ marginTop: 20 }}>
            {canReview && (
              <>
                <Btn kind="primary" size="medium"  onClick={() => openDialog("approve")}>
                  Countersign
                </Btn>
                <Btn kind="danger"  onClick={() => openDialog("reject")}>
                  Reject
                </Btn>
              </>
            )}
            {data.in_portal && (
              <Btn onClick={handlePdf}>
                {data.final_file_id ? "Download final PDF" : "Download PDF"}
              </Btn>
            )}
            {canCancel && (
              <Btn kind="danger"  onClick={() => openDialog("cancel")}>
                {data.stored_status === "active" ? "Terminate" : "Cancel agreement"}
              </Btn>
            )}
          </div>
        )}
      </Panel>

      {data.in_portal && (
        <Panel>
          <h2>Agreement</h2>
          <AgreementDocument blocks={data.document} />
          <SignatureSummary data={data} />
        </Panel>
      )}

      {data.files.length > 0 && (
      <Panel>
        <h2>Documents</h2>
        <ul className="file-list">
          {data.files.map((f) => (
            <li key={f.id} className="file-row">
              <div className="file-row-info">
                <strong>{FILE_KIND_LABELS[f.kind] || f.kind}</strong>
                <span>
                  {f.original_name} · {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at)}
                </span>
              </div>
              <Btn onClick={() => handleDownload(f)}>
                Download
              </Btn>
            </li>
          ))}
        </ul>
      </Panel>
      )}

      <Panel>
        <h2>History</h2>
        <ul className="timeline">
          {data.events.map((e) => (
            <li key={e.id}>
              <strong>{EVENT_LABELS[e.type] || e.type}</strong>
              <span>
                {formatDateTime(e.created_at)}
                {e.first_name ? ` · ${e.first_name} ${e.last_name}` : ""}
              </span>
              {e.note && <p>{e.note}</p>}
            </li>
          ))}
        </ul>
      </Panel>

      {/* ---------- dialogs ---------- */}
      <FormDialog
        open={dialog === "approve"}
        title="Countersign for the college"
        intro="You have read the agreement and the agent's signature. Sign below to finish. The final PDF is created and both of you can download it."
        submitLabel="Countersign"
        onSubmit={handleApprove}
        onCancel={() => setDialog(null)}
      >
        <SignatureFields
          value={sig}
          onChange={(v) => {
            setSig(v);
            setErrors({});
          }}
          errors={errors}
          withPosition
          statement="I have read this agreement and I sign it for Australian Federation College. I understand a typed or drawn signature has the same effect as a handwritten one."
        />
        <Field
          id="appr-date"
          label="Start date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={effective}
          onChange={(e) => setEffective(e.target.value)}
          error={errors.effective_date}
        />
        <Field
          id="appr-months"
          label="Valid for"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          options={[6, 12, 24, 36].map((m) => ({ value: m, label: `${m} months` }))}
        />
      </FormDialog>

      <FormDialog
        open={dialog === "reject"}
        title="Send back to the agent"
        intro="Explain what needs to change. The agent will read the agreement and sign again."
        submitLabel="Send back"
        danger
        onSubmit={handleReject}
        onCancel={() => setDialog(null)}
      >
        <Field
          id="rej-reason"
          label="Reason"
          multiline
          value={reason}
          inputProps={{ maxLength: 1000 }}
          onChange={(e) => setReason(e.target.value)}
          error={errors.reason}
        />
      </FormDialog>

      <FormDialog
        open={dialog === "cancel"}
        title={data.stored_status === "active" ? "Terminate agreement?" : "Cancel agreement?"}
        intro="The agent is told by email. The agreement and its history stay on record."
        submitLabel={data.stored_status === "active" ? "Terminate" : "Cancel agreement"}
        danger
        onSubmit={() => run(() => cancelAgreement(id, reason.trim()), "Agreement cancelled.")}
        onCancel={() => setDialog(null)}
      >
        <Field
          id="can-reason"
          label="Note to the agent (optional)"
          multiline
          value={reason}
          inputProps={{ maxLength: 1000 }}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormDialog>

      <CustomSnackbar {...snackbar} onClose={handleClose} />
      <LoadingSpinner open={busy} />
    </div>
  );
};

export default AgreementDetail;
