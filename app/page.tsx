import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950">
      {/* HERO */}
      <section className="relative min-h-[90vh] overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('/images/truck-hero.jpg')] bg-cover bg-center opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />

        <div className="relative mx-auto flex min-h-[90vh] max-w-7xl items-center px-6 lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
              Freight • Logistics • Dedicated Service
            </p>

            <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl">
              Reliable Freight & Logistics Solutions Across the U.S.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Professional transportation solutions built around safety,
              communication, and dependable delivery for every load.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="rounded-full bg-blue-600 px-8 py-4 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request a Quote
              </Link>

              <Link
                href="/drivers"
                className="rounded-full border border-white/30 px-8 py-4 text-center text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
              >
                Apply as Driver
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4 lg:px-10">
          {[
            ["24/7", "Dispatch Support"],
            ["98%", "On-Time Focus"],
            ["U.S.", "Coverage"],
            ["Safety", "First Operations"],
          ].map(([number, label]) => (
            <div key={label}>
              <p className="text-3xl font-bold text-slate-950">{number}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              What We Do
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Transportation services built for real business needs.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Truckload Freight",
                text: "Reliable freight movement for regional and nationwide routes.",
              },
              {
                title: "Dedicated Routes",
                text: "Consistent transportation support for recurring shipping needs.",
              },
              {
                title: "Dispatch & Logistics",
                text: "Clear communication, scheduling, and load coordination.",
              },
              {
                title: "Premium Delivery",
                text: "Careful handling for shipments that require extra attention.",
              },
            ].map((service) => (
              <div
                key={service.title}
                className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-6 h-12 w-12 rounded-2xl bg-blue-600" />
                <h3 className="text-xl font-bold text-slate-950">
                  {service.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {service.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Why Choose Us
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              A logistics partner that keeps communication simple.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              We focus on what matters most: safe drivers, dependable equipment,
              fast communication, and professional service from pickup to
              delivery.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "Professional driver and dispatch support",
              "Clear updates from pickup to delivery",
              "Flexible solutions for different freight needs",
              "Safety-focused transportation operations",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 font-medium shadow-sm"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DRIVER SECTION */}
      <section className="bg-slate-950 px-6 py-24 text-white lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Drive With Us
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Built for serious drivers who want steady support.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Join a team that values communication, respect, consistent work,
              and professional dispatch support.
            </p>

            <Link
              href="/drivers"
              className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Apply Now
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {["Competitive Pay", "Consistent Miles", "Reliable Equipment", "24/7 Dispatch"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/10 p-6"
                >
                  <p className="text-lg font-bold">{item}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-blue-600 px-8 py-16 text-center text-white">
          <h2 className="text-4xl font-bold tracking-tight">
            Ready to move your freight?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-blue-100">
            Let’s discuss your transportation needs and build a dependable
            logistics solution.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-blue-700"
            >
              Request a Quote
            </Link>
            <Link
              href="/drivers"
              className="rounded-full border border-white/40 px-8 py-4 text-sm font-semibold text-white"
            >
              Apply as Driver
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}