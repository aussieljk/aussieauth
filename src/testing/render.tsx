import type { ReactElement } from "react";
import { render } from "vitest-browser-react";
import { Preview } from "../uaight.preview";

/**
 * Renders through the same providers uaight wraps fixtures in, so a test and
 * the explorer are looking at the same component in the same state.
 */
export const renderFixture = (fixture: ReactElement) => render(<Preview>{fixture}</Preview>);
