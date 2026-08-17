// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import './src/i18n/i18n';
import { server } from "./src/tests/msw/server";
import { afterAll, afterEach, beforeAll } from 'vitest';

// jsdom doesn't implement scrollIntoView at all (real browsers always do).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => server.resetHandlers());

afterAll(() => server.close());

