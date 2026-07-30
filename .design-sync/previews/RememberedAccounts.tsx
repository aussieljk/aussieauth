import { RememberedAccounts } from "@aussieljk/auth";

// The returning-account chooser: one row per remembered account, click to
// resume. Reads from localStorage, so we seed a couple of accounts here (no
// `cookie`, so it doesn't try to verify a stored session over the network).

if (typeof localStorage !== "undefined") {
  localStorage.setItem(
    "aussieauth.accounts",
    JSON.stringify([
      {
        id: "user_1",
        name: "Lucas Knight",
        email: "lucas@example.com",
        method: "google",
        savedAt: Date.now(),
      },
      {
        id: "user_2",
        name: "",
        email: "reef@example.com",
        method: "email",
        savedAt: Date.now() - 86_400_000,
      },
    ]),
  );
}

export const TwoAccounts = () => (
  <div style={{ maxWidth: 380 }}>
    <RememberedAccounts onNeedsPanel={() => {}} />
  </div>
);
