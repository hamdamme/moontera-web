import Link from "next/link";

export default function DriversPage() {
  const benefits = [
    "Competitive pay and consistent miles",
    "Professional dispatch support",
    "Reliable and maintained equipment",
    "24/7 operational communication",
    "Flexible route opportunities",
    "Respect-driven company culture",
  ];

  const requirements = [
    "Valid CDL License",
    "Clean driving record",
    "Professional communication",
    "Commitment to safety",
  ];

  return (
    <main className="bg-white text-slate-950">
      {/* HERO */}
      <section className="bg-slate-950 px-6 py-24 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            Driver Opportunities
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Drive with a company that values professionalism and support.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Join a growing transportation team focused on communication,
            consistency, and dependable freight operations across the United
            States.
          </p>

          <Link
            href="/contact"
            className="mt-10 inline-flex rounded-full bg-blue-600 px-8 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Apply Now
          </Link>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
              Why Drivers Choose Us
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight">
              Professional support from dispatch to delivery.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5 h-12 w-12 rounded-2xl bg-blue-600" />

                <p className="text-lg font-semibold leading-7 text-slate-900">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUIREMENTS */}
      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
              Driver Requirements
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
              Built for dependable and safety-focused drivers.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              We are looking for professional drivers committed to safe
              operations, communication, and reliable service.
            </p>
          </div>

          <div className="grid gap-5">
            {requirements.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-lg font-medium shadow-sm"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-blue-600 px-8 py-16 text-center text-white">
          <h2 className="text-4xl font-bold tracking-tight">
            Ready to join our team?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Start your application today and become part of a professional
            transportation operation focused on consistency and growth.
          </p>

          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-sm font-semibold text-blue-700"
          >
            Start Application
          </Link>
        </div>
      </section>
    </main>
  );
}