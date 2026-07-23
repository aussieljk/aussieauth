import type { ReactElement } from "react";
import { render } from "vitest-browser-react";
import Decorator from "../cosmos.decorator";

/**
 * Renders through the same decorator the Cosmos UI wraps fixtures in, so a test
 * and the workbench are looking at the same component in the same providers.
 */
export const renderFixture = (fixture: ReactElement) =>
  render(<Decorator>{fixture}</Decorator>);
