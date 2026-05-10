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
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950 px-6 py-28 text-white lg:px-10">
        <div className="absolute inset-0 bg-[url('/images/warehouse.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
            Contact Moontera
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Let’s discuss your freight, dispatch, or driver inquiry.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Reach Moontera LLC for freight quotes, dispatch support, driver
            opportunities, accounting questions, or general business inquiries.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          {/* CONTACT INFO */}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Get In Touch
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Clear communication from the first message.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Choose the right contact channel below so your message reaches the
              correct department faster.
            </p>

            <div className="mt-10 grid gap-5">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-bold text-slate-950">Phone</p>
                <a
                  href="tel:7738825595"
                  className="mt-2 block text-slate-600 hover:text-blue-600"
                >
                  773-882-5595
                </a>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-bold text-slate-950">General Email</p>
                <a
                  href="mailto:info@moonterallc.com"
                  className="mt-2 block text-slate-600 hover:text-blue-600"
                >
                  info@moonterallc.com
                </a>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="font-bold text-slate-950">Quotes</p>
                  <a
                    href="mailto:quote@moonterallc.com"
                    className="mt-2 block text-slate-600 hover:text-blue-600"
                  >
                    quote@moonterallc.com
                  </a>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="font-bold text-slate-950">Dispatch</p>
                  <a
                    href="mailto:dispatch@moonterallc.com"
                    className="mt-2 block text-slate-600 hover:text-blue-600"
                  >
                    dispatch@moonterallc.com
                  </a>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="font-bold text-slate-950">Accounting</p>
                  <a
                    href="mailto:accounting@moonterallc.com"
                    className="mt-2 block text-slate-600 hover:text-blue-600"
                  >
                    accounting@moonterallc.com
                  </a>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="font-bold text-slate-950">Telegram</p>
                  <a
                    href="https://t.me/moontera_llc"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-slate-600 hover:text-blue-600"
                  >
                    @moontera_llc
                  </a>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-bold text-slate-950">Business Messaging</p>
                <p className="mt-2 text-slate-600">
                  Business WhatsApp available for quick communication.
                </p>
              </div>
            </div>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl"
          >
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Send Message
            </p>

            <h3 className="mt-3 text-3xl font-bold tracking-tight">
              Request information
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              For freight quotes, include pickup location, delivery location,
              equipment type, and timing if available.
            </p>

            <div className="mt-8 grid gap-5">
              <div>
                <label className="text-sm font-bold">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="Your phone number"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Inquiry Type</label>
                <select
                  name="inquiryType"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option>Freight Quote</option>
                  <option>Dispatch Support</option>
                  <option>Driver Application</option>
                  <option>Accounting</option>
                  <option>General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold">Message</label>
                <textarea
                  name="message"
                  required
                  placeholder="Tell us what you need..."
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Send Message
              </button>

              {status && (
                <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  {status}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}