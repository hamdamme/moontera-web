export default function ServicesPage() {
  const services = [
    {
      title: "Truckload Freight",
      text: "Reliable full truckload transportation across regional and nationwide routes with professional dispatch coordination.",
    },
    {
      title: "Dedicated Routes",
      text: "Consistent route solutions for businesses requiring dependable recurring transportation support.",
    },
    {
      title: "Dispatch & Logistics",
      text: "24/7 communication, scheduling, and operational coordination for efficient freight movement.",
    },
    {
      title: "Premium Delivery",
      text: "Careful handling and scheduled delivery support for shipments requiring additional attention and service.",
    },
  ];

  return (
    <main className="bg-white text-slate-950">
      {/* HERO */}
      <section className="bg-slate-950 px-6 py-24 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            Services
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Transportation solutions built for modern logistics operations.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            We provide reliable freight transportation, dispatch coordination,
            and dedicated logistics support focused on communication, safety,
            and on-time service.
          </p>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-6 h-14 w-14 rounded-2xl bg-blue-600" />

              <h2 className="text-2xl font-bold tracking-tight">
                {service.title}
              </h2>

              <p className="mt-5 text-base leading-8 text-slate-600">
                {service.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY SECTION */}
      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
              Why Businesses Choose Us
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
              Dependable logistics support backed by communication and safety.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              "Professional dispatch coordination",
              "Safety-focused transportation operations",
              "Consistent communication and updates",
              "Flexible freight solutions for business needs",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-6 font-medium text-slate-800 shadow-sm"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}