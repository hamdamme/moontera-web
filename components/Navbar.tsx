import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-950">
          MOONTERA LLC
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <Link href="/services" className="hover:text-blue-600">Services</Link>
          <Link href="/drivers" className="hover:text-blue-600">Drivers</Link>
          <Link href="/contact" className="hover:text-blue-600">Contact</Link>
        </nav>

        <Link
          href="/contact"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Request Quote
        </Link>
      </div>

      <div className="border-t border-slate-200 px-6 py-3 md:hidden">
        <nav className="flex justify-between text-sm font-semibold text-slate-700">
          <Link href="/">Home</Link>
          <Link href="/services">Services</Link>
          <Link href="/drivers">Drivers</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </header>
  );
}