
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness. */
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
    "lib/applications/policies-pdf.ts",
    "lib/applications/origin.ts",
    "lib/http/read-json-body.ts",
    "lib/screening/pdf.ts",
    "lib/onboarding/draft-lifecycle.ts",
    "lib/screening/disclosure-approval.ts",
    "--outDir",
    tmp,
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--esModuleInterop",
    "--resolveJsonModule",
    "--skipLibCheck",
  ],
  { cwd: root, stdio: "inherit" },
);
const { validateSubmission, sanitizeDraftAnswers, quickFields } = require(
  path.join(tmp, "lib/applications/model.js"),
);
const { processSubmission } = require(
  path.join(tmp, "lib/applications/workflow.js"),
);
const { isAllowedApplicationOrigin } = require(
  path.join(tmp, "lib/applications/origin.js"),
);
const { JsonBodyError, readJsonBody } = require(
  path.join(tmp, "lib/http/read-json-body.js"),
);
const { createSubmissionPdf } = require(
  path.join(tmp, "lib/applications/submission-pdf.js"),
);
const { createPolicyPacketPdf, createSignedPolicyPacketPdf } = require(
  path.join(tmp, "lib/applications/policies-pdf.js"),
);
const { createScreeningPdf } = require(path.join(tmp, "lib/screening/pdf.js"));
const { draftRetentionDeadline } = require(
  path.join(tmp, "lib/onboarding/draft-lifecycle.js"),
);
const { screeningTermsAreApproved } = require(
  path.join(tmp, "lib/screening/disclosure-approval.js"),
);
const { initialAnswers, steps, dateKey, formatValue, validateStep } = require(
  path.join(tmp, "app/apply/schema.js"),
);
const id = "00000000-0000-4000-8000-000000000001";
const retentionNow = Date.UTC(2026, 0, 1);
const originalInviteExpires = retentionNow + 14 * 24 * 60 * 60 * 1000;
const originalDraftDeadline = draftRetentionDeadline(
  undefined,
  originalInviteExpires,
  retentionNow,
);
assert.equal(
  originalDraftDeadline,
  originalInviteExpires + 30 * 24 * 60 * 60 * 1000,
);
const replacementInviteExpires = originalInviteExpires + 14 * 24 * 60 * 60 * 1000;
assert.equal(
  draftRetentionDeadline(originalDraftDeadline, replacementInviteExpires, retentionNow),
  originalDraftDeadline,
);
assert.equal(
  draftRetentionDeadline(originalDraftDeadline, replacementInviteExpires, originalDraftDeadline),
  replacementInviteExpires + 30 * 24 * 60 * 60 * 1000,
);
assert.equal(screeningTermsAreApproved(undefined, "Approved period: one year", "one year"), false);
assert.equal(screeningTermsAreApproved("true", undefined, "one year"), false);
assert.equal(screeningTermsAreApproved("true", "Approved period: one year", ""), false);
assert.equal(screeningTermsAreApproved("true", "Approved period: two years", "one year"), false);
assert.equal(screeningTermsAreApproved("true", "Approved period: ONE YEAR", "one year"), true);
assert.equal(isAllowedApplicationOrigin(null, "https://www.moonterallc.com/api/application/quick"), false);
assert.equal(isAllowedApplicationOrigin("https://www.moonterallc.com", "https://preview.example/api/application/quick"), true);
assert.equal(isAllowedApplicationOrigin("https://moonterallc.com", "https://preview.example/api/application/quick"), true);
assert.equal(isAllowedApplicationOrigin("https://preview.example", "https://preview.example/api/application/quick"), true);
assert.equal(isAllowedApplicationOrigin("https://attacker.example", "https://preview.example/api/application/quick"), false);
const raw = {
  requestId: id,
  quick: {
    first_name: "Alex",
    middle_name: "Jordan",
    last_name: "Example",
    address: "100 Example Street",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    dob: "1990-05-15",
    phone: "773-555-0123",
    email: "ALEX@example.com",
    position: "Company driver",
    start_date: "2026-11-01",
    cdl_number: "EXAMPLE123",
    cdl_state: "IL",
    cdl_class: "Class A",
    cdl_expiration: "2028-06-30",
    medical_card_expiration: "2028-01-01",
    drug_test_status: "No",
    drug_test_date: "",
    ssn_last4: "1234",
  },
};
const quick = validateSubmission("quick", raw);
assert.equal(quick.email, "alex@example.com");
assert.equal(quick.name, "Alex Jordan Example");
assert.equal(quick.quick.ssn_last4, "1234");
assert.equal(Object.hasOwn(quick.quick, "medical_card_issue"), false);
assert.equal(quickFields.find((field) => field.key === "ssn_last4").required, true);
assert.equal(quickFields.some((field) => field.key === "medical_card_issue"), false);
assert.equal(quickFields.find((field) => field.key === "middle_name").required, undefined);
assert.equal(validateSubmission("quick", {
  ...raw,
  quick: { ...raw.quick, middle_name: "" },
}).name, "Alex Example");
assert.throws(() =>
  validateSubmission("quick", {
    ...raw,
    quick: { ...raw.quick, ssn_last4: "123" },
  }),
);
assert.throws(() =>
  validateSubmission("quick", { ...raw, quick: { ...raw.quick, ssn_last4: "" } }),
);
assert.throws(() =>
  validateSubmission("quick", {
    ...raw,
    quick: { ...raw.quick, drug_test_status: "Yes", drug_test_date: "" },
  }),
);
assert.equal(
  validateSubmission("quick", {
    ...raw,
    quick: {
      ...raw.quick,
      drug_test_status: "Yes",
      drug_test_date: "2026-02-01",
    },
  }).quick.drug_test_date,
  "2026-02-01",
);
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
  ssn: "123-45-6789",
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
a.background[0] = { employed: "Yes", bonded: "No", felony: "No", duties: "No" };
a.workNotes[0].notes =
  "No previous employment; sample application for testing.";
