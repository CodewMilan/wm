/**
 * Both Reactor models take commands over a WebRTC data channel and answer
 * asynchronously: `sendCommand` resolves as soon as the bytes are queued, and
 * whether the model *accepted* the command arrives later as a separate `state`
 * or `command_error` message.
 *
 * That makes `await setPrompt(...); await start()` a lie — it reads like
 * sequencing but guarantees nothing, and `start` is rejected outright if its
 * preconditions have not landed yet. So preconditions have to be confirmed
 * against the model's own reported state before the next command goes out.
 */

/** How often to re-check the latest state snapshot. */
const POLL_MS = 60;

export class HandshakeTimeout extends Error {
  constructor(what: string, timeoutMs: number) {
    super(`The model never confirmed ${what} within ${(timeoutMs / 1000).toFixed(1)}s`);
    this.name = "HandshakeTimeout";
  }
}

/**
 * Wait until the model's reported state satisfies `ready`.
 *
 * `read` is a getter rather than a value because it is polled: reading a React
 * state variable captured in a closure would pin us to the snapshot that
 * existed when the await started, which is exactly the one we know is stale.
 */
export async function waitForState<T>(
  read: () => T | null | undefined,
  ready: (state: T) => boolean,
  options: { what: string; timeoutMs: number; signal?: AbortSignal },
): Promise<T> {
  const deadline = Date.now() + options.timeoutMs;

  for (;;) {
    const state = read();
    if (state && ready(state)) return state;

    if (options.signal?.aborted) throw new Error(`Cancelled while waiting for ${options.what}`);
    if (Date.now() >= deadline) throw new HandshakeTimeout(options.what, options.timeoutMs);

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

/**
 * Send something, then wait for the model to admit it arrived — retrying once if
 * it didn't. A single retry is worth it because the failure being guarded
 * against is a command that was dropped rather than rejected, and re-sending a
 * prompt or an image is idempotent.
 */
export async function confirmCommand<T>(
  send: () => Promise<void>,
  read: () => T | null | undefined,
  ready: (state: T) => boolean,
  options: { what: string; timeoutMs: number; signal?: AbortSignal },
): Promise<void> {
  await send();

  try {
    await waitForState(read, ready, options);
  } catch (error) {
    if (!(error instanceof HandshakeTimeout)) throw error;

    await send();
    await waitForState(read, ready, { ...options, what: `${options.what} (after a retry)` });
  }
}
