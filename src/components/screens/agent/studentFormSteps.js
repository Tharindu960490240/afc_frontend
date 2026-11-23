// The questions on the AFC Application for Enrolment Form (International) V3.1, in the order the form asks them.
// Each field: { s: section, f: field (a dot path for nested answers), label, type, options?, showIf?, helper?, wide? }
// type: text | date | number | bool | select | multi | textarea
import { COUNTRIES } from "../../../const/countries";

export const YES_NO = [{ value: "", label: "Choose..." }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const opt = (pairs) => pairs.map(([value, label]) => ({ value, label }));
const country = () => [{ value: "", label: "Choose..." }, ...COUNTRIES.map((c) => ({ value: c, label: c }))];

export const LABELS = {
  title: opt([["mr", "Mr"], ["miss", "Miss"], ["ms", "Ms"], ["mrs", "Mrs"], ["other", "Other"]]),
  gender: opt([["male", "Male"], ["female", "Female"]]),
  english_ability: opt([["very_well", "Very well"], ["well", "Well"], ["not_well", "Not well"], ["not_at_all", "Not at all"]]),
  indigenous: opt([["no", "No"], ["aboriginal", "Yes, Aboriginal"], ["torres_strait", "Yes, Torres Strait Islander"], ["both", "Yes, both"], ["prefer_not", "Prefer not to say"]]),
  test_type: opt([["IELTS", "IELTS"], ["TOEFL", "TOEFL"], ["PTE", "PTE"], ["other", "Other"]]),
  exemptions: opt([
    ["passport_country", "Passport from the UK, USA, Canada, New Zealand or Ireland"], ["secondary_au", "Completed secondary education in Australia"],
    ["aqf_iv_au", "Completed an AQF Certificate IV or higher in Australia"], ["five_years_english", "Five years of study in English"],
    ["elicos_only", "Applying for General English only"], ["foreign_affairs", "Sponsored by the Department of Foreign Affairs"], ["none", "None of the above"],
  ]),
  disability: opt([["yes", "Yes"], ["no", "No"], ["prefer_not", "Prefer not to say"]]),
  disability_areas: opt([[11, "Hearing / deaf"], [12, "Physical"], [13, "Intellectual"], [14, "Learning"], [15, "Mental illness"], [16, "Acquired brain impairment"], [17, "Vision"], [18, "Medical condition"], [19, "Other"]]),
  school_level: opt([["year12", "Year 12 or equivalent"], ["year11", "Year 11 or equivalent"], ["year10", "Year 10 or equivalent"], ["year9", "Year 9 or equivalent"], ["year8", "Year 8 or below"], ["never", "Never attended school"]]),
  qual_levels: opt([["bachelor", "Bachelor degree or higher"], ["advanced_diploma", "Advanced diploma"], ["diploma", "Diploma"], ["cert_iv", "Certificate IV"], ["cert_iii", "Certificate III"], ["cert_ii", "Certificate II"], ["cert_i", "Certificate I"], ["other", "Other"]]),
  employment: opt([
    ["full_time", "Full-time employee"], ["part_time", "Part-time employee"], ["self_employed_alone", "Self-employed, not employing others"], ["self_employed_employing", "Employer"],
    ["family_business", "Employed in a family business"], ["unemployed_full_time", "Unemployed, seeking full-time work"], ["unemployed_part_time", "Unemployed, seeking part-time work"], ["not_seeking", "Not employed, not seeking work"],
  ]),
  study_reason: opt([
    ["job", "To get a job"], ["develop_business", "To develop my existing business"], ["start_business", "To start my own business"], ["different_career", "To try for a different career"],
    ["better_job", "To get a better job or promotion"], ["requirement_of_job", "It is a requirement of my job"], ["extra_skills", "I wanted extra skills for my job"], ["other_course", "To get into another course"],
    ["personal_interest", "For personal interest or self-development"], ["community_work", "To get skills for community work"], ["other", "Other reasons"],
  ]),
};

const isYes = (s, f) => (d) => (d[s] || {})[f] === true;
const isNo = (s, f) => (d) => (d[s] || {})[f] === false;

export const STEPS = [
  {
    key: "course", title: "Course", sections: ["course"],
    fields: [
      { s: "course", f: "campus_id", label: "Campus", type: "campus" },
      { s: "course", f: "course_id", label: "Course", type: "course", wide: true },
      { s: "course", f: "commencement_date", label: "Start date", type: "date", helper: "Use an intake date AFC has confirmed" },
      { s: "course", f: "elicos_weeks", label: "Weeks of General English", type: "number", showIf: (d, c) => c.isElicos },
    ],
  },
  {
    key: "student", title: "Student", sections: ["student", "addresses", "passport"],
    fields: [
      { h: "About the student" },
      { s: "student", f: "title", label: "Title", type: "select", options: LABELS.title },
      { s: "student", f: "given_names", label: "Given names", type: "text" },
      { s: "student", f: "surname", label: "Surname", type: "text" },
      { s: "student", f: "preferred_name", label: "Preferred name (optional)", type: "text" },
      { s: "student", f: "date_of_birth", label: "Date of birth", type: "date" },
      { s: "student", f: "gender", label: "Gender", type: "select", options: LABELS.gender },
      { s: "student", f: "country_of_birth", label: "Country of birth", type: "select", options: country() },
      { s: "student", f: "nationality", label: "Nationality", type: "text" },
      { s: "student", f: "phone", label: "Phone", type: "text" },
      { s: "student", f: "email", label: "Student's email", type: "text", helper: "AFC sends the student a confirmation here" },
      { h: "Address in the student's home country" },
      { s: "addresses", f: "overseas.street", label: "Street address", type: "text", wide: true },
      { s: "addresses", f: "overseas.suburb", label: "City or suburb", type: "text" },
      { s: "addresses", f: "overseas.postcode", label: "Postcode", type: "text" },
      { s: "addresses", f: "overseas.country", label: "Country", type: "select", options: country() },
      { h: "Address in Australia (if the student is already here)" },
      { s: "addresses", f: "australian.street", label: "Street address", type: "text", wide: true },
      { s: "addresses", f: "australian.suburb", label: "Suburb", type: "text" },
      { s: "addresses", f: "australian.state", label: "State", type: "text" },
      { s: "addresses", f: "australian.postcode", label: "Postcode", type: "text" },
      { h: "Mailing address" },
      { s: "addresses", f: "mailing.same_as_above", label: "The mailing address is the same as the address above", type: "check", wide: true },
      { s: "addresses", f: "mailing.street", label: "Street address", type: "text", wide: true, showIf: (d) => !((d.addresses || {}).mailing || {}).same_as_above },
      { s: "addresses", f: "mailing.suburb", label: "City or suburb", type: "text", showIf: (d) => !((d.addresses || {}).mailing || {}).same_as_above },
      { s: "addresses", f: "mailing.postcode", label: "Postcode", type: "text", showIf: (d) => !((d.addresses || {}).mailing || {}).same_as_above },
      { s: "addresses", f: "mailing.country", label: "Country", type: "select", options: country(), showIf: (d) => !((d.addresses || {}).mailing || {}).same_as_above },
      { h: "Passport" },
      { s: "passport", f: "number", label: "Passport number", type: "text" },
      { s: "passport", f: "country", label: "Country of passport", type: "select", options: country() },
      { s: "passport", f: "expiry", label: "Expiry date", type: "date" },
    ],
  },
  {
    key: "visa", title: "Visa, OSHC and current study", sections: ["visa", "oshc", "current_studies"],
    fields: [
      { h: "Visa" },
      { s: "visa", f: "holds_visa", label: "Does the student hold an Australian visa now?", type: "bool" },
      { s: "visa", f: "type", label: "Visa type", type: "text", showIf: isYes("visa", "holds_visa") },
      { s: "visa", f: "expiry", label: "Visa expiry", type: "date", showIf: isYes("visa", "holds_visa") },
      { s: "visa", f: "apply_where", label: "Where will the student apply for the student visa?", type: "text", wide: true },
      { h: "Overseas Student Health Cover" },
      { s: "oshc", f: "has_oshc", label: "Does the student already have OSHC?", type: "bool" },
      { s: "oshc", f: "provider", label: "OSHC provider", type: "text", showIf: isYes("oshc", "has_oshc") },
      { s: "oshc", f: "expiry", label: "OSHC expiry", type: "date", showIf: isYes("oshc", "has_oshc") },
      { s: "oshc", f: "afc_arrange", label: "Should AFC arrange OSHC for the student?", type: "bool", showIf: isNo("oshc", "has_oshc") },
      { h: "Current study in Australia" },
      { s: "current_studies", f: "enrolled_elsewhere", label: "Is the student studying with another provider in Australia?", type: "bool", wide: true },
      { s: "current_studies", f: "provider", label: "Provider", type: "text", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "cricos_provider", label: "CRICOS provider code (optional)", type: "text", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "course_name", label: "Course", type: "text", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "course_start", label: "Course start date", type: "date", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "coe_number", label: "CoE number (optional)", type: "text", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "months_completed", label: "Months completed", type: "number", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "is_principal", label: "Is it the student's principal course?", type: "bool", showIf: isYes("current_studies", "enrolled_elsewhere") },
      { s: "current_studies", f: "released", label: "Has the provider released the student?", type: "bool", showIf: isYes("current_studies", "enrolled_elsewhere"),
        helper: "A student cannot move within the first 12 months of a principal course unless released" },
    ],
  },
  {
    key: "background", title: "Background and English", sections: ["language", "english", "disability", "schooling", "previous_quals", "employment", "study_reason", "credit", "usi"],
    fields: [
      { h: "Language" },
      { s: "language", f: "other_language", label: "Does the student speak a language other than English at home?", type: "bool", wide: true },
      { s: "language", f: "language", label: "Which language?", type: "text", showIf: isYes("language", "other_language") },
      { s: "language", f: "english_ability", label: "How well does the student speak English?", type: "select", options: LABELS.english_ability },
      { s: "language", f: "indigenous", label: "Aboriginal or Torres Strait Islander origin?", type: "select", options: LABELS.indigenous },
      { h: "English test" },
      { s: "english", f: "tested", label: "Has the student taken an English test in the last two years?", type: "bool", wide: true },
      { s: "english", f: "test_type", label: "Test", type: "select", options: LABELS.test_type, showIf: isYes("english", "tested") },
      { s: "english", f: "test_type_other", label: "Test name", type: "text", showIf: (d) => (d.english || {}).tested === true && (d.english || {}).test_type === "other" },
      { s: "english", f: "test_date", label: "Test date", type: "date", showIf: isYes("english", "tested") },
      { s: "english", f: "overall", label: "Overall score", type: "text", showIf: isYes("english", "tested") },
      { s: "english", f: "listening", label: "Listening", type: "text", showIf: isYes("english", "tested") },
      { s: "english", f: "reading", label: "Reading", type: "text", showIf: isYes("english", "tested") },
      { s: "english", f: "writing", label: "Writing", type: "text", showIf: isYes("english", "tested") },
      { s: "english", f: "speaking", label: "Speaking", type: "text", showIf: isYes("english", "tested") },
      { s: "english", f: "report_id", label: "Report or result number", type: "text", showIf: isYes("english", "tested") },
      { s: "english", f: "exemptions", label: "Does any of these apply? (instead of a test)", type: "multi", options: LABELS.exemptions, showIf: isNo("english", "tested"), wide: true },
      { h: "Disability" },
      { s: "disability", f: "answer", label: "Does the student have a disability, impairment or long-term condition?", type: "select", options: LABELS.disability, wide: true },
      { s: "disability", f: "areas", label: "Areas", type: "multi", options: LABELS.disability_areas, showIf: (d) => (d.disability || {}).answer === "yes", wide: true },
      { h: "Schooling and qualifications" },
      { s: "schooling", f: "highest_level", label: "Highest school level completed", type: "select", options: LABELS.school_level },
      { s: "schooling", f: "year_completed", label: "Year completed", type: "number", showIf: (d) => (d.schooling || {}).highest_level && (d.schooling || {}).highest_level !== "never" },
      { s: "schooling", f: "still_enrolled", label: "Still enrolled in secondary school?", type: "bool" },
      { s: "previous_quals", f: "has_any", label: "Has the student completed any other qualification?", type: "bool", wide: true },
      { s: "previous_quals", f: "levels", label: "Levels completed", type: "multi", options: LABELS.qual_levels, showIf: isYes("previous_quals", "has_any"), wide: true },
      { s: "previous_quals", f: "items", label: "Qualifications", type: "quals", showIf: isYes("previous_quals", "has_any"), wide: true },
      { h: "Work, reasons for study and credit" },
      { s: "employment", f: "status", label: "Current employment status", type: "select", options: LABELS.employment, wide: true },
      { s: "study_reason", f: "reason", label: "Main reason for studying", type: "select", options: LABELS.study_reason, wide: true },
      { s: "credit", f: "apply", label: "Does the student want to apply for credit transfer or recognition of prior learning?", type: "bool", wide: true },
      { s: "usi", f: "has_usi", label: "Does the student have a USI?", type: "bool" },
      { s: "usi", f: "usi", label: "USI", type: "text", showIf: isYes("usi", "has_usi"), helper: "10 letters and numbers" },
    ],
  },
  {
    key: "contacts", title: "Contacts and fees", sections: ["emergency", "extra_fees", "agent"],
    fields: [
      { h: "Emergency contact" },
      { s: "emergency", f: "name", label: "Name", type: "text" },
      { s: "emergency", f: "relationship", label: "Relationship", type: "text" },
      { s: "emergency", f: "phone", label: "Phone", type: "text" },
      { s: "emergency", f: "email", label: "Email (optional)", type: "text" },
      { h: "Fees" },
      { s: "extra_fees", f: "pay_more_than_50", label: "Will the student pay more than 50% of the tuition fee before the course starts?", type: "bool", wide: true },
      { h: "Your details as the counsellor" },
      { s: "agent", f: "counsellor_name", label: "Counsellor's name", type: "text" },
      { s: "agent", f: "position", label: "Position (optional)", type: "text" },
      { s: "agent", f: "counsellor_email", label: "Counsellor's email", type: "text" },
      { s: "agent", f: "phone", label: "Phone", type: "text" },
      { s: "agent", f: "counsellor_marn", label: "Counsellor's MARN", type: "text" },
    ],
  },
];
export const FINAL_SECTIONS = ["declaration", "confirmations"];
export const STEP_OF = Object.fromEntries([...STEPS.flatMap((st, i) => st.sections.map((s) => [s, i])), ["declaration", STEPS.length], ["confirmations", STEPS.length], ["documents", STEPS.length]]);

// small helpers for dot paths, so one list of fields can describe nested answers
export const getIn = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
export const setIn = (obj, path, value) => {
  const [head, ...rest] = path.split(".");
  return { ...(obj || {}), [head]: rest.length ? setIn((obj || {})[head], rest.join("."), value) : value };
};
// leave out empty boxes so the college sees only what was answered
export const prune = (v) => {
  if (Array.isArray(v)) return v.map(prune).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const o = {};
    Object.entries(v).forEach(([k, x]) => { const p = prune(x); if (p !== undefined) o[k] = p; });
    return Object.keys(o).length ? o : undefined;
  }
  return v === "" || v === null || v === undefined ? undefined : v;
};
