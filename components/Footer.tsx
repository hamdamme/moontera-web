import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 px-6 py-10 text-white lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 border-t border-white/10 pt-8 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-bold">Moontera LLC</h3>
          <p className="mt-3 text-sm text-slate-400">
            Established 2024 • Trucking operations since 2025
          </p>
        </div>

        <div className="text-sm text-slate-400">
          <p>Buffalo Grove, IL</p>
          <p>Phone: 773-882-5595</p>
          <p>Telegram: @moontera_llc</p>
        </div>

        <div className="text-sm text-slate-400">
          <p>info@moonterallc.com</p>
          <p>dispatch@moonterallc.com</p>
          <p>quote@moonterallc.com</p>
          <p>accounting@moonterallc.com</p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl text-sm text-slate-500">
        © {new Date().getFullYear()} Moontera LLC. All rights reserved.
      </div>
    </footer>
  );
}