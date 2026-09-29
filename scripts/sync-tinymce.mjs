#!/usr/bin/env node
/**
 * Copy TinyMCE's assets into public/ so the editor is served from our own origin.
 *
 * TinyMCE loads its skins, icon packs and plugins at runtime rather than
 * bundling them. The alternative is TinyMCE Cloud, which needs an account, an
 * API key and a request to their CDN on every admin page load — three
 * dependencies for a text box.
 *
 * Version 6 is used deliberately: it is MIT. TinyMCE 7 and later are
 * GPL-2.0-or-later unless you buy a commercial licence, and GPL is the wrong
 * licence to pull into a proprietary dashboard.
 *
 * Runs before dev and build. The copy is gitignored — it is build output.
 */
import { createRequire } from 'node:module';
import { cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const to = join(here, '..', 'public', 'tinymce');

// Resolved rather than assumed: this is a workspace, so npm hoists the package
// to the repo root and a hard-coded ./node_modules/tinymce is not there.
let from;
try {
  const require = createRequire(import.meta.url);
  from = dirname(require.resolve('tinymce/package.json'));
} catch {
  console.error('tinymce is not installed — run npm install first');
  process.exit(1);
}

// Replaced wholesale rather than merged, so an upgrade cannot leave a stale
// skin file behind that only breaks on somebody else's machine.
await rm(to, { recursive: true, force: true });
await cp(from, to, { recursive: true });
console.log('tinymce assets copied to public/tinymce');
