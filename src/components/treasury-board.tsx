'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Landmark, Loader2, RefreshCw, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { checkAccountName, checkMove, markMoveFailed, saveTreasurySettings, sendToQuidax } from '@/app/actions/treasury';
import { checkResultText, coverLine, moveStatusText, naira, type TreasurySnapshot } from '@/lib/treasury';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { relativeTime } from '@/lib/utils';
import { TIPS } from '@/lib/tips';
import { InfoTip } from '@/components/info-tip';

const askPassword = (what: string) => globalThis.prompt(`To ${what}, type your password.`);
const digits = (v: string) => v.replace(/\D/g, '');

function Figure({ icon: Icon, title, value, help, tip }: { icon: typeof Wallet; title: string; value: string; help: string; tip: string }) {
  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <div className="text-muted-foreground flex items-center gap-2">
        <Icon className="size-4" />
        <p className="t-small">{title}</p>
        <InfoTip text={tip} />
      </div>
      <p className="t-display mt-2 font-mono">{value}</p>
      <p className="text-muted-foreground t-caption mt-1">{help}</p>
    </div>
  );
}

/** Owners: change the payout reserve. */
function ReserveCard({ s, isOwner }: { s: TreasurySnapshot; isOwner: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(String(Math.trunc(Number(s.reserve))));
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const password = askPassword(`set the payout reserve to ${naira(value)}`);
      if (!password) return;
      const r = await saveTreasurySettings({ payoutReserveNgn: Number(value), password });
      if (r.error) return void toast.error('Not saved', { description: r.error });
      toast.success('Payout reserve saved');
      router.refresh();
    });
  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <h2 className="t-section mb-1">Payout reserve</h2>
      <p className="text-muted-foreground t-caption mb-3">
        Naira that must stay at {s.rail.name} so customer withdrawals never run short. It can&apos;t be sent to Quidax, and owners get an email when the
        balance drops below it.
      </p>
      <p className="t-small">
        Now: <span className="font-mono font-medium">{naira(s.reserve)}</span>
      </p>
      {isOwner ? (
        <div className="mt-3 flex items-end gap-2">
          <div className="grid gap-1">
            <Label className="t-caption">New reserve (₦)</Label>
            <Input value={value} onChange={(e) => setValue(digits(e.target.value))} inputMode="numeric" className="h-8 w-44 font-mono" />
          </div>
          <Button size="sm" onClick={save} disabled={pending || value === '' || Number(value) === Math.trunc(Number(s.reserve))}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Owners: the bank account Quidax gives us for funding our main account. */
function FundingAccountCard({ s, banks, isOwner }: { s: TreasurySnapshot; banks: Array<{ code: string; name: string }>; isOwner: boolean }) {
  const router = useRouter();
  const [bankCode, setBankCode] = useState(s.fundingAccount?.bankCode ?? '');
  const [number, setNumber] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const check = () =>
    start(async () => {
      const r = await checkAccountName(bankCode, number);
      if (r.error) {
        setName(null);
        toast.error('Account not found', { description: r.error });
        return;
      }
      setName(r.accountName ?? null);
    });
  const save = () =>
    start(async () => {
      const password = askPassword(`save ${name} as the Quidax funding account`);
      if (!password) return;
      const r = await saveTreasurySettings({ fundingBankCode: bankCode, fundingAccountNumber: number, password });
      if (r.error) return void toast.error('Not saved', { description: r.error });
      toast.success('Quidax funding account saved');
      setNumber('');
      setName(null);
      router.refresh();
    });

  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <h2 className="t-section mb-1">Quidax funding account</h2>
      <p className="text-muted-foreground t-caption mb-3">
        The bank account Quidax gives us for adding naira to our main Quidax account. Money sent to Quidax goes here.
      </p>
      {s.fundingAccount ? (
        <p className="t-small">
          {s.fundingAccount.bankName} <span className="font-mono">{s.fundingAccount.accountNumberMasked}</span> · {s.fundingAccount.accountName}
        </p>
      ) : (
        <p className="text-warning t-small">Not set yet. Set it before sending naira to Quidax.</p>
      )}
      {isOwner ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="grid gap-1">
            <Label className="t-caption">Bank</Label>
            <select
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setName(null);
              }}
              className="border-input bg-background h-8 rounded-md border px-2 text-sm"
            >
              <option value="">Choose a bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label className="t-caption">Account number</Label>
            <Input
              value={number}
              onChange={(e) => {
                setNumber(digits(e.target.value).slice(0, 10));
                setName(null);
              }}
              inputMode="numeric"
              className="h-8 w-36 font-mono"
            />
          </div>
          <Button size="sm" variant="outline" onClick={check} disabled={pending || !bankCode || number.length !== 10}>
            Check name
          </Button>
          {name ? (
            <div className="flex items-center gap-2 sm:col-span-3">
              <p className="t-small">
                The bank says: <span className="font-medium">{name}</span>
              </p>
              <Button size="sm" onClick={save} disabled={pending}>
                Save this account
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Owners: send naira from the rail to Quidax (no second approval, decision 19 Oct). */
function SendCard({ s, isOwner }: { s: TreasurySnapshot; isOwner: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [pending, start] = useTransition();
  const open = s.moves.some((m) => m.status === 'SENDING' || m.status === 'CHECKING');
  const send = () =>
    start(async () => {
      const to = s.fundingAccount ? `${s.fundingAccount.bankName} ${s.fundingAccount.accountNumberMasked}` : 'Quidax';
      if (!globalThis.confirm(`Send ${naira(amount)} from ${s.rail.name} to Quidax (${to})?`)) return;
      const password = askPassword(`send ${naira(amount)} to Quidax`);
      if (!password) return;
      const r = await sendToQuidax(Number(amount), password);
      if (r.error) return void toast.error('Not sent', { description: r.error });
      if (r.status === 'FAILED') toast.error('Refused', { description: r.reason ?? 'Nothing was sent.' });
      else toast.success(r.status === 'ARRIVED' ? 'Arrived at Quidax' : 'Sent; waiting for the bank to confirm');
      setAmount('');
      router.refresh();
    });
  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <div className="flex items-center gap-2">
        <h2 className="t-section">Send naira to Quidax</h2>
        <ArrowRight className="size-4" />
      </div>
      <p className="text-muted-foreground t-caption mt-1 mb-3">
        For buying coins. You can send up to{' '}
        <span className="text-foreground font-medium">{s.availableToMove === null ? '— (balance unknown)' : naira(s.availableToMove)}</span>: what is at{' '}
        {s.rail.name}, minus the payout reserve and customer withdrawals still being sent.
      </p>
      {!isOwner ? (
        <p className="text-muted-foreground t-caption">Only an owner can send naira.</p>
      ) : open ? (
        <p className="text-warning t-small">A move is still being sent. Wait for it to arrive or fail.</p>
      ) : (
        <div className="flex items-end gap-2">
          <div className="grid gap-1">
            <Label className="t-caption">Amount (₦)</Label>
            <Input value={amount} onChange={(e) => setAmount(digits(e.target.value))} inputMode="numeric" className="h-8 w-44 font-mono" />
          </div>
          <Button
            size="sm"
            onClick={send}
            disabled={pending || !s.fundingAccount || !(Number(amount) > 0) || s.availableToMove === null || Number(amount) > Number(s.availableToMove)}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Send
          </Button>
        </div>
      )}
    </div>
  );
}

/** Ask the bank about one move now. */
function CheckNow({ id, railName }: { id: string; railName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="ml-2"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await checkMove(id);
          if (r.error) return void toast.error('Could not check', { description: r.error });
          toast.message(checkResultText(r, railName));
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Check with the bank now
    </Button>
  );
}

/**
 * Owners only: a move the bank still has no record of 30 minutes after it was
 * sent. The API asks the bank again and refuses if it has any record at all.
 */
function MarkFailed({ id, amount, railName }: { id: string; amount: string; railName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive ml-2"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!globalThis.confirm(`Mark this ${naira(amount)} move as failed? Only do this if ${railName} has no record of it. We will ask ${railName} once more first.`)) return;
          const password = askPassword('mark this move as failed');
          if (!password) return;
          const r = await markMoveFailed(id, password);
          if (r.error) return void toast.error('Not marked as failed', { description: r.error });
          toast.success('Marked as failed. You can send a new move.');
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Mark as failed
    </Button>
  );
}

/**
 * Treasury: our naira at the naira rail and at Quidax against what customers
 * are owed, the payout reserve, and owner moves to Quidax.
 */
export function TreasuryBoard({ s, banks, isOwner }: { s: TreasurySnapshot; banks: Array<{ code: string; name: string }>; isOwner: boolean }) {
  const router = useRouter();
  const [refreshing, start] = useTransition();
  const tone = s.covered === 'YES' ? 'border-success/25 bg-success/5' : s.covered === 'SHORT' ? 'border-destructive/25 bg-destructive/5' : 'border-warning/25 bg-warning/5';
  return (
    <div className="flex flex-col gap-5">
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${tone}`}>
        <p className="t-small min-w-0 flex-1 font-medium">{coverLine(s)}</p>
        <span className="text-muted-foreground t-caption">Checked {relativeTime(s.checkedAt)} · also every morning at 07:00</span>
        <Button size="sm" variant="outline" onClick={() => start(() => router.refresh())} disabled={refreshing}>
          {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Check again
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Figure
          icon={Landmark}
          title={`Naira at ${s.rail.name}`}
          value={s.rail.available === null ? '—' : naira(s.rail.available)}
          help={s.rail.error ?? 'Where customer deposits land and customer withdrawals are paid from.'}
          tip={TIPS.treasury.rail}
        />
        <Figure
          icon={Wallet}
          title="Naira at Quidax"
          value={s.quidaxNgn === null ? '—' : naira(s.quidaxNgn)}
          help={s.quidaxNgn === null ? "We couldn't read the Quidax naira balance." : 'Used to buy coins when our stock runs low.'}
          tip={TIPS.treasury.quidax}
        />
        <Figure icon={Users} title="Customers are owed" value={naira(s.owed)} help="All customers' naira balances added together, including amounts on their way out." tip={TIPS.treasury.owed} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SendCard s={s} isOwner={isOwner} />
        <ReserveCard s={s} isOwner={isOwner} />
      </div>
      <FundingAccountCard s={s} banks={banks} isOwner={isOwner} />

      <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
        <h2 className="t-section mb-1">Recent moves to Quidax</h2>
        <p className="text-muted-foreground t-caption mb-3">Newest first. Each is also in the audit log.</p>
        {s.moves.length === 0 ? (
          <p className="text-muted-foreground t-small">None yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.moves.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="t-small">{relativeTime(m.createdAt)}</TableCell>
                  <TableCell className="t-small font-mono">{naira(m.amount)}</TableCell>
                  <TableCell className="t-small">{m.to}</TableCell>
                  <TableCell className="t-small">
                    <Badge variant={m.status === 'ARRIVED' ? 'success' : m.status === 'FAILED' ? 'destructive' : 'outline'}>{moveStatusText(m.status)}</Badge>
                    {m.failureReason ? <span className="text-muted-foreground t-caption ml-2">{m.failureReason}</span> : null}
                    {m.status === 'SENDING' || m.status === 'CHECKING' ? <CheckNow id={m.id} railName={s.rail.name} /> : null}
                    {m.canMarkFailed ? <MarkFailed id={m.id} amount={m.amount} railName={s.rail.name} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
