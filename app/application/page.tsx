"use client";

import Link from "next/link";
import { useState } from "react";

export default function ApplicationPage() {
  const [status, setStatus] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    };

    localStorage.setItem("moontera_application_general", JSON.stringify(data));

    const response = await fetch("/api/application/quick", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      setStatus("Quick application submitted successfully.");
      form.reset();
    } else {
      setStatus("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 px-6 py-28 text-white lg:px-10">
        <div className="absolute inset-0 bg-[url('/images/truck-hero.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
            Driver Application
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Start Your Application
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Submit a quick application now, or complete the full driver
            qualification form if you are ready to provide CDL, medical card,
            and consent details.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl"
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
            Quick Application
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            General Information
          </h2>

          <div className="mt-8 grid gap-5">
            <div>
              <label className="text-sm font-bold">Full Name</label>
              <input
                name="full_name"
                required
                type="text"
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
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Phone</label>
                <input
                  name="phone"
                  required
                  type="tel"
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
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <button
                type="submit"
                className="rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                Submit Quick Application
              </button>

              <Link
                href="/application/details"
                className="rounded-full border border-slate-300 px-8 py-4 text-center text-sm font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
              >
                Complete Full Application
              </Link>
            </div>

            {status && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                {status}
              </p>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}