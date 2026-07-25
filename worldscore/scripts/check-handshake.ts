// Exercises the arming handshake against a fake model, so the retry and timeout
// paths are verified without burning a real GPU session.
//
//   npx tsx scripts/check-handshake.ts

import { confirmCommand, HandshakeTimeout, waitForState } from "../app/lib/world/handshake";

interface FakeState {
  has_prompt: boolean;
  has_image: boolean;
  started: boolean;
}

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

/**
 * Stands in for the model: commands are fire-and-forget, and state only flips
 * after a delay — which is the whole reason the handshake exists.
 */
function fakeModel(options: { applyAfterMs: number; dropFirst?: boolean }) {
  const state: FakeState = { has_prompt: false, has_image: false, started: false };
  let sends = 0;

  const setPrompt = async () => {
    sends++;
    const dropped = options.dropFirst && sends === 1;
    if (dropped) return;
    setTimeout(() => {
      state.has_prompt = true;
    }, options.applyAfterMs);
  };

  return { state, setPrompt, sends: () => sends };
}

async function main() {
  console.log("\nhandshake waits for confirmation");
  {
    const model = fakeModel({ applyAfterMs: 300 });
    const began = Date.now();
    await confirmCommand(
      model.setPrompt,
      () => model.state,
      (s) => s.has_prompt,
      { what: "the prompt", timeoutMs: 3000 },
    );
    const took = Date.now() - began;
    check("resolves only once the model confirms", model.state.has_prompt, `${took}ms`);
    check("did not wait needlessly long", took < 1000, `${took}ms`);
    check("sent the command once", model.sends() === 1, `${model.sends()} send(s)`);
  }

  console.log("\nhandshake retries a dropped command");
  {
    // The first send vanishes, which is exactly the failure that produced
    // "No prompt set. Call set_prompt first." in the first place.
    const model = fakeModel({ applyAfterMs: 200, dropFirst: true });
    await confirmCommand(
      model.setPrompt,
      () => model.state,
      (s) => s.has_prompt,
      { what: "the prompt", timeoutMs: 700 },
    );
    check("recovers after the retry", model.state.has_prompt, "confirmed");
    check("sent the command twice", model.sends() === 2, `${model.sends()} send(s)`);
  }

  console.log("\nhandshake gives up with a useful message");
  {
    const state: FakeState = { has_prompt: false, has_image: false, started: false };
    let error: Error | null = null;
    try {
      await waitForState(
        () => state,
        (s) => s.has_prompt,
        { what: "the prompt", timeoutMs: 300 },
      );
    } catch (e) {
      error = e as Error;
    }
    check("throws on timeout", error instanceof HandshakeTimeout, error?.name ?? "no error");
    check(
      "the message names what was missing",
      (error?.message ?? "").includes("the prompt"),
      error?.message ?? "",
    );
  }

  console.log("\nhandshake gives up after a failed retry too");
  {
    const model = fakeModel({ applyAfterMs: 999_999 });
    let error: Error | null = null;
    try {
      await confirmCommand(
        model.setPrompt,
        () => model.state,
        (s) => s.has_prompt,
        { what: "the prompt", timeoutMs: 200 },
      );
    } catch (e) {
      error = e as Error;
    }
    check("still throws when the retry fails", error instanceof HandshakeTimeout, error?.name ?? "");
    check("retried exactly once", model.sends() === 2, `${model.sends()} send(s)`);
    check(
      "says it already retried",
      (error?.message ?? "").includes("retry"),
      error?.message ?? "",
    );
  }

  console.log("\nhandshake respects an already-satisfied state");
  {
    const state: FakeState = { has_prompt: true, has_image: true, started: true };
    const began = Date.now();
    await waitForState(() => state, (s) => s.started, { what: "generation", timeoutMs: 1000 });
    check("returns immediately when already true", Date.now() - began < 60, `${Date.now() - began}ms`);
  }

  console.log(`\n${failures === 0 ? "all handshake checks passed" : `${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
