import Link from "next/link";

export default function ApplicationSuccessPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="px-6 py-32 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 text-6xl">✅</div>

          <h1 className="text-5xl font-bold tracking-tight">
            Application Submitted
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Thank you for your application.
            Our team has received your information and will review it shortly.
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            If your qualifications match our current opportunities,
            a representative from Moontera LLC may contact you.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-full bg-blue-600 px-8 py-4 text-white font-bold hover:bg-blue-700"
            >
              Return Home
            </Link>

            <Link
              href="/drivers"
              className="rounded-full border border-slate-300 px-8 py-4 font-bold hover:border-blue-600 hover:text-blue-600"
            >
              Driver Opportunities
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}