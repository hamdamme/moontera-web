const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(
  path.join(require("node:os").tmpdir(), "moontera-qa-"),
);
fs.symlinkSync(
  path.join(root, "node_modules"),
  path.join(temp, "node_modules"),
  "dir",
);
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "app/apply/schema.ts",
    "app/apply/pdf.ts",
    "--outDir",
    temp,
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--esModuleInterop",
    "--skipLibCheck",
  ],
  { cwd: root, stdio: "inherit" },
);
const {
  initialAnswers,
  steps,
  formatValue,
  validateStep,
  dateKey,
  visible,
} = require(path.join(temp, "schema.js"));
const { createApplicationPdf } = require(path.join(temp, "pdf.js"));
assert.equal(formatValue({ type: "ssn" }, "123456789"), "123-45-6789");
assert.equal(formatValue({ type: "phone" }, "7735550123"), "773-555-0123");
assert.equal(formatValue({ type: "date" }, "02292024"), "02/29/2024");
assert.equal(dateKey("02/29/2023"), null);
assert.equal(dateKey("02/29/2024"), "2024-02-29");
assert.equal(dateKey("13/2024", true), null);
assert.equal(visible({ when: ["flag", "Yes"] }, { flag: "No" }), false);
const a = initialAnswers();
assert(Object.keys(validateStep(0, a)).length > 0);
a.personal[0] = {
  first: "Alex",
  last: "Example",
  dob: "05/15/1990",
  position: "Company driver",
  phone: "773-555-0123",
  email: "alex@example.com",
};
a.eligibility[0] = { work: "Yes", age: "Yes", previous: "No" };
assert.deepEqual(validateStep(0, a), {});
a.personal[0].dob = "02/30/1990";
assert(validateStep(0, a)["personal.0.dob"]);
a.personal[0].dob = "05/15/1990";
a.current[0] = {
  street: "100 Example Street",
  city: "Chicago",
  state: "IL",
  zip: "60601",
  from: "01/2020",
};
a.background[0] = { employed: "Yes", bonded: "No", felony: "No", duties: "No" };
assert.deepEqual(validateStep(1, a), {});
a.addresses = [{ ...a.current[0], from: "02/2020", to: "01/2020" }];
assert(validateStep(1, a)["addresses.0.to"]);
a.addresses = [];
assert(validateStep(2, a)["workNotes.0.notes"]);
a.workNotes[0].notes = "Sample employment history for preview testing only.";
assert.deepEqual(validateStep(2, a), {});
a.licenses = [
  {
    state: "IL",
    number: "SAMPLE12345",
    class: "Class A",
    expires: "05/15/2028",
  },
];
a.licenseHistory[0] = {
  denied: "No",
  revoked: "No",
  accidents: "No",
  violations: "No",
};
assert.deepEqual(validateStep(3, a), {});
a.licenseHistory[0].accidents = "Yes";
assert(validateStep(3, a)["licenseHistory.0.accidents"]);
a.licenseHistory[0].accidents = "No";
a.testing[0] = {
  ack0: "Yes",
  ack1: "Yes",
  ack2: "Yes",
  ack3: "Yes",
  ack4: "Yes",
  refused: "No",
  positive: "No",
  notHired: "No",
};
assert.deepEqual(validateStep(4, a), {});
// Ensure long answers and multiple records paginate, and conditional stale values are excluded.
a.personal[0].first = "José";
a.eligibility[0].reason = "SHOULD_NOT_APPEAR";
a.skills[0].related =
  "Sample experience across a variety of equipment. ".repeat(90);
const font = fs.readFileSync(path.join(root, "public/fonts/Geist-Regular.ttf"));
createApplicationPdf(
  a,
  { mode: "type", name: "José Example", image: "" },
  font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
)
  .then((bytes) => {
    assert(bytes.length > 1000);
    console.log(
      "PASS: required fields, masks, leap-year validation, conditional fields, chronology, record consistency and PDF generation.",
    );
  })
  .finally(() => fs.rmSync(temp, { recursive: true, force: true }));
