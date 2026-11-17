// ===============================
// The agent application form: values, rules and the data sent to the server.
// The same form is used on the public website page (with an account step) and
// inside the portal for agents invited by the college.
// ===============================
import { isValidName, isValidPhone, isValidPassword } from "../../../utils/validation";
import { validAbnOrAcn } from "../../../utils/abn";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MARN_REGEX = /^\d{7}$/;

// The steps follow the AFC "Education Agent Application Form" V2.0 (section numbers in brackets).
export const STEPS = [
  { key: "account", title: "Your account", publicOnly: true },
  { key: "business", title: "Company profile" },          // 1a-1i, 1k
  { key: "operations", title: "Services and offices" },   // 1l-1o, 2
  { key: "people", title: "Key staff" },                  // 1j
  { key: "experience", title: "Experience" },            // 3, 4, 5
  { key: "markets", title: "Markets and services" },      // 6, 7, 8
  { key: "referees", title: "Referees" },                 // 9
  { key: "declarations", title: "Declaration" },          // 10, 11
  { key: "review", title: "Review" },
];
export const stepsFor = (mode) => STEPS.filter((s) => mode === "public" || !s.publicOnly);

export const blankPerson = () => ({ name: "", email: "", role: "staff", marn: "", involved_in_enrolments: true, location: "" });
export const blankReferee = () => ({ name: "", position: "", organisation: "", email: "", phone: "" });
export const blankPlace = () => ({ location: "", details: "" });
export const blankRecruited = () => ({ sector: "", students: "" });
export const blankMarket = () => ({ area: "", characteristics: "" });
export const blankRegistration = (country = "") => ({ number: "", country });

export const initialValues = () => ({
  first_name: "", last_name: "", email: "", phone: "", password: "", confirmPassword: "",
  legal_name: "", trading_names: "", country: "", abn_acn: "", is_body_corporate: "",
  principal_address: "", registered_office_address: "", postal_address: "", business_phone: "", website: "", marn: "",
  applicant_role: "director", applicant_marn: "", applicant_in_enrolments: true, people: [],
  referees: [blankReferee(), blankReferee()],
  coi_declared: "", coi_details: "", code_of_ethics: false, information_true: false, consent: false, privacy_agreed: false,
  // AFC form V2.0
  gst_registered: "", owner_name: "", staff_count: "", years_in_business: "",
  services: [""], offshore_offices: [], sub_contractors: [], offshore_partners: [], registrations: [blankRegistration()],
  recruited_australia: [], recruited_other: [],
  esos_read: "", esos_intend: "", national_code_read: "", national_code_intend: "",
  experience_education: "", experience_other: "",
  markets: [blankMarket()], potential_markets: "", memberships: [], services_to_afc: "",
  declaration_name: "",
});

const yn3 = (v) => (v === true ? "yes" : v === false ? "no" : "");
const nonEmpty = (list, blank) => (list && list.length ? list : blank);

// values for an agent who is already signed in (from GET /agent-application)
export const valuesFromServer = (d) => ({
  ...initialValues(),
  legal_name: d.agent.legal_name || "",
  trading_names: (d.agent.trading_names || []).join(", "),
  country: d.agent.country || "",
  abn_acn: d.agent.abn_acn || "",
  is_body_corporate: d.agent.is_body_corporate ? "yes" : "",
  principal_address: d.agent.principal_address || "",
  registered_office_address: d.agent.registered_office_address || "",
  postal_address: d.agent.postal_address || "",
  business_phone: d.agent.business_phone || "",
  website: d.agent.website || "",
  marn: d.agent.marn || "",
  applicant_role: d.applicant?.role || "director",
  applicant_marn: d.applicant?.marn || "",
  applicant_in_enrolments: d.applicant ? d.applicant.involved_in_enrolments : true,
  people: (d.people || []).map((p) => ({ ...blankPerson(), ...p })),
  referees: d.referees?.length >= 2 ? d.referees.map((r) => ({ ...blankReferee(), ...r })) : [blankReferee(), blankReferee()],
  gst_registered: yn3(d.agent.gst_registered),
  owner_name: d.agent.owner_name || "",
  staff_count: d.agent.staff_count ?? "",
  years_in_business: d.agent.years_in_business ?? "",
  declaration_name: d.declaration_name || "",
  ...fromExtra(d.extra || {}, d.agent.country || ""),
});

