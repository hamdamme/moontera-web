const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  tmp = fs.mkdtempSync("/private/tmp/moontera-intake-");
fs.symlinkSync(
  path.join(root, "node_modules"),
  path.join(tmp, "node_modules"),
  "dir",
);
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "lib/applications/model.ts",
    "lib/applications/workflow.ts",
    "lib/applications/submission-pdf.ts",
    "--outDir",
    tmp,
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--esModuleInterop",
    "--skipLibCheck",
  ],
  { cwd: root, stdio: "inherit" },
);
const { validateSubmission } = require(
  path.join(tmp, "lib/applications/model.js"),
);
const { processSubmission } = require(
  path.join(tmp, "lib/applications/workflow.js"),
);
const { createSubmissionPdf } = require(
  path.join(tmp, "lib/applications/submission-pdf.js"),
);
const { initialAnswers, steps, dateKey, formatValue, validateStep } = require(
  path.join(tmp, "app/apply/schema.js"),
);
const id = "00000000-0000-4000-8000-000000000001";
const raw = {
  requestId: id,
  quick: {
    full_name: "Alex Example",
    address: "100 Example Street",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    dob: "1990-05-15",
    phone: "773-555-0123",
    email: "ALEX@example.com",
    position: "Company driver",
    start_date: "2026-11-01",
    cdl_number: "IL12345678",
    cdl_state: "IL",
    cdl_class: "Class A",
    cdl_expiration: "2028-11-01",
    medical_card_issue: "2026-02-01",
    medical_card_expiration: "2028-02-01",
    drug_test_status: "Date known",
    drug_test_date: "2026-01-15",
    ssn_last4: "",
  },
};
const quick = validateSubmission("quick", raw);
assert.equal(quick.email, "alex@example.com");
assert.equal(quick.quick.cdl_state, "IL");
assert.equal(quick.quick.drug_test_date, "2026-01-15");
assert.equal(quick.quick.phone, "773-555-0123");
assert.throws(() => validateSubmission("quick", {...raw, quick: {...raw.quick, state: "ZZ"}}));
assert.throws(() => validateSubmission("quick", {...raw, quick: {...raw.quick, zip: "abcdef"}}));
assert.throws(() => validateSubmission("quick", {...raw, quick: {...raw.quick, phone: "12345"}}));
for (const [key, value] of [
  ["cdl_state", "XX"],
  ["cdl_class", "Class Z"],
  ["cdl_number", ""],
  ["medical_card_issue", "2026-02-30"],
  ["medical_card_expiration", "2025-01-01"],
  ["drug_test_date", "2026-02-30"],
  ["ssn_last4", "12345"],
  ["ssn_last4", "123"],
]) {
  assert.throws(() => validateSubmission("quick", {
    ...raw,
    quick: { ...raw.quick, [key]: value },
  }), `Invalid ${key} should fail`);
}
assert.throws(() => validateSubmission("quick", {
  ...raw, quick: { ...raw.quick, drug_test_date: "", drug_test_status: "Date known" },
}));
for (const status of ["Unknown", "Never tested"]) {
  const result = validateSubmission("quick", {
    ...raw, quick: { ...raw.quick, drug_test_status: status, drug_test_date: "" },
  });
  assert.equal(result.quick.drug_test_date, "");
}
assert.throws(() =>
  validateSubmission("quick", {
    ...raw,
    quick: { ...raw.quick, dob: "1990-02-30" },
  }),
);
assert.throws(() =>
  validateSubmission("full", {
    requestId: id,
    answers: {},
    certified: true,
    signature: { mode: "type", name: "Alex" },
  }),
);
assert.equal(dateKey("02/29/2023"), null);
assert.equal(dateKey("02/29/2024"), "2024-02-29");
assert.equal(formatValue({ type: "phone" }, "7735550123"), "773-555-0123");
const a = initialAnswers();
for (const step of steps)
  for (const group of step.groups) {
    for (const row of a[group.key])
      for (const f of group.fields) {
        if (!f.required) continue;
        row[f.key] =
          f.options?.[0] ||
          (f.type === "yesno"
            ? "No"
            : f.type === "date"
              ? "01/01/2020"
              : f.type === "month"
                ? "01/2020"
                : f.type === "phone"
                  ? "773-555-0123"
                  : f.type === "email"
                    ? "alex@example.com"
                    : f.type === "number"
                      ? "0"
                      : f.key === "zip"
                        ? "60601"
                        : "Sample");
      }
  }
a.personal[0] = {
  ...a.personal[0],
  first: "José",
  last: "Example",
  dob: "05/15/1990",
  startDate: "11/01/2026",
};
a.current[0] = {
  ...a.current[0],
  street: "100 Example Street",
  city: "Chicago",
  state: "IL",
  zip: "60601",
};
a.eligibility[0] = { work: "Yes", age: "Yes", previous: "No" };
a.workNotes[0].notes =
  "No previous employment; sample application for testing.";
