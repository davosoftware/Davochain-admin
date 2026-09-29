'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { removeAvatar, setAvatar, updateProfile } from '@/app/actions/settings';
import type { AdminProfile } from '@/lib/types-admin';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** What we store. A face is recognisable long before it is 256px wide. */
const SIZE = 256;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

/**
 * Resize in the browser, not on the server.
 *
 * A phone photo is 4 MB and 4000px wide; an avatar is 20 KB and 256. Doing it
 * here means the big one never goes over the wire at all, and the API needs no
 * image-processing dependency to receive a sane picture.
 */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that image');
  ctx.imageSmoothingQuality = 'high';

  // Cover, not contain: fill the square and crop the overflow, centred, so a
  // portrait and a landscape both end up as a face rather than a letterbox.
  const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  bitmap.close();

  // PNG keeps transparency, which a logo needs; everything else is a photo and
  // JPEG is a third of the size at a quality nobody can see.
  return file.type === 'image/png'
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.88);
}

export function ProfileCard({ profile }: { profile: AdminProfile }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('');
  const [version, setVersion] = useState(profile.avatarVersion);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const emailChanged = email.trim().toLowerCase() !== profile.email;
  const dirty = name.trim() !== profile.name || emailChanged;
  const canSave = dirty && name.trim().length >= 2 && (!emailChanged || password.length > 0);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast.error('Unsupported file', { description: 'Use a PNG, JPEG or WebP image.' });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('That file is very large', { description: 'Pick an image under 12 MB.' });
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await downscale(file);
      const result = await setAvatar(dataUrl);
      if (result.error) {
        toast.error('Could not save that picture', { description: result.error });
        return;
      }
      setVersion(result.profile?.avatarVersion ?? null);
      toast.success('Picture updated');
      router.refresh();
    } catch (err) {
      toast.error('Could not read that image', { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const clear = () =>
    start(async () => {
      const result = await removeAvatar();
      if (result.error) {
        toast.error('Could not remove it', { description: result.error });
        return;
      }
      setVersion(null);
      router.refresh();
    });

  const save = () =>
    start(async () => {
      const result = await updateProfile({
        name: name.trim(),
        email: emailChanged ? email.trim().toLowerCase() : undefined,
        currentPassword: emailChanged ? password : undefined,
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      setPassword('');
      toast.success('Profile saved');
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 border-b p-4">
        <h2 className="t-section">Profile</h2>
        <p className="text-muted-foreground t-caption mt-0.5">
          How you appear to the rest of the team.
        </p>
      </div>

      <CardContent className="p-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* The picture. Click it or drop a file on it. */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void accept(e.dataTransfer.files[0]);
              }}
              disabled={uploading}
              aria-label="Change your picture"
              className={cn(
                'group relative rounded-full transition',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                dragging && 'ring-primary ring-2 ring-offset-2',
              )}
            >
              <Avatar
                id={profile.id}
                name={profile.name}
                email={profile.email}
                version={version}
                size={88}
              />
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center rounded-full',
                  'bg-foreground/55 text-background opacity-0 transition-opacity',
                  'group-hover:opacity-100 group-focus-visible:opacity-100',
                  uploading && 'opacity-100',
                )}
              >
                {uploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Camera className="size-5" />
                )}
              </span>
            </button>

            {version ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={pending || uploading}
                className="text-muted-foreground hover:text-destructive h-7"
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            ) : (
              <span className="text-muted-foreground t-caption">PNG, JPEG or WebP</span>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                void accept(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="grid flex-1 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
              <p className="text-muted-foreground t-caption">This is what you sign in with.</p>
            </div>

            {/* Only asked for when the login itself is moving. */}
            {emailChanged ? (
              <div className="grid gap-1.5">
                <Label htmlFor="admin-email-password">Current password</Label>
                <Input
                  id="admin-email-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Required to change your email"
                />
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={!canSave || pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
              {dirty ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName(profile.name);
                    setEmail(profile.email);
                    setPassword('');
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
