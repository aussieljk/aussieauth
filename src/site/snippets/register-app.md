```ts
await fetch(`${AUSSIEAUTH_URL}/apps/register`, {
  method: "POST",
  headers: { authorization: `Bearer ${SECRET}` },
  body: JSON.stringify({
    slug: "portfolio",
    name: "Portfolio",
    origins: ["https://portfolio.com"],
    methods: ["google", "passkey"],
  }),
});
```
