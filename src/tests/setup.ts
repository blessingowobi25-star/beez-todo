import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Every test starts from a clean DOM and clean storage so persistence cannot leak between cases.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
