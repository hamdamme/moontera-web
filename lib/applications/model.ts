import {
  initialAnswers,
  steps,
  visible,
  validateStep,
  dateKey,
  states,
  type Answers,
} from "../../app/apply/schema";
export const quickFields = [
  { key: "full_name", label: "Full name", type: "text", required: true },
  { key: "address", label: "Street address", type: "text", required: true },
  { key: "city", label: "City", type: "text", required: true },
  { key: "state", label: "State", type: "select", required: true },
  { key: "zip", label: "ZIP code", type: "text", required: true },
  { key: "dob", label: "Date of birth", type: "date", required: true },
  { key: "phone", label: "Phone number", type: "tel", required: true },
  { key: "email", label: "Email address", type: "email", required: true },
  {
    key: "position",
    label: "Position applied for",
    type: "select",
    required: true,
  },
  {
    key: "start_date",
    label: "Available start date",
    type: "date",
    required: true,
  },
  { key: "cdl_number", label: "CDL number", type: "text", required: true },
  { key: "cdl_state", label: "CDL issuing state", type: "select", required: true },
  { key: "cdl_class", label: "CDL class", type: "select", required: true },
  { key: "cdl_expiration", label: "CDL expiration date", type: "date", required: true },
  { key: "medical_card_issue", label: "DOT medical card issue date", type: "date", required: true },
  { key: "medical_card_expiration", label: "DOT medical card expiration date", type: "date", required: true },
  { key: "drug_test_status", label: "Last DOT drug test", type: "select", required: true },
  { key: "drug_test_date", label: "Date of last DOT drug test", type: "date", required: false },
  { key: "ssn_last4", label: "Last four SSN digits", type: "text", required: false },
] as const;
export const cdlClasses = ["Class A", "Class B", "Class C"] as const;
export const drugTestStatuses = ["Date known", "Unknown", "Never tested"] as const;
export const positions = [
  "Company driver",
  "Owner operator",
  "Lease driver",
  "Other",
];
export type Signature = { mode: "type" | "draw"; name: string; image: string };
export type Submission = {
  kind: "quick" | "full";
  requestId: string;
  email: string;
  name: string;
  quick?: Record<string, string>;
  answers?: Answers;
  signature?: Signature;
  certified: boolean;
};
export class InputError extends Error {}
function object(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new InputError("Invalid application data.");
  return x as Record<string, unknown>;
}
function text(x: unknown, max = 300, required = false): string {
  if (x === undefined && !required) return "";
  if (
    typeof x !== "string" ||
    x.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x)
  )
    throw new InputError(
      "One of the fields contains invalid or overly long text.",
    );
  const s = x.trim();
  if (required && !s) throw new InputError("Complete all required fields.");
  return s;
}
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export function validateSubmission(
  kind: "quick" | "full",
  input: unknown,
): Submission {
  const body = object(input),
    requestId = text(body.requestId, 36, true);
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      requestId,
    )
  )
    throw new InputError("Refresh the page and try again.");
  let result: Submission;
  if (kind === "quick") {
    const raw = object(body.quick),
      quick: Record<string, string> = {};
    for (const field of quickFields)
      quick[field.key] = text(
        raw[field.key],
        field.key === "email" ? 254 : field.key === "cdl_number" ? 40 : field.key === "ssn_last4" ? 4 : 300,
        field.required || (field.key === "drug_test_date" && raw.drug_test_status === "Date known"),
      );
    if (!positions.includes(quick.position))
      throw new InputError("Choose a valid position.");
    if (!states.includes(quick.state))
      throw new InputError("Choose a valid address state.");
    if (!/^\d{5}(-\d{4})?$/.test(quick.zip))
      throw new InputError("Enter a five-digit ZIP code, or ZIP+4.");
    if (!/^[a-zA-Z0-9 -]{3,40}$/.test(quick.cdl_number))
      throw new InputError("Enter a valid CDL number using letters, digits, spaces, or hyphens.");
    if (!states.includes(quick.cdl_state))
      throw new InputError("Choose the CDL issuing state.");
    if (!cdlClasses.some((value) => value === quick.cdl_class))
      throw new InputError("Choose the CDL class.");
    if (!drugTestStatuses.some((value) => value === quick.drug_test_status))
      throw new InputError("Choose the last DOT drug test status.");
    if (quick.ssn_last4 && !/^\d{4}$/.test(quick.ssn_last4))
      throw new InputError("Enter exactly four SSN digits, or leave it blank.");
    if (quick.drug_test_status !== "Date known" && quick.drug_test_date)
      throw new InputError("Provide a drug test date only when the date is known.");
    for (const key of ["dob", "start_date", "cdl_expiration", "medical_card_issue", "medical_card_expiration", "drug_test_date"]) {
      const v = quick[key];
      if (!v && key === "drug_test_date") continue;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        !dateKey(`${v.slice(5, 7)}/${v.slice(8)}/${v.slice(0, 4)}`)
      )
        throw new InputError("Enter valid dates.");
    }
    const today = new Date().toISOString().slice(0, 10);
    if (quick.dob > today)
      throw new InputError("Date of birth cannot be in the future.");
    if (quick.medical_card_issue > today)
      throw new InputError("Medical card issue date cannot be in the future.");
    if (quick.medical_card_expiration < quick.medical_card_issue)
      throw new InputError("Medical card expiration must follow its issue date.");
    if (quick.drug_test_date && quick.drug_test_date > today)
      throw new InputError("Last drug test date cannot be in the future.");
    const phoneDigits = quick.phone.replace(/\D/g, "");
    if (!(phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith("1"))))
      throw new InputError("Enter a ten-digit US phone number.");
    quick.phone = [phoneDigits.slice(-10, -7), phoneDigits.slice(-7, -4), phoneDigits.slice(-4)].join("-");
    result = {
      kind,
      requestId,
      email: normalizeEmail(quick.email),
      name: quick.full_name,
      quick,
      certified: false,
    };
    quick.email = result.email;
  } else {
    const raw = object(body.answers),
      answers = initialAnswers();
    for (const group of steps.flatMap((s) => s.groups)) {
      const rows = raw[group.key];
      if (
        !Array.isArray(rows) ||
        rows.length > (group.repeat ? 30 : 1) ||
        rows.length < (group.repeat ? group.minimum || 0 : 1)
      )
        throw new InputError(`Complete ${group.title.toLowerCase()}.`);
      answers[group.key] = rows.map((value) => {
        const row = object(value),
          cleaned: Record<string, string> = {};
        for (const field of group.fields)
          cleaned[field.key] = text(
            row[field.key],
            field.type === "textarea" ? 6000 : 300,
          );
        for (const field of group.fields)
          if (!visible(field, cleaned)) delete cleaned[field.key];
        return cleaned;
      });
    }
    for (let i = 0; i < steps.length; i++) {
      const errors = validateStep(i, answers);
      if (Object.keys(errors).length)
        throw new InputError(`${steps[i].title}: ${Object.values(errors)[0]}`);
    }
    const sig = object(body.signature),
      mode = sig.mode;
    if (mode !== "type" && mode !== "draw")
      throw new InputError("Choose a signature method.");
    const signature: Signature = {
      mode,
      name: text(sig.name, 120, true),
      image: mode === "draw" ? text(sig.image, 180000, true) : "",
    };
    if (
      mode === "draw" &&
      !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(signature.image)
    )
      throw new InputError("Please draw your signature again.");
    if (body.certified !== true)
      throw new InputError("Confirm the applicant certification.");
    result = {
      kind,
      requestId,
      email: normalizeEmail(answers.personal[0].email),
      name: [
        answers.personal[0].first,
        answers.personal[0].middle,
        answers.personal[0].last,
      ]
        .filter(Boolean)
        .join(" "),
      answers,
      signature,
      certified: true,
    };
    answers.personal[0].email = result.email;
  }
  if (
    result.email.length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email)
  )
    throw new InputError("Enter a valid email address.");
  return result;
}
