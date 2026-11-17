import React from "react";

import "../../styles/application.css";
import { formatDate } from "../admin/shared";
import { downloadApplicationPdf } from "../../../services/comsService";
import { Btn, Notice, Panel } from "../../ui";

const yn = (v) => (v === true ? "Yes" : v === false ? "No" : "");
const place = (list) => (list || []).map((p) => `${p.location}${p.details ? `: ${p.details}` : ""}`);

const Section = ({ title, rows }) => (
  <div className="app-card">
    <div className="app-card-head"><strong>{title}</strong></div>
    <dl className="dd-answers">
      {rows.map(([label, value]) => {
        const list = Array.isArray(value);
        const empty = list ? value.length === 0 : value === null || value === undefined || value === "";
        return (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{empty ? "None" : list ? value.map((v, i) => <div key={i}>{v}</div>) : String(value)}</dd>
          </div>
        );
      })}
    </dl>
  </div>
);

// The answers on the AFC Education Agent Application Form V2.0, as the agent gave them (agent record, "Application" tab).
const ApplicationPanel = ({ agent, showMessage }) => {
  const x = agent.application_extra || {};
  if (!agent.application_submitted_at) {
    return (
      <Panel>
        <h2 style={{ marginTop: 0 }}>Application form</h2>
        <div className="admin-empty">The agent has not submitted the application form yet. Use "Send application link" on the Overview tab if they were invited.</div>
      </Panel>
    );
  }
  const pdf = async () => {
    const res = await downloadApplicationPdf(agent.id, `${agent.legal_name} - Education Agent Application Form.pdf`);
    if (!res.success) showMessage(res.message || "Could not create the PDF.", "error");
  };
  const people = (agent.persons || []).map((p) => `${p.name} (${p.role === "sub_agent" ? "sub-agent" : p.role})${p.marn ? `, MARN ${p.marn}` : ""} - ${p.email}`);
  const referees = (agent.referees || []).map((r) => `${r.organisation}: ${r.name}${r.position ? `, ${r.position}` : ""} - ${r.email}${r.phone ? `, ${r.phone}` : ""}`);
  return (
    <Panel>
      <div className="dd-head">
        <h2>Application form (AFC-EAAF V2.0)</h2>
        <Btn kind="primary" onClick={pdf}>Download as PDF</Btn>
      </div>
      <Notice severity="info" sx={{ my: 1.5 }}>
        Submitted {formatDate(agent.application_submitted_at)}. Review the answers against the documents, and ask the agent for anything that is not accurate (Documents tab).
      </Notice>
      <Section title="1. Company profile" rows={[
        ["Legal name", agent.legal_name], ["Trading names", agent.trading_names || []], ["ACN / ABN", agent.abn_acn], ["Registered for GST", yn(agent.gst_registered)],
        ["Address", agent.principal_address], ["Registered office", agent.registered_office_address], ["Contact number", agent.phone], ["Contact email", agent.email],
        ["CEO / Owner", agent.owner_name], ["Number of staff", agent.staff_count], ["Key staff and consultants", people],
        ["Years in existence", agent.years_in_business], ["Services provided", x.services || []],
        ["Offshore offices", place(x.offshore_offices)], ["Sub-contractors", place(x.sub_contractors)], ["Offshore partners", place(x.offshore_partners)],
      ]} />
      <Section title="2. Company registration" rows={[["Registrations", (x.registrations || []).map((r) => `${r.number} (${r.country})`)]]} />
      <Section title="3. Experience recruiting students" rows={[
        ["Australian sectors (VET / University)", (x.recruited_australia || []).map((r) => `${r.sector}: ${r.students} students`)],
        ["All other sectors", (x.recruited_other || []).map((r) => `${r.sector}: ${r.students} students`)],
      ]} />
      <Section title="4. Familiarity with the Australian education industry" rows={[
        ["Read the ESOS Act 2000", x.esos_read === false ? `No${x.esos_intend ? ", intends to familiarise" : ", does not intend to"}` : yn(x.esos_read)],
        ["Read the National Code 2018", x.national_code_read === false ? `No${x.national_code_intend ? ", intends to familiarise" : ", does not intend to"}` : yn(x.national_code_read)],
      ]} />
      <Section title="5. Personal experience" rows={[["Education industry", x.experience_education], ["Other business areas", x.experience_other]]} />
      <Section title="6 to 8. Markets, memberships and services" rows={[
        ["Current areas", (x.markets || []).map((m) => `${m.area}${m.characteristics ? `: ${m.characteristics}` : ""}`)],
        ["Potential areas", x.potential_markets], ["Professional organisations", x.memberships || []], ["Services to the college", x.services_to_afc],
      ]} />
      <Section title="9. Referees" rows={[["Referees", referees]]} />
      <Section title="10 and 11. Privacy notice and declaration" rows={[
        ["Conflict of interest", agent.coi_declared ? `Yes: ${agent.coi_details || ""}` : "None declared"],
        ["Privacy notice agreed", agent.privacy_agreed_at ? formatDate(agent.privacy_agreed_at) : ""],
        ["Declared by (CEO / Owner)", agent.declaration_name], ["Date", agent.declaration_at ? formatDate(agent.declaration_at) : ""],
      ]} />
    </Panel>
  );
};

export default ApplicationPanel;
