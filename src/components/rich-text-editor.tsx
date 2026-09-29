'use client';

import { useMemo, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The rich-text editor behind every CMS body.
 *
 * TinyMCE 6, self-hosted from `public/tinymce`. Three deliberate choices:
 *
 * - **Version 6, not 7 or 8.** Six is MIT. Everything after it is
 *   GPL-2.0-or-later unless you buy a commercial licence, and GPL is the wrong
 *   licence to pull into a proprietary dashboard.
 * - **Self-hosted, not TinyMCE Cloud.** Cloud needs an account, an API key and
 *   a request to their CDN on every page load. `scripts/sync-tinymce.mjs`
 *   copies the assets into `public/` before dev and build.
 * - **No `images_upload_handler`.** Pasting a screenshot would inline it as a
 *   base64 data URL, which the API's sanitiser refuses and which would make an
 *   email several megabytes. Pictures have their own upload.
 *
 * Whatever this produces is sanitised again on the server. The allowlist there
 * is the security boundary; the toolbar here just decides what is convenient.
 *
 * ## Uncontrolled, on purpose
 *
 * `value` seeds the editor once and is never written back into it. The obvious
 * alternative — an effect that pushes `value` in whenever it changes — types
 * sentences out backwards, and it is worth knowing why: TinyMCE's change events
 * and React's renders run on different clocks, so an effect keyed on `value`
 * can fire holding a *stale* copy, push it in, and drop the caret to position
 * zero. Every following character then lands in front of the last one.
 *
 * To replace the content from outside — switching template, resetting to the
 * shipped wording — change the `key` and let React remount it. That is
 * unambiguous, and it cannot race.
 */
export function RichTextEditor({
  value,
  onChange,
  height = 420,
  disabled,
  id,
}: {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  disabled?: boolean;
  id?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const dark = resolvedTheme === 'dark';

  // Seeded from the first render and never read again, so a re-render caused by
  // typing cannot feed the editor its own output.
  const [seed] = useState(value);

  /*
   * Memoised so the object identity is stable.
   *
   * A fresh `init` on every keystroke gives the wrapper a reason to reconsider
   * the editor it already mounted, which is a good way to lose a selection.
   */
  const config = useMemo(
    () => ({
      height,
      menubar: false,
      branding: false,
      promotion: false,
      statusbar: true,
      resize: true,
      skin: dark ? 'oxide-dark' : 'oxide',
      content_css: dark ? 'dark' : 'default',
      plugins: [
        'advlist',
        'autolink',
        'lists',
        'link',
        'charmap',
        'searchreplace',
        'visualblocks',
        'table',
        'wordcount',
        'code',
      ],
      toolbar: [
        'undo redo | blocks fontfamily fontsize',
        'bold italic underline strikethrough forecolor backcolor',
        'alignleft aligncenter alignright alignjustify',
        'bullist numlist outdent indent | link table hr blockquote',
        'removeformat charmap code',
      ].join(' | '),
      toolbar_mode: 'sliding' as const,

      // Web-safe only. A font nobody's mail client has falls back to something
      // arbitrary, so offering Helvetica Neue Light here would be offering
      // something that mostly does not arrive.
      font_family_formats: [
        'System default=-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
        'Arial=arial,helvetica,sans-serif',
        'Georgia=georgia,palatino,serif',
        'Helvetica=helvetica,arial,sans-serif',
        'Tahoma=tahoma,arial,helvetica,sans-serif',
        'Times New Roman=times new roman,times,serif',
        'Trebuchet MS=trebuchet ms,geneva,sans-serif',
        'Verdana=verdana,geneva,sans-serif',
        'Courier New=courier new,courier,monospace',
      ].join(';'),
      font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
      block_formats:
        'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',

      // The brand blue first, so the obvious choice is the right one.
      color_map: [
        '1062D3', 'Brand blue',
        '102C58', 'Brand navy',
        '1C222B', 'Body text',
        '5B6472', 'Muted',
        '15803D', 'Green',
        'B91C1C', 'Red',
        'B45309', 'Amber',
        'FFFFFF', 'White',
      ],

      // Refused by the API's allowlist anyway; stopping it here means the admin
      // finds out while pasting rather than on save.
      paste_data_images: false,
      automatic_uploads: false,
      link_default_target: '_blank',
      link_assume_external_targets: 'https' as const,
      browser_spellcheck: true,
      contextmenu: 'link table',

      // Roughly what the email layout and the website will apply, so the editor
      // is not quietly lying about the result.
      content_style: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 15px;
          line-height: 1.62;
          color: ${dark ? '#e6e9ef' : '#1c222b'};
          padding: 12px 14px;
        }
        a { color: #1d6bde; }
        blockquote {
          margin: 0 0 14px;
          padding: 10px 14px;
          border-left: 3px solid #1062d3;
          background: ${dark ? 'rgba(255,255,255,0.04)' : '#f1f4f7'};
        }
        table { border-collapse: collapse; }
        table td, table th { border: 1px solid ${dark ? '#3a4252' : '#dadee3'}; padding: 8px 10px; }
        img { max-width: 100%; height: auto; }
      `,
    }),
    [dark, height],
  );

  return (
    <div className="border-input overflow-hidden rounded-md border">
      {!ready ? <Skeleton className="w-full" style={{ height }} /> : null}
      <div className={ready ? '' : 'hidden'}>
        <Editor
          id={id}
          // Served from our own origin. Never the CDN.
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          initialValue={seed}
          disabled={disabled}
          onInit={() => setReady(true)}
          onEditorChange={onChange}
          init={config}
        />
      </div>
    </div>
  );
}
