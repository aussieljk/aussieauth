import { defineApp } from "convex/server";
// Local install of the Better Auth component — we own the schema so we can use
// plugins that add tables (passkey, api keys, wallet addresses).
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
