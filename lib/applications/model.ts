import {
  initialAnswers,
  steps,
  visible,
  validateStep,
  dateKey,
  type Answers,
  states,
} from "../../app/apply/schema";
export type QuickField = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "select";
  required?: boolean;
  maxLength?: number;
  options?: string[];
  pattern?: string;
  inputMode?: "numeric";
  when?: [string, string];
};
export const quickFields: QuickField[] = [
  { key: "full_name", label: "Full legal name", type: "text", required: true },
  { key: "address", label: "Street address", type: "text", required: true },
  { key: "city", label: "City", type: "text", required: true },
  { key: "state", label: "State", type: "select", required: true, options: states },
  { key: "zip", label: "ZIP code", type: "text", required: true, maxLength: 10 },
  { key: "dob", label: "Date of birth", type: "date", required: true },
  { key: "phone", label: "Phone number", type: "tel", required: true },
  { key: "email", label: "Email address", type: "email", required: true },
  {
    key: "position",
    label: "Position applied for",
    type: "select",
    required: true,
    options: ["Company driver", "Owner operator", "Lease driver", "Other"],
  },
  { key: "start_date", label: "Available start date", type: "date", required: true },
  { key: "cdl_number", label: "CDL number", type: "text", required: true },
  { key: "cdl_state", label: "CDL issuing state", type: "select", required: true, options: states },
  { key: "cdl_class", label: "CDL class", type: "select", required: true, options: ["Class A", "Class B", "Class C", "Other"] },
  { key: "cdl_expiration", label: "CDL expiration date", type: "date", required: true },
  { key: "medical_card_issue", label: "DOT medical card issue date", type: "date", required: true },
  { key: "medical_card_expiration", label: "DOT medical card expiration date", type: "date", required: true },
  {
    key: "drug_test_status",
    label: "Have you previously completed a DOT drug and alcohol test?",
    type: "select",
    required: true,
    options: ["Yes", "No"],
  },
  {
    key: "drug_test_date",
    label: "Date of your most recent DOT drug and alcohol test",
    type: "date",
    required: true,
    when: ["drug_test_status", "Yes"],
  },
  {
    key: "ssn_last4",
    label: "Last four digits of SSN (optional)",
    type: "text",
    maxLength: 4,
    pattern: "[0-9]{4}",
    inputMode: "numeric",
  },
];
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
    requestId = text(body.requestId, 36, true).toLowerCase();
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
    for (const field of quickFields) {
      const required =
        field.required &&
        (!field.when || raw[field.when[0]] === field.when[1]);
      quick[field.key] = text(
        raw[field.key],
        field.maxLength || (field.key === "email" ? 254 : 300),
        !!required,
      );
      if (field.when && raw[field.when[0]] !== field.when[1])
        quick[field.key] = "";
      if (field.options && quick[field.key] && !field.options.includes(quick[field.key]))
        throw new InputError("Choose a valid option.");
    }
    if (!positions.includes(quick.position))
      throw new InputError("Choose a valid position.");
    for (const key of [
      "dob",
      "start_date",
      "cdl_expiration",
      "medical_card_issue",
      "medical_card_expiration",
      ...(quick.drug_test_status === "Yes" ? ["drug_test_date"] : []),
    ]) {
      const v = quick[key];
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        !dateKey(`${v.slice(5, 7)}/${v.slice(8)}/${v.slice(0, 4)}`)
      )
        throw new InputError("Enter valid dates.");
    }
    if (quick.dob > new Date().toISOString().slice(0, 10))
      throw new InputError("Date of birth cannot be in the future.");
    if (!/^\+?1?\d{10}$/.test(quick.phone.replace(/[\s().-]/g, "")))
      throw new InputError("Enter a valid phone number.");
    if (quick.ssn_last4 && !/^\d{4}$/.test(quick.ssn_last4))
      throw new InputError("Enter exactly four digits for the optional SSN field.");
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
