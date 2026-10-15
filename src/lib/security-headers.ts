/**
 * Sent on every dashboard page (PROJECT_REVIEW M7).
 *
 * The important one is frame-ancestors / X-Frame-Options: without them any
 * site could load the dashboard in a hidden frame and trick a signed-in admin
 * into clicking (clickjacking). A full script CSP is left out on purpose: the
 * Next runtime and the TinyMCE editor need inline scripts, and a policy that
 * breaks the editor would only get switched off.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};
