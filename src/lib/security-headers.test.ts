import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECURITY_HEADERS } from './security-headers.ts';

// M7 (PROJECT_REVIEW): the dashboard sent no security headers, so any site
// could load it inside a hidden frame and trick an admin into clicking
// (clickjacking). These go on every page.
test('the dashboard can never be shown inside another site', () => {
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /frame-ancestors 'none'/);
});

test('the basic hardening headers are set', () => {
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(SECURITY_HEADERS['Referrer-Policy'], 'same-origin');
});
