import type { Preview } from "@storybook/react-vite";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Theme } from "frosted-ui";
import { initialize, mswLoader } from "msw-storybook-addon";
import "../src/index.css";
import { PENDING_ACCOUNT_NUMBER } from "../src/lib/storage";

initialize({ onUnhandledRequest: "bypass" });

/**
 * Stories never reach a real deployment, so `useQuery` stays `undefined` —
 * the same pre-settle state the app renders before Convex answers.
 */
const convex = new ConvexReactClient("http://127.0.0.1:9");

const preview: Preview = {
  decorators: [
    (Story) => (
      // The theme `App` mounts, so frosted-ui tokens like `--gray-11` resolve.
      <Theme appearance="light" accentColor="indigo" grayColor="slate">
        <ConvexProvider client={convex}>
          <Story />
        </ConvexProvider>
      </Theme>
    ),
  ],
  loaders: [mswLoader],
  async beforeEach() {
    // The only browser-state key the app reads at render.
    localStorage.removeItem(PENDING_ACCOUNT_NUMBER);
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
