/**
 * Test setup file for Vitest with happy-dom
 * This file is run before all tests
 */

import '@testing-library/jest-dom';

// Add any global test setup here
// For example, custom matchers, global mocks, etc.

// Polyfill for TextEncoder/TextDecoder if needed
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