a.medical[0].expires = "05/15/2028";
a.clearinghouse[0].signature = "José Example";
const full = validateSubmission("full", {
  requestId: id,
  answers: a,
  certified: true,
  signature: { mode: "type", name: "José Example", image: "" },
});
const omitted = structuredClone(a);
omitted.personal = [];
assert.throws(() =>
  validateSubmission("full", {
    requestId: id,
    answers: omitted,
    certified: true,
    signature: { mode: "type", name: "Alex", image: "" },
  }),
);
a.addresses = [{ ...a.current[0], from: "02/2020", to: "01/2020" }];
assert(validateStep(1, a)["addresses.0.to"]);
const state = new Map();
let revision = 0,
  sends = [];
const clone = (x) => JSON.parse(JSON.stringify(x));
const store = {
  async read(k) {
    return state.has(k) ? clone(state.get(k)) : null;
  },
  async create(k, r) {
    if (state.has(k)) return null;
    const s = { record: clone(r), version: String(++revision) };
    state.set(k, s);
    return clone(s);
  },
  async save(k, r, v) {
    if (state.get(k)?.version !== v) return null;
    const s = { record: clone(r), version: String(++revision) };
    state.set(k, s);
    return clone(s);
  },
};
let now = Date.now();
const deps = {
  store,
  now: () => now,
  pdf: async () => new Uint8Array([1, 2, 3]),
  send: async (r, to) => {
    sends.push(to);
    return to + "-id";
  },
};
(async () => {
  const first = await processSubmission("quick", quick, deps);
  assert(first.id);
  await processSubmission("quick", quick, deps);
  assert.deepEqual(sends, ["owner", "applicant"]);
  await assert.rejects(
    processSubmission(
      "quick",
      { ...quick, requestId: "00000000-0000-4000-8000-000000000002" },
      deps,
    ),
    (e) => e.status === 409,
  );
  sends = [];
  const concurrent = await Promise.allSettled([
    processSubmission("race", quick, deps),
    processSubmission("race", quick, deps),
  ]);
  assert(concurrent.some((r) => r.status === "fulfilled"));
  assert.deepEqual(sends, ["owner", "applicant"]);
  sends = [];
  let fail = true;
  const partial = {
    ...deps,
    send: async (r, to) => {
      if (to === "applicant" && fail) throw Error("provider unavailable");
      sends.push(to);
      return to + "-id";
    },
  };
  await assert.rejects(processSubmission("partial", quick, partial));
  assert.deepEqual(sends, ["owner"]);
  fail = false;
  await processSubmission("partial", quick, partial);
  assert.deepEqual(sends, ["owner", "applicant"]);
  const timed = {
    ...deps,
    send: async () => {
      throw Error("network timeout");
    },
  };
  await assert.rejects(processSubmission("timeout", quick, timed));
  now += 24 * 60 * 60 * 1000;
  await assert.rejects(processSubmission("timeout", quick, deps), (e) =>
    e.message.includes("delivery needs attention"),
  );
  // Long narratives and Unicode names must flow across pages without truncation.
  full.answers.skills[0].related =
    "Detailed equipment experience and safety training. ".repeat(100);
  const font = fs.readFileSync(
      path.join(root, "public/fonts/Geist-Regular.ttf"),
    ),
    template = fs.readFileSync(
      path.join(root, "assets/application-reference.pdf"),
    );
  const out =
    process.env.APPLICATION_QA_DIR || "/private/tmp/moontera-application-qa";
  fs.mkdirSync(out, { recursive: true });
  const longPdf = await createSubmissionPdf(full, "SAMPLE-LONG-ANSWERS", "2026-10-13T20:00:00.000Z", font, template);
  fs.writeFileSync("/private/tmp/moontera-long-answers.pdf", longPdf);
  full.answers.skills[0].related = "Experience operating tractor-trailers and handling freight. Sample application for layout review only.";
  for (const sample of [quick, full]) {
    const bytes = await createSubmissionPdf(
      sample,
      "SAMPLE-APPLICATION-ONLY",
      "2026-10-13T20:00:00.000Z",
      font,
      template,
    );
    fs.writeFileSync(
      path.join(out, `Moontera-${sample.kind}-sample.pdf`),
      bytes,
    );
    assert(bytes.length > 1000);
  }
  console.log(
    "PASS: validation, missing groups, date checks, email normalization, concurrent duplicate prevention, repeat requests, partial email retry, timeout cutoff, and formatted PDFs.",
  );
})().finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
