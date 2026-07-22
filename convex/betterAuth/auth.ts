import { createAuth } from "../auth";

// Static instance for Better Auth schema generation only — importing this at
// runtime would fail, since env vars aren't available in the component.
export const auth = createAuth({} as never);
