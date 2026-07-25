"use client";

import { LongliveV2Provider } from "@reactor-models/longlive-v2";
import { LingbotWorld2Provider } from "@reactor-models/lingbot-world-2";
import { useWorldscore } from "./lib/store";
import { Upload } from "./components/Upload";
import { Analyzing } from "./components/Analyzing";
import { ConceptBoard } from "./components/ConceptBoard";
import { Player } from "./components/Player";
import { ExplorePlayer } from "./components/ExplorePlayer";

// The SDK calls this on every coordinator hop, not just at connect, so it has
// to stay a resolver. The route sets Cache-Control, so repeat calls are served
// from the browser cache until the token actually expires.
async function fetchToken(): Promise<string> {
  const r = await fetch("/api/reactor/token");
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Token fetch failed: ${r.status}`);
  }
  const { jwt } = (await r.json()) as { jwt: string };
  return jwt;
}

export function WorldscoreApp() {
  const phase = useWorldscore((s) => s.phase);
  const mode = useWorldscore((s) => s.mode);

  /**
   * Exactly one provider is mounted, and only for the mode in play.
   *
   * This matters more than it looks: both model SDKs are built on the same
   * `ReactorContext` from the base SDK, so nesting them does not give you two
   * independent sessions — the inner one shadows the outer, and every hook
   * resolves to it. With both mounted, `useLongliveV2()` in Watch mode was
   * driving the LingBot session, which ignored `set_shot` and then rejected
   * `start` with "No prompt set". Mounting one at a time keeps each player
   * talking to its own model, and still reserves a GPU only when a session
   * actually begins.
   */
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Backdrop />
      {phase === "upload" && <Upload />}
      {phase === "analyzing" && <Analyzing />}
      {phase === "concepts" && <ConceptBoard />}
      {phase === "session" &&
        (mode === "watch" ? (
          <LongliveV2Provider getJwt={fetchToken}>
            <Player />
          </LongliveV2Provider>
        ) : (
          <LingbotWorld2Provider getJwt={fetchToken}>
            <ExplorePlayer />
          </LingbotWorld2Provider>
        ))}
    </main>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#07070a]" />
      <div className="absolute -top-1/3 left-1/2 h-[80vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(90,80,160,0.18),transparent_65%)]" />
      <div className="absolute bottom-0 left-0 h-[50vh] w-[70vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(180,120,60,0.10),transparent_65%)]" />
    </div>
  );
}