function fromExtra(x, country) {
  return {
    services: nonEmpty(x.services, [""]),
    offshore_offices: x.offshore_offices || [], sub_contractors: x.sub_contractors || [], offshore_partners: x.offshore_partners || [],
    registrations: nonEmpty(x.registrations, [blankRegistration(country)]),
    recruited_australia: x.recruited_australia || [], recruited_other: x.recruited_other || [],
    esos_read: yn3(x.esos_read), esos_intend: yn3(x.esos_intend), national_code_read: yn3(x.national_code_read), national_code_intend: yn3(x.national_code_intend),
    experience_education: x.experience_education || "", experience_other: x.experience_other || "",
    markets: nonEmpty(x.markets, [blankMarket()]), potential_markets: x.potential_markets || "",
    memberships: x.memberships || [], services_to_afc: x.services_to_afc || "",
  };
}

export const isAustralia = (country) => /^australia$/i.test((country || "").trim());
export const businessNumberLabel = (country) => (isAustralia(country) ? "ABN or ACN" : "Business registration number");

const need = (v, msg) => (String(v || "").trim() ? null : msg);

// Returns { "field": "message", "people.0.email": "message" } for one step. Empty = fine.
export function validateStep(key, v) {
  const e = {};
  const set = (k, msg) => { if (msg) e[k] = msg; };

  if (key === "account") {
    if (!isValidName(v.first_name)) e.first_name = "Enter your first name";
    if (!isValidName(v.last_name)) e.last_name = "Enter your last name";
    if (!EMAIL_REGEX.test(v.email.trim())) e.email = "Enter a valid email address";
    if (!isValidPhone(v.phone)) e.phone = "Enter a valid phone number";
    if (!isValidPassword(v.password)) e.password = "8+ characters with upper and lower case, a number and one of @ $ ! % * ? &";
    if (v.confirmPassword !== v.password) e.confirmPassword = "Passwords do not match";
  }

  if (key === "business") {
    set("legal_name", need(v.legal_name, "Enter the legal name of the business"));
    set("country", need(v.country, "Choose the country of business"));
    if (!v.abn_acn.trim()) e.abn_acn = `Enter your ${businessNumberLabel(v.country).toLowerCase()}`;
    else if (isAustralia(v.country) && !validAbnOrAcn(v.abn_acn)) e.abn_acn = "This is not a valid ABN or ACN";
    else if (v.abn_acn.trim().length < 4) e.abn_acn = "This number is too short";
    set("is_body_corporate", need(v.is_body_corporate, "Please choose Yes or No"));
    if (v.principal_address.trim().length < 5) e.principal_address = "Enter the principal place of business";
    if (v.is_body_corporate === "yes") set("registered_office_address", need(v.registered_office_address, "A company needs a registered office address"));
    if (v.business_phone.trim() && !isValidPhone(v.business_phone)) e.business_phone = "Enter a valid phone number";
    if (v.website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v.website.trim())) e.website = "Enter a full web address, for example https://example.com";
    if (v.marn.trim() && !MARN_REGEX.test(v.marn.trim())) e.marn = "A MARN has 7 digits";
    set("gst_registered", need(v.gst_registered, "Please choose Yes or No"));
    set("owner_name", need(v.owner_name, "Enter the name of the Chief Executive Officer or owner"));
    if (!/^\d{1,6}$/.test(String(v.staff_count).trim())) e.staff_count = "Enter the number of staff (0 or more)";
    if (!/^\d{1,3}$/.test(String(v.years_in_business).trim())) e.years_in_business = "Enter the number of years (0 or more)";
  }

  if (key === "operations") {
    if (!v.services.some((x) => x.trim())) e.services = "List at least one service your company provides";
    v.services.forEach((x, i) => { if (!x.trim() && v.services.length > 1) e[`services.${i}`] = "Enter a service or remove this row"; });
    ["offshore_offices", "sub_contractors", "offshore_partners"].forEach((k) => v[k].forEach((p, i) => { if (!p.location.trim()) e[`${k}.${i}.location`] = "Enter the location"; }));
    if (!v.registrations.length) e.registrations = "Give at least one registration";
    v.registrations.forEach((r, i) => {
      if (!r.number.trim()) e[`registrations.${i}.number`] = "Enter the registration number";
      if (!r.country.trim()) e[`registrations.${i}.country`] = "Choose the country of registration";
    });
  }

  if (key === "experience") {
    ["recruited_australia", "recruited_other"].forEach((k) => v[k].forEach((r, i) => {
      if (!r.sector.trim()) e[`${k}.${i}.sector`] = "Enter the sector";
      if (!/^\d{1,7}$/.test(String(r.students).trim())) e[`${k}.${i}.students`] = "Enter a number";
    }));
    set("esos_read", need(v.esos_read, "Please choose Yes or No"));
    if (v.esos_read === "no") set("esos_intend", need(v.esos_intend, "Please choose Yes or No"));
    set("national_code_read", need(v.national_code_read, "Please choose Yes or No"));
    if (v.national_code_read === "no") set("national_code_intend", need(v.national_code_intend, "Please choose Yes or No"));
    if (v.experience_education.trim().length < 10) e.experience_education = "Describe your experience in the education industry";
  }

  if (key === "markets") {
    if (!v.markets.length) e.markets = "Give at least one current market";
    v.markets.forEach((m, i) => { if (!m.area.trim()) e[`markets.${i}.area`] = "Enter the geographical area"; });
    v.memberships.forEach((m, i) => { if (!m.trim()) e[`memberships.${i}`] = "Enter the organisation or remove this row"; });
    if (v.services_to_afc.trim().length < 10) e.services_to_afc = "Outline the services you will provide to the college";
  }

  if (key === "people") {
    if (v.applicant_marn.trim() && !MARN_REGEX.test(v.applicant_marn.trim())) e.applicant_marn = "A MARN has 7 digits";
    const seen = new Set([v.email.trim().toLowerCase()].filter(Boolean));
    v.people.forEach((p, i) => {
      if (p.name.trim().length < 2) e[`people.${i}.name`] = "Enter the full name";
      const mail = p.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(mail)) e[`people.${i}.email`] = "Enter a valid email address";
      else if (seen.has(mail)) e[`people.${i}.email`] = "This email is already on the list";
      seen.add(mail);
      if (p.marn.trim() && !MARN_REGEX.test(p.marn.trim())) e[`people.${i}.marn`] = "A MARN has 7 digits";
    });
    if (v.is_body_corporate === "yes" && v.applicant_role !== "director" && !v.people.some((p) => p.role === "director")) {
      e.people = "A company needs at least one director. Add the director below, or choose Director for yourself.";
    }
  }

  if (key === "referees") {
    const seen = new Set([v.email.trim().toLowerCase()].filter(Boolean));
    v.referees.forEach((r, i) => {
      if (r.name.trim().length < 2) e[`referees.${i}.name`] = "Enter the referee's name";
      if (r.position.trim().length < 2) e[`referees.${i}.position`] = "Enter the referee's position";
      if (r.organisation.trim().length < 2) e[`referees.${i}.organisation`] = "Enter the referee's company name";
      const mail = r.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(mail)) e[`referees.${i}.email`] = "Enter a valid email address";
      else if (seen.has(mail)) e[`referees.${i}.email`] = "Use a different email for each referee";
      seen.add(mail);
      if (!isValidPhone(r.phone)) e[`referees.${i}.phone`] = "Enter a phone number we can call";
    });
  }

  if (key === "declarations") {
    set("coi_declared", need(v.coi_declared, "Please answer this question"));
    if (v.coi_declared === "yes" && v.coi_details.trim().length < 10) e.coi_details = "Please describe the conflict of interest";
    if (!v.code_of_ethics) e.code_of_ethics = "You must accept the code of ethics";
    if (!v.information_true) e.information_true = "Please confirm the information is correct";
    if (!v.privacy_agreed) e.privacy_agreed = "You must agree to the privacy notice";
    set("declaration_name", need(v.declaration_name, "Type the name of the Chief Executive Officer or owner"));
    if (v.consentRequired && !v.consent) e.consent = "You must accept the privacy statement";
  }
  return e;
}

