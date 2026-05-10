import Link from "next/link";

export default function ServicesPage() {
  const services = [
    {
      title: "Truckload Freight",
      text: "Reliable freight transportation for regional and nationwide routes with clear pickup and delivery coordination.",
    },
    {
      title: "Dedicated Routes",
      text: "Consistent transportation support for businesses with recurring shipping needs and scheduled freight movement.",
    },
    {
      title: "Dispatch & Logistics",
      text: "Professional communication, scheduling, load updates, and operational coordination from start to finish.",
    },
    {
      title: "Premium Delivery",
      text: "Careful handling for shipments that require extra attention, scheduled coordination, and professional service.",
    },
  ];

  return (
    <main className="bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 px-6 py-28 text-white lg:px-10">
        <div className="absolute inset-0 bg-[url('/images/warehouse.jpg')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-400">
            Services
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
            Freight and logistics support built for dependable business operations.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Moontera LLC supports freight movement with professional dispatch,
            communication, safety-focused operations, and reliable delivery.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
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

      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
              How We Work
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Simple process. Clear communication. Dependable delivery.
            </h2>
          </div>

          <div className="grid gap-4">
            {[
              "Confirm freight details and schedule",
              "Coordinate pickup and dispatch support",
              "Provide clear communication during transit",
              "Complete delivery with professional service",
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="font-bold text-blue-600">Step {index + 1}</p>
                <p className="mt-2 font-semibold text-slate-900">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-blue-600 px-8 py-16 text-center text-white shadow-xl">
          <h2 className="text-4xl font-bold tracking-tight">
            Need freight support?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-blue-100">
            Contact Moontera LLC for quotes, dispatch, and transportation support.
          </p>

          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-sm font-bold text-blue-700"
          >
            Request a Quote
          </Link>
        </div>
      </section>
    </main>
  );
}