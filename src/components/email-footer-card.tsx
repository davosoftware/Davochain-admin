'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { saveEmailFooter } from '@/app/actions/cms';
import type { SiteSettings } from '@/lib/types-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * The wording under the social icons, on every email.
 *
 * One row, not one per template: the legal entity, the registered address and
 * the opt-in sentence are the same on every message, and twenty-two copies of
 * them is twenty-two places to forget when the company moves office.
 *
 * Collapsed by default. Somebody opens this screen to change what an email
 * says, not to re-read the footer — but when the footer *is* what they came
 * for, it should not be on another page.
 */
export function EmailFooterCard({
  settings,
  canEdit,
}: {
  settings: SiteSettings | null;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [legalName, setLegalName] = useState(settings?.emailLegalName ?? '');
  const [addressLine, setAddressLine] = useState(settings?.emailAddressLine ?? '');
  const [optIn, setOptIn] = useState(settings?.emailOptInNote ?? '');
  const [unsubNote, setUnsubNote] = useState(settings?.emailUnsubscribeNote ?? '');
  const [unsubUrl, setUnsubUrl] = useState(settings?.emailUnsubscribeUrl ?? '');
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty =
    legalName !== (settings?.emailLegalName ?? '') ||
    addressLine !== (settings?.emailAddressLine ?? '') ||
    optIn !== (settings?.emailOptInNote ?? '') ||
    unsubNote !== (settings?.emailUnsubscribeNote ?? '') ||
    unsubUrl !== (settings?.emailUnsubscribeUrl ?? '');

  const save = () =>
    start(async () => {
      const result = await saveEmailFooter({
        emailLegalName: legalName,
        emailAddressLine: addressLine,
        emailOptInNote: optIn,
        emailUnsubscribeNote: unsubNote,
        emailUnsubscribeUrl: unsubUrl,
      });
      if (result.error) {
        toast.error('Could not save the footer', { description: result.error });
        return;
      }
      toast.success('Footer saved', { description: 'Every email uses it from the next one sent.' });
      router.refresh();
    });

  return (
    <Card className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-secondary/40 flex w-full items-center justify-between gap-3 p-4 text-left transition-colors"
        aria-expanded={open}
      >
        <div>
          <h2 className="t-section">Footer and branding</h2>
          <p className="text-muted-foreground t-caption mt-0.5">
            The logo, name and social icons come from{' '}
            <span className="font-medium">System → General settings</span>. The legal lines below
            them are here.
          </p>
        </div>
        <ChevronDown
          className={cn('text-muted-foreground size-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <CardContent className="border-border/70 flex flex-col gap-4 border-t p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="f-legal"
              label="Legal name"
              hint="Goes in the copyright line. Blank uses the company name."
              value={legalName}
              onChange={setLegalName}
              placeholder="Davochain Software Limited"
              disabled={!canEdit}
              max={160}
            />
            <Field
              id="f-address"
              label="Registered address"
              hint="Most bulk-mail rules require a physical address in every message."
              value={addressLine}
              onChange={setAddressLine}
              placeholder="12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria"
              disabled={!canEdit}
              max={300}
            />
          </div>

          <Field
            id="f-optin"
            label="Why they are receiving it"
            hint="Blank uses: “You are receiving this email because you have an account with us.”"
            value={optIn}
            onChange={setOptIn}
            placeholder="You are receiving this email because you opted in via our website."
            disabled={!canEdit}
            max={300}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="f-unsub"
              label="Line above the unsubscribe link"
              hint="The word “unsubscribe” is added after it, as the link."
              value={unsubNote}
              onChange={setUnsubNote}
              placeholder="If these emails get annoying, please feel free to"
              disabled={!canEdit}
              max={300}
            />
            <Field
              id="f-unsuburl"
              label="Where unsubscribe points"
              hint="An https link, or a mailto: address. Blank uses the support address."
              value={unsubUrl}
              onChange={setUnsubUrl}
              placeholder="mailto:support@davochain.com?subject=Unsubscribe"
              disabled={!canEdit}
              max={500}
            />
          </div>

          {canEdit ? (
            <div className="flex justify-end">
              <Button onClick={save} loading={pending} disabled={!dirty}>
                <Save className="size-4" />
                {dirty ? 'Save footer' : 'Saved'}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground t-caption">
              You can read this but not change it.
            </p>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  max,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled?: boolean;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={max}
      />
      <p className="text-muted-foreground t-caption">{hint}</p>
    </div>
  );
}