export function validateAll(v, mode) {
  const withConsent = { ...v, consentRequired: mode === "public" };
  const errors = {};
  stepsFor(mode).forEach((s) => Object.assign(errors, validateStep(s.key, withConsent)));
  return errors;
}

// which step a server error belongs to (so the form can jump back to it)
export function stepOfError(field, mode) {
  const parts = String(field).split(".");
  const f = parts[0] === "extra" ? parts[1] : parts[0];
  const map = {
    first_name: "account", last_name: "account", email: "account", phone: "account", password: "account",
    legal_name: "business", trading_names: "business", country: "business", abn_acn: "business", is_body_corporate: "business",
    principal_address: "business", registered_office_address: "business", postal_address: "business",
    business_phone: "business", website: "business", marn: "business",
    applicant_role: "people", applicant_marn: "people", applicant_in_enrolments: "people", people: "people",
    referees: "referees",
    gst_registered: "business", owner_name: "business", staff_count: "business", years_in_business: "business",
    services: "operations", offshore_offices: "operations", sub_contractors: "operations", offshore_partners: "operations", registrations: "operations",
    recruited_australia: "experience", recruited_other: "experience", esos_read: "experience", esos_intend: "experience",
    national_code_read: "experience", national_code_intend: "experience", experience_education: "experience", experience_other: "experience",
    markets: "markets", potential_markets: "markets", memberships: "markets", services_to_afc: "markets",
    privacy_agreed: "declarations", declaration_name: "declarations",
    coi_declared: "declarations", coi_details: "declarations", code_of_ethics: "declarations", information_true: "declarations", consent: "declarations",
  };
  const key = map[f] || "business";
  const list = stepsFor(mode).map((s) => s.key);
  return Math.max(0, list.indexOf(key));
}

