'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { clearEmailImage, setEmailImage } from '@/app/actions/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The size a banner should be.
 *
 * The message card is 600 points wide, so 1200 covers a 2× screen and nothing
 * beyond that is ever visible. 400 tall gives 3:1 — wide enough to read as a
 * masthead, short enough that the greeting is still above the fold on a phone.
 *
 * Anything is accepted and scaled to fit the width; these are the numbers that
 * come out looking deliberate rather than cropped.
 */
const IDEAL = { width: 1200, height: 400 };
const MAX_WIDTH = IDEAL.width;

/** Past this the picture pushes the message off the first screen on a phone. */
const MAX_RATIO = 1.2;

/**
 * The picture on one email.
 *
 * Downscaled in the browser before it is sent. A phone photo is a dozen
 * megabytes and 4000px wide; an email that size gets flagged as spam before
 * anybody reads it, and no client will ever show more than 600 points across.
 * Doing it here rather than on the server keeps the original off the wire
 * entirely and saves the API an image-processing dependency.
 */
async function downscale(file: File): Promise<{ dataUrl: string; ratio: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read that image');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  /*
   * JPEG unless the source has transparency.
   *
   * A photographic banner as PNG is several times the size for no visible
   * gain, but re-encoding a logo with an alpha channel to JPEG puts a black
   * box behind it.
   */
  const keepAlpha = file.type === 'image/png' || file.type === 'image/gif';
  return {
    dataUrl: canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.86),
    ratio: height / width,
  };
}

export function EmailImagePicker({
  templateKey,
  imageUrl,
  imageAlt,
  disabled,
}: {
  templateKey: string;
  imageUrl: string | null;
  imageAlt: string | null;
  disabled?: boolean;
}) {
  const [alt, setAlt] = useState(imageAlt ?? '');
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = (file: File) =>
    start(async () => {
      try {
        const { dataUrl, ratio } = await downscale(file);
        const result = await setEmailImage(templateKey, dataUrl, alt.trim() || undefined);
        if (result.error) {
          toast.error('Could not save that picture', { description: result.error });
          return;
        }
        // Accepted either way — it is their picture — but a tall one pushes the
        // greeting off the first screen on a phone, which is worth knowing.
        if (ratio > MAX_RATIO) {
          toast.warning('Picture saved, but it is tall', {
            description: `A banner works best around ${IDEAL.width} × ${IDEAL.height}. This one is taller than it is wide, so the message starts below the fold.`,
          });
        } else {
          toast.success('Picture saved', { description: 'It shows under the header on this email.' });
        }
        router.refresh();
      } catch {
        toast.error('Could not read that file', {
          description: 'Use a PNG, JPEG or GIF.',
        });
      }
    });

  const saveAlt = () =>
    start(async () => {
      if (!imageUrl) return;
      // The API takes alt with the bytes, so re-sending the existing picture is
      // the way to change only the text. Cheap: it is already downscaled.
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(blob);
      });
      const result = await setEmailImage(templateKey, dataUrl, alt.trim() || undefined);
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Description saved');
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const result = await clearEmailImage(templateKey);
      if (result.error) {
        toast.error('Could not remove it', { description: result.error });
        return;
      }
      setAlt('');
      toast.success('Picture removed');
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label>Picture</Label>
        <span className="text-muted-foreground t-caption">
          Shows under the header, above the message
        </span>
      </div>

      <div className="border-input flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start">
        <div className="bg-secondary flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-md sm:w-44">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt ?? 'Current picture'}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground t-caption px-2 text-center">
              No picture — the header sits straight on the message
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = '';
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={pending}
              disabled={disabled}
            >
              <ImageUp className="size-3.5" />
              {imageUrl ? 'Replace' : 'Add a picture'}
            </Button>
            {imageUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={disabled || pending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            ) : null}
          </div>

          <Input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={() => {
              if (imageUrl && alt.trim() !== (imageAlt ?? '')) saveAlt();
            }}
            placeholder="Describe the picture"
            disabled={disabled || !imageUrl}
            maxLength={200}
            className="h-8"
            aria-label="Picture description"
          />
          <p className="text-muted-foreground t-caption">
            <strong className="text-foreground font-medium">
              {IDEAL.width}&thinsp;&times;&thinsp;{IDEAL.height}px
            </strong>{' '}
            is the size that fits the message card exactly without overflowing. PNG, JPEG or GIF up
            to 2&nbsp;MB; anything larger is scaled to {MAX_WIDTH}px here before it is sent. Most
            inboxes block images by default, so the description is what a lot of people actually
            read.
          </p>
        </div>
      </div>
    </div>
  );
}
