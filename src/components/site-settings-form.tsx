'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  ShieldAlert,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { removeSiteLogo, saveSiteLogo, saveSiteSettings } from '@/app/actions/site';
import type { SiteSettings } from '@/lib/types-admin';
import { IconTile } from '@/components/dashboard-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MAX_LOGO_BYTES = 1024 * 1024;

/** Every field, flattened, so dirty-tracking is one comparison rather than ten. */
type Draft = {
  companyName: string;
  supportEmail: string;
  phone: string;
  address: string;
  iosVersion: string;
  androidVersion: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

const toDraft = (s: SiteSettings): Draft => ({
  companyName: s.companyName ?? '',
  supportEmail: s.supportEmail ?? '',
  phone: s.phone ?? '',
  address: s.address ?? '',
  iosVersion: s.iosVersion ?? '',
  androidVersion: s.androidVersion ?? '',
  iosStoreUrl: s.iosStoreUrl ?? '',
  androidStoreUrl: s.androidStoreUrl ?? '',
  maintenanceMode: s.maintenanceMode,
  maintenanceMessage: s.maintenanceMessage ?? '',
});

function Card({
  title,
  icon,
  tone,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentProps<typeof IconTile>['icon'];
  tone: React.ComponentProps<typeof IconTile>['tone'];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card border-border/60 rounded-xl border p-5', className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} size="sm" />
        <h2 className="t-section">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint ? <p className="text-muted-foreground t-caption">{hint}</p> : null}
    </div>
  );
}

/**
 * The values the public website reads.
 *
 * Everything here is served unauthenticated at GET /v1/site, so a change lands
 * on the landing page without a deploy. That is the point of the screen: a
 * phone number should be a field, not a pull request.
 */
export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const [draft, setDraft] = useState<Draft>(toDraft(settings));
  const [logoVersion, setLogoVersion] = useState(settings.logoVersion);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const saved = toDraft(settings);
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== saved[k]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () =>
    start(async () => {
      // Empty strings mean "cleared", which the API stores as null.
      const result = await saveSiteSettings({ ...draft });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Saved', { description: 'The website picks this up within a minute.' });
      router.refresh();
    });

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      toast.error('Unsupported file', { description: 'Use a PNG, JPEG, WebP or SVG.' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('That logo is too large', { description: 'The limit is 1 MB.' });
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read that file'));
        reader.readAsDataURL(file);
      });
      const result = await saveSiteLogo(dataUrl);
      if (result.error) {
        toast.error('Could not save that logo', { description: result.error });
        return;
      }
      setLogoVersion(result.settings?.logoVersion ?? null);
      toast.success('Logo updated');
      router.refresh();
    } catch (err) {
      toast.error('Could not read that file', { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const clearLogo = () =>
    start(async () => {
      const result = await removeSiteLogo();
      if (result.error) {
        toast.error('Could not remove it', { description: result.error });
        return;
      }
      setLogoVersion(null);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card title="Contact information" icon={MapPin} tone="blue">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company name"
              value={draft.companyName}
              onChange={(v) => set('companyName', v)}
              placeholder="Davochain"
            />
            <Field
              label="Support email"
              type="email"
              value={draft.supportEmail}
              onChange={(v) => set('supportEmail', v)}
              placeholder="support@davochain.com"
            />
            <Field
              label="Phone"
              value={draft.phone}
              onChange={(v) => set('phone', v)}
              placeholder="+234 916 001 2046"
            />
            <Field
              label="Address"
              value={draft.address}
              onChange={(v) => set('address', v)}
              placeholder="Lagos, Nigeria"
            />
          </div>
        </Card>

        <Card title="System" icon={ShieldAlert} tone={draft.maintenanceMode ? 'rose' : 'amber'}>
          <div className="grid gap-4">
            <label className="border-border/60 flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
              <span>
                <span className="t-small block font-medium">Maintenance mode</span>
                <span className="text-muted-foreground t-caption block">
                  Puts the website and the apps behind a holding page. The admin keeps working —
                  locking yourself out of the switch is not a recovery plan.
                </span>
              </span>
              <input
                type="checkbox"
                checked={draft.maintenanceMode}
                onChange={(e) => set('maintenanceMode', e.target.checked)}
                className="accent-primary mt-0.5 size-4 shrink-0"
              />
            </label>

            <Field
              label="Maintenance message"
              value={draft.maintenanceMessage}
              onChange={(v) => set('maintenanceMessage', v)}
              placeholder="Back at 6pm WAT."
              hint="Required before the switch can go on — a blank holding page tells nobody anything."
            />
          </div>
        </Card>

        <Card title="The apps" icon={Smartphone} tone="green">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="iOS version"
              value={draft.iosVersion}
              onChange={(v) => set('iosVersion', v)}
              placeholder="1.0.0"
            />
            <Field
              label="Android version"
              value={draft.androidVersion}
              onChange={(v) => set('androidVersion', v)}
              placeholder="1.0.0"
            />
            <Field
              label="App Store URL"
              value={draft.iosStoreUrl}
              onChange={(v) => set('iosStoreUrl', v)}
              placeholder="https://apps.apple.com/app/…"
            />
            <Field
              label="Play Store URL"
              value={draft.androidStoreUrl}
              onChange={(v) => set('androidStoreUrl', v)}
              placeholder="https://play.google.com/store/apps/…"
            />
          </div>
        </Card>

        <Card title="Branding" icon={ImageIcon} tone="violet">
          <p className="text-muted-foreground t-caption mb-3">
            Shown on the website and in the admin header. PNG, JPEG, WebP or SVG, up to 1 MB.
          </p>
          <div className="flex items-center gap-4">
            <span className="border-border/60 bg-background flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
              {logoVersion ? (
                // eslint-disable-next-line @next/next/no-img-element -- our own proxy route
                <img src={`/site-logo?v=${logoVersion}`} alt="" className="size-full object-contain p-1.5" />
              ) : (
                <ImageIcon className="text-muted-foreground size-5" />
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading || pending}
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                Upload logo
              </Button>
              {logoVersion ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogo}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hidden
              onChange={(e) => {
                void uploadLogo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </Card>
      </div>

      {/*
        The six social columns used to be edited here. They are now rows in a
        table with their own icons and an on/off switch, because adding a
        seventh network should not need a migration — and because an email
        footer wants an image, not just a URL. Left as a pointer rather than
        removed silently: somebody who knows where these lived will come here
        looking for them.
      */}
      <Card title="Social media links" icon={Globe} tone="blue">
        <p className="text-muted-foreground t-small">
          These moved to <span className="text-foreground font-medium">CMS &rarr; Social links</span>,
          where each network has its own icon, its own link and a switch for whether it shows.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <a href="/cms/socials">Open social links</a>
        </Button>
      </Card>

      {/* Sticky, because this form is taller than a screen and a save button
          you have to scroll to find is a save button people forget. */}
      <div className="bg-background/85 border-border/60 sticky bottom-0 z-10 -mx-1 flex items-center gap-3 rounded-t-xl border-t px-1 py-3 backdrop-blur">
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
        {dirty ? (
          <>
            <Button variant="ghost" onClick={() => setDraft(saved)} disabled={pending}>
              Discard
            </Button>
            <span className="text-muted-foreground t-caption">Unsaved changes</span>
          </>
        ) : (
          <span className="text-muted-foreground t-caption">
            Live on the website. Changes appear there within a minute.
          </span>
        )}
      </div>
    </div>
  );
}
