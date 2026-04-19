/**
 * Global setup: intercept all Resend API calls so tests that run with
 * RESEND_API_KEY set don't make real network requests.
 */
const origFetch = globalThis.fetch;
globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = typeof input === "string" ? input : (input as Request).url;
  if (url.startsWith("https://api.resend.com/")) {
    return Promise.resolve(
      new Response(JSON.stringify({ id: "re_mocked" }), { status: 200 }),
    );
  }
  return origFetch(input as Parameters<typeof fetch>[0], init);
}) as typeof fetch;