export function toPayload(v, mode) {
  const t = (s) => String(s || "").trim();
  const body = {
    legal_name: t(v.legal_name),
    trading_names: t(v.trading_names).split(",").map((s) => s.trim()).filter(Boolean),
    country: v.country,
    abn_acn: t(v.abn_acn),
    is_body_corporate: v.is_body_corporate === "yes",
    principal_address: t(v.principal_address),
    registered_office_address: t(v.registered_office_address),
    postal_address: t(v.postal_address),
    business_phone: t(v.business_phone),
    website: t(v.website),
    marn: t(v.marn),
    applicant_role: v.applicant_role,
    applicant_marn: t(v.applicant_marn),
    applicant_in_enrolments: !!v.applicant_in_enrolments,
    people: v.people.map((p) => ({
      name: t(p.name), email: t(p.email).toLowerCase(), role: p.role, marn: t(p.marn),
      involved_in_enrolments: !!p.involved_in_enrolments, location: p.role === "sub_agent" ? t(p.location) : "",
    })),
    referees: v.referees.map((r) => ({ name: t(r.name), position: t(r.position), organisation: t(r.organisation), email: t(r.email).toLowerCase(), phone: t(r.phone) })),
    gst_registered: v.gst_registered === "yes",
    owner_name: t(v.owner_name),
    staff_count: Number(t(v.staff_count)),
    years_in_business: Number(t(v.years_in_business)),
    extra: {
      services: v.services.map(t).filter(Boolean),
      offshore_offices: v.offshore_offices.map((p) => ({ location: t(p.location), details: t(p.details) })),
      sub_contractors: v.sub_contractors.map((p) => ({ location: t(p.location), details: t(p.details) })),
      offshore_partners: v.offshore_partners.map((p) => ({ location: t(p.location), details: t(p.details) })),
      registrations: v.registrations.map((r) => ({ number: t(r.number), country: t(r.country) })),
      recruited_australia: v.recruited_australia.map((r) => ({ sector: t(r.sector), students: Number(t(r.students)) })),
      recruited_other: v.recruited_other.map((r) => ({ sector: t(r.sector), students: Number(t(r.students)) })),
      esos_read: v.esos_read === "yes",
      esos_intend: v.esos_read === "no" ? v.esos_intend === "yes" : null,
      national_code_read: v.national_code_read === "yes",
      national_code_intend: v.national_code_read === "no" ? v.national_code_intend === "yes" : null,
      experience_education: t(v.experience_education),
      experience_other: t(v.experience_other),
      markets: v.markets.map((m) => ({ area: t(m.area), characteristics: t(m.characteristics) })),
      potential_markets: t(v.potential_markets),
      memberships: v.memberships.map(t).filter(Boolean),
      services_to_afc: t(v.services_to_afc),
    },
    privacy_agreed: true,
    declaration_name: t(v.declaration_name),
    coi_declared: v.coi_declared === "yes",
    coi_details: v.coi_declared === "yes" ? t(v.coi_details) : "",
    code_of_ethics: true,
    information_true: true,
  };
  if (mode === "public") {
    Object.assign(body, {
      first_name: t(v.first_name), last_name: t(v.last_name), email: t(v.email).toLowerCase(),
      phone: t(v.phone), password: v.password, consent: true,
    });
  }
  return body;
}
