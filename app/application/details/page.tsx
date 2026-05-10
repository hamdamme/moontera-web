"use client";

import { useEffect, useState } from "react";

export default function FullApplicationPage() {
  const [status, setStatus] = useState("");
  const [generalInfo, setGeneralInfo] = useState({
    full_name: "",
    address: "",
    city_state_zip: "",
    dob: "",
    phone: "",
    email: "",
    position: "Owner Operator",
    start_date: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("moontera_application_general");

    if (saved) {
      setGeneralInfo(JSON.parse(saved));
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const data = {
      full_name: formData.get("full_name"),
      address: formData.get("address"),
      city_state_zip: formData.get("city_state_zip"),
      dob: formData.get("dob"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      position: formData.get("position"),
      start_date: formData.get("start_date"),

      license_number: formData.get("license_number"),
      license_state: formData.get("license_state"),
      license_class: formData.get("license_class"),
      endorsements: formData.get("endorsements"),
      license_expiration: formData.get("license_expiration"),

      medcard_registration: formData.get("medcard_registration"),
      medcard_expiration: formData.get("medcard_expiration"),
      last_dot_test_date: formData.get("last_dot_test_date"),

      clearinghouse_portal_ack: formData.get("clearinghouse_portal_ack"),
      clearinghouse_consent_signature: formData.get(
        "clearinghouse_consent_signature"
      ),
      consent_date: formData.get("consent_date"),
    };

    localStorage.setItem(
      "moontera_application_complete",
      JSON.stringify(data)
    );

    setStatus("Complete application submitted successfully.");
    form.reset();
  }

  return (
    <main className="bg-white text-slate-950">
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-28 text-white lg:px-10">
        <div className="absolute inset-0 bg-[url('/images/truck-hero.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
            Full Driver Application
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Complete Driver Qualification Form
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Complete this form if you are ready to provide CDL, medical card,
            DOT testing, and FMCSA Clearinghouse consent information.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl"
        >
          {/* GENERAL INFO */}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Section 1
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Applicant Information
            </h2>

            <div className="mt-8 grid gap-5">
              <div>
                <label className="text-sm font-bold">Full Name</label>
                <input
                  name="full_name"
                  required
                  type="text"
                  defaultValue={generalInfo.full_name}
                  placeholder="Full legal name"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Address</label>
                <input
                  name="address"
                  required
                  type="text"
                  defaultValue={generalInfo.address}
                  placeholder="Street address, apartment/unit"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">City / State / ZIP</label>
                <input
                  name="city_state_zip"
                  required
                  type="text"
                  defaultValue={generalInfo.city_state_zip}
                  placeholder="City / State / ZIP"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold">Date of Birth</label>
                  <input
                    name="dob"
                    required
                    type="date"
                    defaultValue={generalInfo.dob}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Phone</label>
                  <input
                    name="phone"
                    required
                    type="tel"
                    defaultValue={generalInfo.phone}
                    placeholder="Phone number"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold">Email</label>
                <input
                  name="email"
                  required
                  type="email"
                  defaultValue={generalInfo.email}
                  placeholder="email@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold">
                    Position Applied For
                  </label>

                  <select
                    name="position"
                    required
                    defaultValue={generalInfo.position}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Owner Operator</option>
                    <option>Company Driver</option>
                    <option>Lease Driver</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">
                    Available Start Date
                  </label>

                  <input
                    name="start_date"
                    required
                    type="date"
                    defaultValue={generalInfo.start_date}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CDL INFO */}
          <div className="mt-14 border-t border-slate-200 pt-10">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Section 2
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              CDL Information
            </h2>

            <div className="mt-8 grid gap-5">
              <div>
                <label className="text-sm font-bold">CDL License Number</label>
                <input
                  name="license_number"
                  required
                  type="text"
                  placeholder="License number"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="text-sm font-bold">License State</label>
                  <input
                    name="license_state"
                    required
                    type="text"
                    placeholder="Example: IL"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">License Class</label>
                  <select
                    name="license_class"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold">
                    License Expiration
                  </label>
                  <input
                    name="license_expiration"
                    required
                    type="date"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold">Endorsements</label>
                <input
                  name="endorsements"
                  type="text"
                  placeholder="Example: Tanker, Hazmat, Doubles/Triples, or None"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* MEDICAL / DOT */}
          <div className="mt-14 border-t border-slate-200 pt-10">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Section 3
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Medical Card & DOT Information
            </h2>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <div>
                <label className="text-sm font-bold">
                  Medical Card Registration Date
                </label>
                <input
                  name="medcard_registration"
                  required
                  type="date"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">
                  Medical Card Expiration Date
                </label>
                <input
                  name="medcard_expiration"
                  required
                  type="date"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Last DOT Test Date</label>
                <input
                  name="last_dot_test_date"
                  required
                  type="date"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* CONSENT */}
          <div className="mt-14 border-t border-slate-200 pt-10">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Section 4
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              FMCSA Drug & Alcohol Clearinghouse Consent
            </h2>

            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700">
              <p className="font-bold text-slate-950">
                FMCSA DRUG & ALCOHOL CLEARINGHOUSE CONSENT
              </p>

              <p className="mt-4">
                I authorize Moontera LLC to conduct required FMCSA Drug &
                Alcohol Clearinghouse queries as permitted under 49 CFR Part
                382, including pre-employment and annual limited queries.
              </p>

              <p className="mt-4">
                I understand that if a limited query shows that information
                exists in the Clearinghouse, I may be required to log in to the
                FMCSA Clearinghouse portal and provide electronic consent for
                Moontera LLC to obtain a full query result.
              </p>

              <p className="mt-4">
                I understand that refusal to provide required consent may
                prevent me from performing safety-sensitive duties, including
                operating a commercial motor vehicle.
              </p>

              <p className="mt-6 font-bold text-slate-950">
                APPLICANT CERTIFICATION
              </p>

              <p className="mt-4">
                I certify that this application was completed by me and that all
                information provided is true, complete, and accurate to the best
                of my knowledge. I understand that false or misleading
                information may result in rejection of this application or
                termination.
              </p>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold leading-6">
                <input
                  name="clearinghouse_portal_ack"
                  required
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I have read and agree to the FMCSA Clearinghouse Consent and
                  Applicant Certification.
                </span>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold">
                    Typed Full Name / Signature
                  </label>
                  <input
                    name="clearinghouse_consent_signature"
                    required
                    type="text"
                    placeholder="Type your full legal name"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold">Consent Date</label>
                  <input
                    name="consent_date"
                    required
                    type="date"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SUBMIT */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white hover:bg-blue-700"
            >
              Submit Complete Application
            </button>

            <a
              href="/application"
              className="rounded-full border border-slate-300 px-8 py-4 text-center text-sm font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
            >
              Back to Quick Application
            </a>
          </div>

          {status && (
            <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              {status}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}