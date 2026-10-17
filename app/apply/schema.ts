
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "phone"
    | "date"
    | "month"
    | "number"
    | "select"
    | "yesno"
    | "checkbox"
    | "textarea";
  required?: boolean;
  options?: string[];
  hint?: string;
  when?: [string, string];
  past?: boolean;
  readOnly?: boolean;
};
export type Group = {
  key: string;
  title: string;
  description?: string;
  fields: Field[];
  repeat?: boolean;
  minimum?: number;
  item?: string;
  fixedRows?: string[];
};
export type Step = {
  title: string;
  heading: string;
  description: string;
  groups: Group[];
};
export type Answers = Record<string, Record<string, string>[]>;
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  required = false,
  extra: Partial<Field> = {},
): Field => ({ key, label, type, required, ...extra });
export const states =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );
const address = [
  f("street", "Street address", "text", true),
  f("city", "City", "text", true),
  f("state", "State", "select", true, { options: states }),
  f("zip", "ZIP code", "text", true),
  f("from", "From", "month", true, { past: true }),
  f("to", "To", "month", true, { past: true }),
];
export const steps: Step[] = [
  {
    title: "About you",
    heading: "Let’s start with you.",
    description: "Your contact details and the role you’re applying for.",
    groups: [
      {
        key: "personal",
        title: "Personal information",
        fields: [
          f("first", "First name", "text", true),
          f("middle", "Middle name"),
          f("last", "Last name", "text", true),
          f("position", "Position applied for", "select", true, {
            options: [
              "Company driver",
              "Owner operator",
              "Lease driver",
              "Other",
            ],
          }),
          f("otherPosition", "Other position", "text", true, {
            when: ["position", "Other"],
          }),
          f("dob", "Date of birth", "date", true, { past: true }),
          f("ssn", "Social Security number", "text", true, {
            hint: "Enter as 000-00-0000. This is saved only when you submit the application.",
          }),
          f("phone", "Phone number", "phone", true),
          f("email", "Email address", "email", true, { readOnly: true }),
          f("startDate", "Available start date", "date", true),
          f("referral", "Who referred you?"),
        ],
      },
      {
        key: "eligibility",
        title: "Employment eligibility",
        fields: [
          f(
            "work",
            "Do you have the legal right to work in the United States?",
            "yesno",
            true,
          ),
          f("age", "Can you provide proof of age?", "yesno", true),
          f("previous", "Have you worked for Moontera before?", "yesno", true),
          ...["from", "to"].map((k) =>
            f(
              k,
              k === "from"
                ? "Previous employment start"
                : "Previous employment end",
              "date",
              true,
              { when: ["previous", "Yes"], past: true },
            ),
          ),
          f("role", "Previous position", "text", true, {
            when: ["previous", "Yes"],
          }),
          f("pay", "Previous rate of pay", "text", false, {
            when: ["previous", "Yes"],
          }),
          f("reason", "Reason for leaving", "textarea", true, {
            when: ["previous", "Yes"],
          }),
        ],
      },
    ],
  },
  {
    title: "Addresses",
    heading: "Where have you lived?",
    description:
      "Include your current address and any previous addresses covering the last three years.",
    groups: [
      {
        key: "current",
        title: "Current address",
        fields: address.filter((x) => x.key !== "to"),
      },
      {
        key: "addresses",
        title: "Previous addresses",
        description:
          "Add an address for each place you lived during the last three years. Leave this empty if your current address covers that period.",
        repeat: true,
        minimum: 0,
        item: "address",
        fields: address,
      },
      {
        key: "background",
        title: "A little more about you",
        fields: [
          f("employed", "Are you currently employed?", "yesno", true),
          f(
            "unemployed",
            "How long since your last employment?",
            "text",
            true,
            { when: ["employed", "No"] },
          ),
          f("bonded", "Have you ever been bonded?", "yesno", true),
          f("bondCompany", "Bonding company", "text", true, {
            when: ["bonded", "Yes"],
          }),
          f(
            "felony",
            "Have you ever been convicted of a felony?",
            "yesno",
            true,
          ),
          f(
            "felonyDetails",
            "Please explain the conviction",
            "textarea",
            true,
            { when: ["felony", "Yes"] },
          ),
          f(
            "duties",
            "Is there any reason you may be unable to perform the job duties?",
            "yesno",
            true,
          ),
          f("dutiesDetails", "Please explain", "textarea", true, {
            when: ["duties", "Yes"],
          }),
        ],
      },
    ],
  },
  {
    title: "Work history",
    heading: "Your experience matters.",
    description:
      "Start with your most recent employer. Add all employers needed for your driver qualification history.",
    groups: [
      {
        key: "employers",
        title: "Employment history",
        repeat: true,
        minimum: 0,
        item: "employer",
        fields: [
          f("company", "Company name", "text", true),
          f("contact", "Contact person"),
          f("phone", "Company phone", "phone", true),
          ...address.filter((x) => !["from", "to"].includes(x.key)),
          f("role", "Position held", "text", true),
          f("wage", "Salary / wage"),
          f("from", "Employment start", "date", true, { past: true }),
          f("current", "Do you currently work here?", "yesno", true),
          f("to", "Employment end", "date", true, {
            when: ["current", "No"],
            past: true,
          }),
          f("reason", "Reason for leaving", "textarea", true, {
            when: ["current", "No"],
          }),
          f("fmcsr", "Were you subject to FMCSR regulations?", "yesno", true),
          f(
            "dot",
            "Was this a DOT safety-sensitive position subject to drug/alcohol testing?",
            "yesno",
            true,
          ),
        ],
      },
      {
        key: "workNotes",
        title: "Employment gaps & additional details",
        fields: [
          f(
            "notes",
            "Explain periods without employment, or why you have no employment history",
            "textarea",
          ),
        ],
      },
    ],
  },
  {
    title: "Driving record",
    heading: "Your licenses & driving record.",
    description:
      "Have your driver’s license handy. Add records individually so everything stays easy to review.",
    groups: [
      {
        key: "licenses",
        title: "Driver licenses",
        repeat: true,
        minimum: 1,
        item: "license",
        fields: [
          f("state", "Issuing state", "select", true, { options: states }),
          f("number", "License number", "text", true),
          f("class", "License class", "select", true, {
            options: ["Class A", "Class B", "Class C", "Other"],
          }),
          f("issued", "Issue date", "date", true, { past: true }),
          f("expires", "Expiration date", "date", true),
          f("endorsements", "Endorsements"),
        ],
      },
      {
        key: "licenseHistory",
        title: "License history",
        fields: [
          f(
            "denied",
            "Have you ever been denied a license, permit, or driving privilege?",
            "yesno",
            true,
          ),
          f("deniedDetails", "Explain the denial", "textarea", true, {
            when: ["denied", "Yes"],
          }),
          f(
            "revoked",
            "Has a license, permit, or driving privilege ever been suspended or revoked?",
            "yesno",
            true,
          ),
          f(
            "revokedDetails",
            "Explain the suspension or revocation",
            "textarea",
            true,
            { when: ["revoked", "Yes"] },
          ),
          f(
            "accidents",
            "Any accidents during the past three years?",
            "yesno",
            true,
          ),
          f(
            "violations",
            "Any traffic convictions or violations, excluding parking?",
            "yesno",
            true,
          ),
        ],
      },
      {
        key: "accidents",
        title: "Accident records",
        description:
          "Include preventable and non-preventable accidents from the past three years.",
        repeat: true,
        minimum: 0,
        item: "accident",
        fields: [
          f("date", "Date", "date", true, { past: true }),
          f("nature", "Nature of accident", "textarea", true),
          f("fatalities", "Fatalities", "number", true),
          f("injuries", "Injuries", "number", true),
          f("spill", "Hazardous material spill?", "yesno", true),
        ],
      },
      {
        key: "violations",
        title: "Traffic convictions & violations",
        repeat: true,
        minimum: 0,
        item: "violation",
        fields: [
          f("location", "Location", "text", true),
          f("date", "Date", "date", true, { past: true }),
          f("charge", "Charge", "text", true),
          f("penalty", "Penalty", "text", true),
        ],
      },
    ],
  },
  {
    title: "Qualifications",
    heading: "Skills, training & safety.",
    description:
      "Tell us about the equipment you’ve operated and complete the testing disclosure.",
    groups: [
      {
        key: "medical",
        title: "Medical card & DOT information",
        fields: [
          f("expires", "Medical card expiration date", "date", true),
        ],
      },
      {
        key: "experience",
        title: "Driving experience",
        fixedRows: [
          "Straight Truck",
          "Tractor & Semi-Trailer",
          "Tractor – Two Trailers",
          "Tractor – Three Trailers",
          "Motorcoach / School Bus",
          "Other",
        ],
        item: "equipment experience",
        fields: [
          f("selected", "Check if applicable", "checkbox"),
          f("from", "From", "month", true, {
            past: true,
            when: ["selected", "Yes"],
          }),
          f("to", "To", "month", true, {
            past: true,
            when: ["selected", "Yes"],
          }),
          f("miles", "Approximate miles", "number", true, {
            when: ["selected", "Yes"],
          }),
          f("other", "Describe other equipment", "text", true, {
            when: ["selected", "Yes"],
          }),
        ],
      },
      {
        key: "skills",
        title: "Additional qualifications",
        fields: [
          f("states", "States operated in during the last five years"),
          f("awards", "Safe driving awards"),
          f(
            "related",
            "Related trucking or transportation experience",
            "textarea",
          ),
          f("training", "Courses or training completed", "textarea"),
          f(
            "equipment",
            "Special equipment or technical materials",
            "textarea",
          ),
        ],
      },
      {
        key: "testing",
        title: "Drug & alcohol disclosure",
        description:
          "Acknowledge your understanding of these testing programs. These answers are not a separate background-check authorization.",
        fields: [
          ...[
            "Pre-employment",
            "Random",
            "Reasonable suspicion",
            "Post-accident",
            "Return-to-duty / follow-up",
          ].map((x, i) =>
            f(
              "ack" + i,
              `Do you understand ${x.toLowerCase()} testing requirements?`,
              "yesno",
              true,
            ),
          ),
          f(
            "refused",
            "Have you refused a drug or alcohol test within the last two years?",
            "yesno",
            true,
          ),
          f(
            "refusedDetails",
            "Explain the refusal and return-to-duty process",
            "textarea",
            true,
            { when: ["refused", "Yes"] },
          ),
          f(
            "positive",
            "Have you tested positive within the last two years?",
            "yesno",
            true,
          ),
          f(
            "positiveDetails",
            "Explain the positive test and return-to-duty process",
            "textarea",
            true,
            { when: ["positive", "Yes"] },
          ),
          f(
            "notHired",
            "Have you tested positive on a pre-employment test for a job you did not obtain?",
            "yesno",
            true,
          ),
          f("notHiredDetails", "Please explain", "textarea", true, {
            when: ["notHired", "Yes"],
          }),
        ],
      },
      {
        key: "drugTestAuthorization",
        title: "Authorization to Obtain Past Drug & Alcohol Test Results",
        description:
          "I authorize Moontera LLC to obtain all DOT-required drug and alcohol testing records from previous employers, including positive test results, refusals, and return-to-duty documentation as permitted by federal regulations.\n\nI authorize Moontera LLC to obtain all DOT-required drug and alcohol testing records from all companies for which I worked or applied as a driver during the past two (2) years.",
        fields: [
          f("authorized", "I have read and agree to this authorization", "select", true, {
            options: ["I agree"],
          }),
          f("typedName", "Typed full legal name", "text", true),
        ],
      },
      {
        key: "testEmployers",
        title: "Related employers / applications (past two years)",
        description:
          "List each company where you worked or applied as a driver during the past two years, under the authorization immediately above.",
        repeat: true,
        minimum: 0,
        item: "company",
        fields: [
          f("company", "Company name", "text", true),
          f("dates", "Dates worked / applied", "text", true),
        ],
      },
    ],
  },
];
export const initialAnswers = (): Answers =>
  Object.fromEntries(
    steps
      .flatMap((s) => s.groups)
      .map((g) => [
        g.key,
        g.fixedRows
          ? g.fixedRows.map((equipment) => ({ equipment }))
          : Array.from({ length: g.repeat ? g.minimum || 0 : 1 }, () => ({})),
      ]),
  );
