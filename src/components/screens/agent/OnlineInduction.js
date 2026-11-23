import React, { useEffect, useState } from "react";
import { acknowledgePolicy, completeInductionModule, getOnlineInduction } from "../../../services/comsService";
import { formatDateTime } from "../admin/shared";
import { ListTable } from "../admin/ListKit";
import { Badge, Btn, Notice, TableCell, TableRow } from "../../ui";

const STAGE_TEXT = {
  not_started: "Start with module 1. You complete the modules in order.",
  in_progress: "Keep going. Each module opens when you finish the one before.",
  awaiting_policy: "All modules are done. Read and acknowledge the policies and procedures below.",
  awaiting_staff: "Thank you. The college will check and confirm your induction. The rest of the portal opens once it does.",
  complete: "Your induction is complete and confirmed by the college.",
};

// The agent's self-paced induction: six modules in order, then the policies and procedures acknowledgement.
const OnlineInduction = ({ showMessage }) => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await getOnlineInduction();
    if (res.success) setData(res.data);
    else showMessage(res.message || "Could not load your induction.", "error");
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="admin-panel admin-empty">Loading...</div>;
  if (!data.eligible) {
    return (
      <div className="admin-panel admin-empty">
        <strong style={{ display: "block", marginBottom: 6 }}>Not available yet</strong>
        Your induction opens after the college approves your application. We will email you when it is ready.
      </div>
    );
  }

  const finish = async (m) => {
    setBusy(true);
    const res = await completeInductionModule(m.id);
    setBusy(false);
    if (res.success) { setData(res.data); setOpen(null); showMessage("Module completed."); }
    else showMessage(res.message || "Could not save your progress.", "error");
  };
  const acknowledge = async () => {
    setBusy(true);
    const res = await acknowledgePolicy(data.pp.id);
    setBusy(false);
    if (res.success) { setData(res.data); setAgree(false); showMessage("Thank you. Your acknowledgement has been recorded."); }
    else showMessage(res.message || "Could not record your acknowledgement.", "error");
  };

  const current = data.modules.find((m) => m.id === open);
  return (
    <>
      <Notice severity={data.stage === "complete" ? "success" : "info"} sx={{ mb: 2 }}>
        {STAGE_TEXT[data.stage]} ({data.modules_completed} of {data.modules_total} modules done)
      </Notice>

      {current ? (
        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <div className="app-card-head"><strong>Module {current.position}: {current.title}</strong></div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, margin: "16px 0" }}>{current.body}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {!current.completed_at && <Btn kind="primary" size="medium" disabled={busy} onClick={() => finish(current)}>I have read this. Mark as complete</Btn>}
            <Btn size="medium" onClick={() => setOpen(null)}>Back to the modules</Btn>
          </div>
        </div>
      ) : (
        <ListTable
          label="Induction modules"
          head={["Module", "Status", ""]}
          rows={data.modules}
          searchAlways={false}
          renderRow={(m) => (
            <TableRow key={m.id}>
              <TableCell><span className="cell-main">{m.position}. {m.title}</span></TableCell>
              <TableCell>
                {m.completed_at ? <Badge tone="success" label="Done" /> : m.locked ? <Badge tone="neutral" label="Locked" /> : <Badge tone="info" label="Ready" />}
                <div className="cell-sub">{m.completed_at ? `Completed ${formatDateTime(m.completed_at)}` : m.locked ? "Opens when you finish the module before" : "Ready to start"}</div>
              </TableCell>
              <TableCell>
                <Btn kind={!m.completed_at && !m.locked ? "primary" : undefined} disabled={m.locked} onClick={() => setOpen(m.id)}>
                  {m.completed_at ? "Read again" : "Start"}
                </Btn>
              </TableCell>
            </TableRow>
          )}
        />
      )}

      {!current && data.pp && (data.modules_completed === data.modules_total) && (
        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <div className="app-card-head"><strong>{data.pp.title} (version {data.pp.version})</strong></div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, margin: "16px 0" }}>{data.pp.body}</div>
          {data.pp.document_url && <p><a href={data.pp.document_url} target="_blank" rel="noreferrer">Open the full policy document</a></p>}
          {data.pp_acknowledged_at ? (
            <Notice severity="success">
              Acknowledged on {formatDateTime(data.pp_acknowledged_at)} (version {data.pp_acknowledged_version}). This record cannot be changed.
              {!data.pp_acknowledged_current && " A newer version has since been published. Please read it when you can."}
            </Notice>
          ) : (
            <>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "0 0 16px", cursor: "pointer" }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 4 }} />
                <span>I have read and understood these policies and procedures. I understand that the date, time, my IP address and the version are recorded and cannot be changed.</span>
              </label>
              <Btn kind="primary" size="medium" disabled={!agree || busy} onClick={acknowledge}>Acknowledge the policies</Btn>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default OnlineInduction;
