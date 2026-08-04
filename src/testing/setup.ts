// The app's stylesheet, which uaight loads through its preview entry. Some
// assertions are about layout, so the tests need it too.
import "../index.css";
// Configures the package's `authClient` live binding, exactly as the app's entry
// does. Components import `authClient` from `@aussieljk/auth` directly, so
// without this it's still `undefined` when they mount.
import "../lib/auth";
