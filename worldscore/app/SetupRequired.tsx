const DASHBOARD_URL = "https://www.reactor.inc/dashboard/account?section=api-keys";

// Shown when REACTOR_API_KEY is missing. Pure markup so it stays a server
// component — there is nothing to hydrate on a configuration screen.
export function SetupRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/70 p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-500">
          Worldscore
        </p>
        <h1 className="mt-4 text-xl font-light text-zinc-100">Setup required</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Worldscore mints short-lived Reactor session tokens on the server, so it
          needs an API key. This is a one-time step.
        </p>

        <ol className="mt-6 space-y-4 text-sm text-zinc-300">
          <Step n={1}>
            Create a key in the{" "}
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="text-brand underline underline-offset-4"
            >
              Reactor dashboard
            </a>
            . It starts with <code className="font-mono text-zinc-400">rk_</code>.
          </Step>
          <Step n={2}>
            Add it to <code className="font-mono text-zinc-400">.env.local</code>:
            <pre className="mt-2 overflow-x-auto rounded-md border border-zinc-800 bg-black p-3 font-mono text-[11px] text-zinc-400">
              REACTOR_API_KEY=rk_your_key_here
            </pre>
          </Step>
          <Step n={3}>Restart the dev server.</Step>
        </ol>

        <p className="mt-6 border-t border-zinc-800 pt-4 font-mono text-[11px] leading-relaxed text-zinc-600">
          Optional: set LLM_API_KEY, LLM_BASE_URL and LLM_MODEL for AI-written
          directions. Without them Worldscore uses its offline concept library.
        </p>
      </div>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 font-mono text-[11px] text-zinc-500">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