a.medical[0].expires = "05/15/2028";
assert.equal(steps.flatMap((step) => step.groups).some((g) => g.key === "clearinghouse"), false);
assert.equal(steps.flatMap((step) => step.groups).some((g) => g.key === "communications"), false);
assert.equal(steps.flatMap((step) => step.groups).some((g) => g.fields.some((f) => f.key === "lastTest")), false);
assert.equal(steps.flatMap((step) => step.groups).find((g) => g.key === "licenses").fields.some((f) => f.key === "issued"), true);
const personalFields = steps.flatMap((step) => step.groups).find((g) => g.key === "personal").fields;
assert.deepEqual(personalFields.slice(0, 7).map((f) => f.key), [
  "first", "middle", "last", "position", "otherPosition", "dob", "ssn",
]);
assert.equal(personalFields.find((f) => f.key === "ssn").required, true);
assert.equal(formatValue(personalFields.find((f) => f.key === "ssn"), "123456789"), "123-45-6789");
assert.equal(steps.flatMap((step) => step.groups).some((g) => g.key === "drugTestAuthorization"), true);
const experienceGroup = steps.flatMap((step) => step.groups).find((g) => g.key === "experience");
assert.deepEqual(experienceGroup.fixedRows, [
  "Straight Truck",
  "Tractor & Semi-Trailer",
  "Tractor – Two Trailers",
  "Tractor – Three Trailers",
  "Motorcoach / School Bus",
  "Other",
]);
a.experience[0] = {
  ...a.experience[0],
  equipment: "Tampered type",
  selected: "Yes",
  from: "01/2020",
  to: "02/2021",
  miles: "100000",
};
a.personal[0].ssn = "123-45-6789";
const full = validateSubmission("full", {
  requestId: id,
  answers: a,
  certified: true,
  signature: { mode: "type", name: "José Example", image: "" },
});
assert.equal(full.answers.experience[0].equipment, "Straight Truck");
assert.equal(full.answers.experience.filter((row) => row.selected === "Yes").length, 1);
assert.equal(full.answers.personal[0].ssn, "123-45-6789");
assert.deepEqual(validateStep(0, full.answers), {});
assert.throws(() =>
  validateSubmission("full", {
    requestId: id,
    answers: {
      ...a,
      personal: [{ ...a.personal[0], ssn: "12345" }],
    },
    certified: true,
    signature: { mode: "type", name: "José Example", image: "" },
  }),
  /Social Security number/,
);
assert.equal(full.answers.drugTestAuthorization[0].authorized, "I agree");
const draft = sanitizeDraftAnswers({ answers: a }, "alex@example.com");
assert.equal(draft.personal[0].email, "alex@example.com");
assert.equal(Object.hasOwn(draft.personal[0], "ssn"), false);
assert.equal(draft.experience[0].equipment, "Straight Truck");
assert.deepEqual(
  [draft.background[0].employed, draft.background[0].bonded, draft.background[0].felony, draft.background[0].duties],
  ["Yes", "No", "No", "No"],
);
assert.equal(sanitizeDraftAnswers({ answers: initialAnswers() }, "alex@example.com").personal[0].email, "alex@example.com");
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
  const validJsonRequest = new Request("https://example.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "synthetic" }),
  });
  assert.deepEqual(await readJsonBody(validJsonRequest, 4096), { token: "synthetic" });
  await assert.rejects(
    readJsonBody(
      new Request("https://example.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(5000) }),
      }),
      4096,
    ),
    (error) => error instanceof JsonBodyError && error.status === 413,
  );
  await assert.rejects(
    readJsonBody(
      new Request("https://example.test", { method: "POST", body: "{}" }),
      4096,
    ),
    (error) => error instanceof JsonBodyError && error.status === 415,
  );
  await assert.rejects(
    readJsonBody(
      new Request("https://example.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
      4096,
    ),
    (error) => error instanceof JsonBodyError && error.status === 400,
  );
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
    (e) => e.status === 429,
  );
  const historyDeps = {
    ...deps,
    historyKey: (_key, requestId) => `quick-history/${requestId}`,
  };
  const removedPayload = { ...quick, requestId: "00000000-0000-4000-8000-000000000006" };
  const removed = await processSubmission("removed-quick", removedPayload, deps);
  const savedRemoved = await store.read("removed-quick");
  await store.save("removed-quick", { ...savedRemoved.record, deletedAt: new Date(now).toISOString() }, savedRemoved.version);
  const afterRemoval = await processSubmission("removed-quick", {
    ...quick,
    requestId: "00000000-0000-4000-8000-000000000007",
  }, historyDeps);
  assert(afterRemoval.id && afterRemoval.id !== removed.id);
  const reapplication = {
    ...quick,
    requestId: "00000000-0000-4000-8000-000000000002",
  };
  now += 89 * 24 * 60 * 60 * 1000;
  await assert.rejects(
    processSubmission("quick", reapplication, historyDeps),
    (e) => e.status === 429,
  );
  now += 24 * 60 * 60 * 1000;
  sends = [];
  const second = await processSubmission("quick", reapplication, historyDeps);
  assert(second.id && second.id !== first.id);
  assert.deepEqual(sends, ["owner", "applicant"]);
  const archived = await store.read(`quick-history/${quick.requestId}`);
  assert.equal(archived.record.id, first.id);
  assert.equal(archived.record.complete, true);
  sends = [];
  const retryFirst = await processSubmission("quick", quick, historyDeps);
  assert.equal(retryFirst.id, first.id);
  assert.equal(retryFirst.alreadySubmitted, true);
  assert.deepEqual(sends, []);

  await processSubmission("rotate-race", quick, historyDeps);
  now += 90 * 24 * 60 * 60 * 1000;
  sends = [];
  const competing = await Promise.allSettled([
    processSubmission(
      "rotate-race",
      { ...quick, requestId: "00000000-0000-4000-8000-000000000003" },
      historyDeps,
    ),
    processSubmission(
      "rotate-race",
      { ...quick, requestId: "00000000-0000-4000-8000-000000000004" },
      historyDeps,
    ),
  ]);
  assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
  assert.deepEqual(sends, ["owner", "applicant"]);
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
  const revisedPdf = await createSubmissionPdf(full, "SAMPLE-REVISION-1", "2026-10-17T15:00:00.000Z", font, template, 1);
  fs.writeFileSync(path.join(out, "Moontera-full-revision-1-sample.pdf"), revisedPdf);
  const policyPdf = await createPolicyPacketPdf(font);
  const policyDocument = await require("pdf-lib").PDFDocument.load(policyPdf);
  assert(policyPdf.length > 1000 && policyDocument.getPageCount() >= 3);
  const signedPolicyPdf = await createSignedPolicyPacketPdf(font, {
    name: "Alex Jordan Example",
    email: "alex@example.com",
    signedAt: "2026-10-17T15:30:00.000Z",
    reference: "SAMPLE-POLICY-SIGNATURE",
  });
  const signedPolicyDocument = await require("pdf-lib").PDFDocument.load(signedPolicyPdf);
  assert(signedPolicyDocument.getTitle().includes("Alex Jordan Example"));
  assert(signedPolicyDocument.getPageCount() >= policyDocument.getPageCount());
  fs.writeFileSync(path.join(out, "Moontera-signed-policy-sample.pdf"), signedPolicyPdf);
  const legalDocs = require(path.join(root, "app/apply/documents/documents.json"));
  const screeningPdf = await createScreeningPdf({
    id: "SAMPLE-SCREENING-ONLY",
    name: "Alex Example",
    email: "alex@example.com",
    submittedAt: "2026-10-17T15:00:00.000Z",
    certificationDate: "2026-10-17",
    mvrName: "Alex Example",
    pspName: "Alex Example",
    clearinghouseName: "Alex Example",
    certificationName: "Alex Example",
    signedAt: "2026-10-17T15:00:00.000Z",
    disclosureHash: "SYNTHETIC-ONLY",
  }, {
    mvr: legalDocs.find((document) => document.id === "mvr"),
    psp: legalDocs.find((document) => document.id === "psp"),
    clearinghouseText: "Synthetic sample only; this wording is not approved for driver use.",
    consentPeriod: "SAMPLE PERIOD",
  }, font, template);
  fs.writeFileSync(path.join(out, "Moontera-screening-sample.pdf"), screeningPdf);
  assert(screeningPdf.length > 1000 && revisedPdf.length > 1000);
  console.log(
    "PASS: bounded JSON bodies, validation, request origins, missing groups, date checks, email normalization, screening release gate, draft retention deadlines, concurrent duplicate prevention, repeat requests, partial email retry, timeout cutoff, and formatted application, screening, unsigned policy, and signed policy PDFs.",
  );
})().finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
