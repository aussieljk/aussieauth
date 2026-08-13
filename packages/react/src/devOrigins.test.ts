import { describe, expect, it } from "vitest";
import { devOrigins, portlessName } from "./devOrigins";

/**
 * The origin that gets registered has to be the origin the browser will send,
 * and the two differ the moment a project sets a port or runs behind portless.
 * When they differ the card renders and then fails on click, which is the
 * failure this module exists to remove.
 */

describe("portlessName", () => {
  it("names the project after the directory for `portless run`", () => {
    expect(portlessName("portless run vite", "jowish")).toBe("jowish");
    expect(portlessName("portless", "jowish")).toBe("jowish");
  });

  it("takes an explicit name when there is one", () => {
    expect(portlessName("portless docs vite", "jowish")).toBe("docs");
  });

  it("is empty when portless isn't in the script", () => {
    expect(portlessName("vite --port 3000", "jowish")).toBe("");
  });
});

/** The first origin devOrigins picks for a Next project with this dev script. */
const at = (dev: string) => devOrigins({ framework: "next", scripts: { dev }, name: "a" })[0];

describe("devOrigins", () => {
  it("reads the portless URL out of the dev script", () => {
    expect(
      devOrigins({ framework: "vite", scripts: { dev: "portless run vite" }, name: "jowish" }),
    ).toEqual(["https://jowish.localhost", "http://localhost:5173"]);
  });

  it("reads an explicit port, in each of the ways one gets written", () => {
    expect(at("next dev --port 4000")).toBe("http://localhost:4000");
    expect(at("next dev -p 4000")).toBe("http://localhost:4000");
    expect(at("PORT=4000 next dev")).toBe("http://localhost:4000");
  });

  it("falls back to the framework default rather than nothing", () => {
    expect(devOrigins({ framework: "vite", scripts: {}, name: "a" })).toEqual([
      "http://localhost:5173",
    ]);
  });

  it("uses an explicit --origin alone, because it was asked for", () => {
    expect(
      devOrigins({
        framework: "vite",
        scripts: { dev: "portless run vite" },
        name: "a",
        explicit: ["https://staging.myapp.com"],
      }),
    ).toEqual(["https://staging.myapp.com"]);
  });

  it("registers a scheme rather than an origin for Expo", () => {
    // Native apps carry a LAN address that changes with the network, so the
    // caller registers the deep-link scheme instead.
    expect(devOrigins({ framework: "expo", scripts: { dev: "expo start" }, name: "a" })).toEqual(
      [],
    );
  });

  it("never repeats an origin, whichever way it was found twice", () => {
    const found = devOrigins({
      framework: "vite",
      scripts: { dev: "vite --port 5173" },
      name: "a",
    });
    expect(found).toEqual(["http://localhost:5173"]);
  });
});
