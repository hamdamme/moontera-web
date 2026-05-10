import Link from "next/link";

export default function DriversPage() {
  const benefits = [
    "Competitive opportunities",
    "Consistent communication",
    "Professional dispatch support",
    "Safety-focused operations",
    "Respectful company culture",
    "Growing transportation team",
  ];

  const requirements = [
    "Valid CDL license",
    "Professional driving attitude",
    "Commitment to safety",
    "Clear communication with dispatch",
    "Reliable pickup and delivery performance",
  ];

  return (
    <main className="bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 px-6 py-28 text-white lg:px-10">
        <div className="absolute inset-0 bg-[url('/images/truck-hero.jpg')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
            Driver Opportunities
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Drive with a company built on communication, respect, and support.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Moontera LLC works with professional drivers who value safety,
            consistency, and dependable freight operations.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/application"
              className="rounded-full bg-blue-600 px-8 py-4 text-center text-sm font-bold text-white hover:bg-blue-700"
            >
              Quick Apply
            </Link>

            <Link
              href="/application/details"
              className="rounded-full border border-white/30 px-8 py-4 text-center text-sm font-bold text-white hover:bg-white hover:text-slate-950"
            >
              Full Application
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Why Drive With Us
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              A professional environment for serious drivers.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              We focus on simple communication, dependable coordination, and
              respect for the people who keep freight moving.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item) => (
              <div
                key={item}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5 h-12 w-12 rounded-2xl bg-blue-600" />
                <p className="text-lg font-bold leading-7 text-slate-900">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Driver Requirements
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              We look for dependable, safety-focused professionals.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Drivers are expected to communicate clearly, operate safely, and
              represent Moontera LLC with professionalism.
            </p>
          </div>

          <div className="grid gap-4">
            {requirements.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-6 font-semibold shadow-sm"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-24 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
              Application Options
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Choose the application that fits your situation.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8">
              <p className="text-sm font-bold text-blue-400">
                Quick Application
              </p>
              <h3 className="mt-4 text-2xl font-bold">
                Submit basic information
              </h3>
              <p className="mt-4 leading-7 text-slate-300">
                Use this option if you want Moontera LLC to contact you first
                before completing detailed driver qualification information.
              </p>

              <Link
                href="/application"
                className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                Quick Apply
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8">
              <p className="text-sm font-bold text-blue-400">
                Full Application
              </p>
              <h3 className="mt-4 text-2xl font-bold">
                Complete driver qualification details
              </h3>
              <p className="mt-4 leading-7 text-slate-300">
                Use this option if you are ready to provide CDL, medical card,
                DOT testing, and Clearinghouse consent information.
              </p>

              <Link
                href="/application/details"
                className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-950 hover:bg-slate-200"
              >
                Full Application
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}