export const visible = (f: Field, row: Record<string, string>) =>
  (!f.when || row[f.when[0]] === f.when[1]) &&
  !(f.key === "other" && row.equipment && row.equipment !== "Other");
export const path = (g: string, i: number, k: string) => `${g}.${i}.${k}`;
export function formatValue(f: Field, v: string) {
  if (f.key === "ssn") {
    const digits = v.replace(/\D/g, "").slice(0, 9);
    return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5)]
      .filter(Boolean)
      .join("-");
  }
  if (f.type === "date" || f.type === "month") {
    const d = v.replace(/\D/g, "").slice(0, f.type === "date" ? 8 : 6);
    return (
      f.type === "date"
        ? [d.slice(0, 2), d.slice(2, 4), d.slice(4)]
        : [d.slice(0, 2), d.slice(2)]
    )
      .filter(Boolean)
      .join("/");
  }
  if (f.type === "phone") {
    const d = v.replace(/\D/g, "").slice(0, 10);
    return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join("-");
  }
  if (f.type === "number") return v.replace(/\D/g, "").slice(0, 9);
  if (f.key === "zip") {
    const d = v.replace(/\D/g, "").slice(0, 9);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }
  return v;
}
export function dateKey(value: string, month = false): string | null {
  const parts = value.split("/");
  if (parts.length !== (month ? 2 : 3)) return null;
  const [m, d, y] = month
    ? [Number(parts[0]), 1, Number(parts[1])]
    : parts.map(Number);
  if (
    (month ? parts[1] : parts[2]).length !== 4 ||
    y < 1900 ||
    y > 2200 ||
    m < 1 ||
    m > 12 ||
    d < 1
  )
    return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function validateStep(step: number, a: Answers) {
  const errors: Record<string, string> = {};
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  for (const g of steps[step].groups) {
    for (const [i, row] of (a[g.key] || []).entries())
      for (const f of g.fields) {
        if (!visible(f, row)) continue;
        const v = (row[f.key] || "").trim();
        let e = "";
        if (f.required && !v) e = "Please complete this field.";
        else if (v) {
          if (f.type === "number" && !/^\d{1,9}$/.test(v))
            e = "Enter a whole number using digits only.";
          if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
            e = "Enter a valid email address.";
          if (f.type === "phone" && !/^\d{3}-\d{3}-\d{4}$/.test(v))
            e = "Enter a 10-digit phone number.";
          if (f.key === "ssn" && !/^\d{3}-\d{2}-\d{4}$/.test(v))
            e = "Enter a 9-digit Social Security number.";
          if (f.key === "zip" && !/^\d{5}(-\d{4})?$/.test(v))
            e = "Enter a 5- or 9-digit ZIP code.";
          if (f.options && !f.options.includes(v))
            e = "Choose an option from the list.";
          if (f.type === "date" || f.type === "month") {
            const key = dateKey(v, f.type === "month");
            if (!key)
              e =
                f.type === "month"
                  ? "Enter a valid month as MM/YYYY."
                  : "Enter a valid date as MM/DD/YYYY.";
            else if (f.past && key > today)
              e = "This date cannot be in the future.";
            else if (
              f.key === "to" &&
              row.from &&
              key < (dateKey(row.from, f.type === "month") || "")
            )
              e = "End date must be on or after the start date.";
          }
        }
        if (e) errors[path(g.key, i, f.key)] = e;
      }
  }
  if (step === 2 && !a.employers.length && !a.workNotes[0].notes?.trim())
    errors[path("workNotes", 0, "notes")] =
      "Add an employer or explain your work history.";
  if (step === 3)
    for (const key of ["accidents", "violations"]) {
      const answer = a.licenseHistory[0][key];
      if (answer === "Yes" && !a[key].length)
        errors[path("licenseHistory", 0, key)] =
          "Add at least one record below.";
      if (answer === "No" && a[key].length)
        errors[path("licenseHistory", 0, key)] =
          "Remove the records below or change this answer to Yes.";
    }
  return errors;
}
export const certification =
  "I certify that all information contained in this application and supporting documents is true, complete, and accurate to the best of my knowledge. I understand that false, incomplete, or misleading information may result in disqualification or termination. This application does not guarantee employment.";
