import Link from "next/link";

export default function HomePage() {
  const services = [
    {
      title: "Truckload Freight",
      text: "Reliable transportation for regional and nationwide freight movement.",
    },
    {
      title: "Dedicated Routes",
      text: "Consistent route support for recurring business shipping needs.",
    },
    {
      title: "Dispatch Support",
      text: "Clear communication and coordination from pickup to delivery.",
    },
    {
      title: "Premium Delivery",
      text: "Careful handling for shipments requiring extra attention.",
    },
  ];

  return (
    <main className="bg-white text-slate-950">
      {/* HERO */}
      <section className="relative min-h-[92vh] overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[url('/images/truck-hero.jpg')] bg-cover bg-center opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/20" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl items-center px-6 lg:px-10">
          <div className="max-w-4xl">
            <p className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              Moontera LLC • Freight & Logistics
            </p>

            <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl">
              Reliable Freight Solutions Built Around Safety and Communication.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Moontera LLC provides professional trucking and logistics support
              for businesses that need dependable freight movement and clear
              communication.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="rounded-full bg-blue-600 px-8 py-4 text-center text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Request a Quote
              </Link>

              <Link
                href="/drivers"
                className="rounded-full border border-white/30 px-8 py-4 text-center text-sm font-bold text-white transition hover:bg-white hover:text-slate-950"
              >
                Apply as Driver
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4 lg:px-10">
          {[
            ["2024", "Established"],
            ["2025", "Trucking Operations"],
            ["24/7", "Dispatch Support"],
            ["U.S.", "Freight Coverage"],
          ].map(([number, label]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-6">
              <p className="text-3xl font-bold text-slate-950">{number}</p>
              <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Services
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Logistics support for real business operations.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              We keep the process simple: safe pickup, clear updates, and
              dependable delivery.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-6 h-12 w-12 rounded-2xl bg-blue-600" />
                <h3 className="text-xl font-bold">{service.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {service.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAGE SECTION */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              Operations
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Professional freight handling from pickup to delivery.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Our focus is communication, reliability, and safe transportation
              support for every shipment.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                "Clear dispatch communication",
                "Safety-focused drivers",
                "Professional customer support",
                "Flexible freight coordination",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white p-5 font-semibold shadow-sm"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="h-72 rounded-[2rem] bg-[url('/images/loading.jpg')] bg-cover bg-center shadow-xl" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="h-48 rounded-[2rem] bg-[url('/images/unloading.jpg')] bg-cover bg-center shadow-lg" />
              <div className="h-48 rounded-[2rem] bg-[url('/images/warehouse.jpg')] bg-cover bg-center shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* DRIVER CTA */}
      <section className="bg-slate-950 px-6 py-24 text-white lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
              Drivers
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Drive with a company that values support and communication.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              We work with professional drivers who care about safety,
              consistency, and dependable service.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8">
            <div className="grid gap-4">
              {[
                "Competitive opportunities",
                "Dispatch support",
                "Consistent communication",
                "Professional operations",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-5">
                  {item}
                </div>
              ))}
            </div>

            <Link
              href="/drivers"
              className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white hover:bg-blue-700"
            >
              Apply as Driver
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-blue-600 px-8 py-16 text-center text-white shadow-xl">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Ready to move your freight?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Contact Moontera LLC for quotes, dispatch, and transportation
            support.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="rounded-full bg-white px-8 py-4 text-sm font-bold text-blue-700"
            >
              Request a Quote
            </Link>

            <a
              href="tel:7738825595"
              className="rounded-full border border-white/40 px-8 py-4 text-sm font-bold text-white"
            >
              Call 773-882-5595
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}