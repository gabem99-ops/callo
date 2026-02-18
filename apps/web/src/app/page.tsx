import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-callo-bg">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Radial glow behind hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-callo-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-callo-border bg-callo-surface/50 backdrop-blur-sm text-sm text-callo-text-secondary mb-8">
            <span className="w-2 h-2 rounded-full bg-callo-success animate-pulse" />
            Now in beta
          </div>
        </div>

        {/* Hero heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-400">
            Callo
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl md:text-3xl font-medium mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-callo-accent to-callo-accent-light">
            AI that answers your phone.
          </span>{" "}
          <span className="text-zinc-400">24/7.</span>
        </p>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-callo-text-secondary max-w-xl mb-10 leading-relaxed">
          Intelligent voice agents that handle calls, book appointments, and
          delight your customers — while you focus on what matters.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/sign-up"
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-callo-accent to-callo-accent-light hover:from-callo-accent-light hover:to-callo-accent transition-all duration-200 shadow-callo-glow hover:shadow-[0_0_30px_rgba(99,102,241,0.25)]"
          >
            Get Started
            <svg
              className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-callo-text-secondary rounded-lg border border-callo-border hover:border-callo-border-light hover:text-white hover:bg-callo-surface/50 transition-all duration-200"
          >
            Dashboard
          </Link>
        </div>
      </main>

      {/* Footer accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-callo-accent/20 to-transparent" />
    </div>
  );
}
