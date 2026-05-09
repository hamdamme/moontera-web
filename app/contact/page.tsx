"use client";

import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const form = event.currentTarget;

  setStatus("Sending...");

  const formData = new FormData(form);

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      inquiryType: formData.get("inquiryType"),
      message: formData.get("message"),
    };

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      setStatus("Message sent successfully.");
      form.reset();
    } else {
      setStatus("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="bg-white text-slate-950">
      <section className="bg-slate-950 px-6 py-24 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            Contact
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Let’s discuss your freight and transportation needs.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Contact Moontera LLC for freight quotes, dispatch, driver
            opportunities, or general business inquiries.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
              Get In Touch
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight">
              Reliable communication from the first message.
            </h2>

            <div className="mt-10 grid gap-5">
              <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="font-bold">Website</p>
                <p className="mt-2 text-slate-600">www.moonterallc.com</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="font-bold">Phone</p>
                <p className="mt-2 text-slate-600">773-882-5595</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="font-bold">General Email</p>
                <p className="mt-2 text-slate-600">info@moonterallc.com</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="font-bold">Dispatch</p>
                <p className="mt-2 text-slate-600">
                  dispatch@moonterallc.com
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="font-bold">Quotes</p>
                <p className="mt-2 text-slate-600">quote@moonterallc.com</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="font-bold">Telegram</p>
                <p className="mt-2 text-slate-600">@moontera_llc</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm"
          >
            <div className="grid gap-5">
              <div>
                <label className="text-sm font-semibold">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="Your phone number"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Inquiry Type</label>
                <select
                  name="inquiryType"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
                >
                  <option>Freight Quote</option>
                  <option>Dispatch Support</option>
                  <option>Driver Application</option>
                  <option>Accounting</option>
                  <option>General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Message</label>
                <textarea
                  name="message"
                  required
                  placeholder="Tell us what you need..."
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Send Message
              </button>

              {status && <p className="text-sm font-medium text-slate-600">{status}</p>}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}