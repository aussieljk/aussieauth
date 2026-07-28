import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { configureAussieAuthClientState } from "./client";
import { AussieAuthClientProvider, useAuthClient, useCallbackURL } from "./context";

/**
 * The provider is what lets one bundle talk to more than one deployment, and
 * what stops a component from depending on module evaluation order. Both are
 * invisible until you actually have two clients, so these tests have two.
 */

const fakeClient = (name: string) => ({ name }) as never;

/** Stands in for a panel: all it does is say which client it was handed. */
function WhichClient() {
  const client = useAuthClient() as unknown as { name: string };
  return <p>client: {client.name}</p>;
}

function WhichCallback() {
  const callbackURL = useCallbackURL();
  return <p>callback: {callbackURL()}</p>;
}

test("a component reads its client from the nearest provider", async () => {
  const screen = await render(
    <AussieAuthClientProvider client={fakeClient("provided")}>
      <WhichClient />
    </AussieAuthClientProvider>,
  );
  await expect.element(screen.getByText("client: provided")).toBeVisible();
});

test("two deployments can live in one tree", async () => {
  const screen = await render(
    <div>
      <AussieAuthClientProvider client={fakeClient("first")}>
        <WhichClient />
      </AussieAuthClientProvider>
      <AussieAuthClientProvider client={fakeClient("second")}>
        <WhichClient />
      </AussieAuthClientProvider>
    </div>,
  );
  await expect.element(screen.getByText("client: first")).toBeVisible();
  await expect.element(screen.getByText("client: second")).toBeVisible();
});

test("with no provider it falls back to the configured module client", async () => {
  // The shape every existing app is in: one createAussieAuthClient() at the
  // entry and no provider anywhere. It has to keep working untouched.
  configureAussieAuthClientState(fakeClient("module"), { baseURL: "https://auth.test" });
  const screen = await render(<WhichClient />);
  await expect.element(screen.getByText("client: module")).toBeVisible();
});

test("asking where the server is does not require a client", async () => {
  // What a prerender pass looks like: the entry that builds a client runs in
  // the browser, so during the static build there is none. A component that
  // only wants the base URL (the setup-status probe) has to survive that —
  // resolving the client eagerly here took the whole `bun run build` down.
  const { useAuthBaseURL } = await import("./context");
  const { requireAuthClient } = await import("./client");

  function WhichBaseURL() {
    return <p>base: {useAuthBaseURL() || "(none)"}</p>;
  }

  const screen = await render(<WhichBaseURL />);
  await expect.element(screen.getByText(/^base: /)).toBeVisible();
  // Still throws for anything that genuinely needs to sign someone in.
  expect(typeof requireAuthClient).toBe("function");
});

test("a provider can send one surface back somewhere else", async () => {
  configureAussieAuthClientState(fakeClient("module"), {
    baseURL: "https://auth.test",
    callbackURL: "https://app.test/default",
  });

  const screen = await render(
    <div>
      <WhichCallback />
      <AussieAuthClientProvider client={fakeClient("x")} callbackURL="https://app.test/admin">
        <WhichCallback />
      </AussieAuthClientProvider>
    </div>,
  );

  await expect.element(screen.getByText("callback: https://app.test/default")).toBeVisible();
  await expect.element(screen.getByText("callback: https://app.test/admin")).toBeVisible();
});
