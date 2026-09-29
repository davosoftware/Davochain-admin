'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createFaq, deleteFaq, reorderFaqs, updateFaq } from '@/app/actions/cms';
import type { FaqRow } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { cn, plainText } from '@/lib/utils';

/**
 * Questions the website shows, in the order the admin arranged them.
 *
 * Ordering is by up/down buttons rather than drag-and-drop: this list is a
 * dozen rows edited occasionally, and a button works on a phone, with a
 * keyboard, and for anyone who cannot drag.
 */
export function FaqManager({ faqs, canEdit }: { faqs: FaqRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const categories = useMemo(
    () => [...new Set(faqs.map((f) => f.category).filter(Boolean))] as string[],
    [faqs],
  );

  const move = (index: number, direction: -1 | 1) =>
    start(async () => {
      const next = [...faqs];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];

      const result = await reorderFaqs(next.map((f) => f.id));
      if (result.error) {
        toast.error('Could not save the order', { description: result.error });
        return;
      }
      router.refresh();
    });

  const togglePublished = (faq: FaqRow) =>
    start(async () => {
      const result = await updateFaq(faq.id, { isPublished: !faq.isPublished });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(faq.isPublished ? 'Hidden from the website' : 'Live on the website');
      router.refresh();
    });

  const remove = (faq: FaqRow) =>
    start(async () => {
      const result = await deleteFaq(faq.id);
      if (result.error) {
        toast.error('Could not delete', { description: result.error });
        return;
      }
      toast.success('Question deleted');
      router.refresh();
    });

  return (
    <>
      <Card>
        <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <div>
            <h2 className="t-section">
              {faqs.length} {faqs.length === 1 ? 'question' : 'questions'}
            </h2>
            <p className="text-muted-foreground t-caption mt-0.5">
              Shown on the website only. The apps have their own help screen.
            </p>
          </div>
          {canEdit ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add question
            </Button>
          ) : null}
        </div>

        <CardContent className="p-0">
          {faqs.length === 0 ? (
            <p className="text-muted-foreground t-small p-8 text-center">
              No questions yet. The FAQ section will not appear on the website until there is at
              least one.
            </p>
          ) : (
            <ul className="divide-border/50 divide-y">
              {faqs.map((faq, index) => (
                <li key={faq.id} className="flex items-start gap-3 p-4">
                  {canEdit ? (
                    <div className="flex flex-col gap-0.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || pending}
                        aria-label="Move up"
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded p-0.5 transition-colors disabled:opacity-25"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === faqs.length - 1 || pending}
                        aria-label="Move down"
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded p-0.5 transition-colors disabled:opacity-25"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  ) : null}

                  <span className="text-muted-foreground t-caption w-5 shrink-0 pt-1 text-right tabular-nums">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('t-body font-medium', !faq.isPublished && 'opacity-60')}>
                        {faq.question}
                      </p>
                      {faq.category ? <Badge variant="secondary">{faq.category}</Badge> : null}
                      {!faq.isPublished ? <Badge variant="outline">Hidden</Badge> : null}
                    </div>
                    {/* The answer is HTML now, so a raw render in a list would
                        show the tags. Two lines of the words is all a row
                        needs; the editor shows the formatting. */}
                    <p className="text-muted-foreground t-small mt-1 line-clamp-2">
                      {plainText(faq.answer)}
                    </p>
                  </div>

                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublished(faq)}
                        disabled={pending}
                        aria-label={faq.isPublished ? 'Hide' : 'Show'}
                        title={faq.isPublished ? 'Hide from the website' : 'Show on the website'}
                      >
                        {faq.isPublished ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <EyeOff className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(faq)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <DeleteButton onConfirm={() => remove(faq)} pending={pending} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FaqDialog
        key={editing?.id ?? 'new'}
        faq={editing}
        open={adding || editing !== null}
        categories={categories}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </>
  );
}

/**
 * Two taps to delete, without a modal.
 *
 * A confirmation dialog for one FAQ is heavier than the action deserves; doing
 * it with no confirmation at all loses somebody's writing to a mis-click.
 */
function DeleteButton({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setArmed(true)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="size-3.5" />
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-0.5">
      <Button variant="destructive" size="sm" onClick={onConfirm} loading={pending}>
        Delete
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setArmed(false)} aria-label="Keep">
        <X className="size-3.5" />
      </Button>
    </span>
  );
}

function FaqDialog({
  faq,
  open,
  categories,
  onClose,
}: {
  faq: FaqRow | null;
  open: boolean;
  categories: string[];
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [category, setCategory] = useState(faq?.category ?? '');
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () =>
    start(async () => {
      const input = {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim(),
      };
      const result = faq ? await updateFaq(faq.id, input) : await createFaq(input);
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(faq ? 'Question updated' : 'Question added');
      onClose();
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{faq ? 'Edit question' : 'Add a question'}</DialogTitle>
          <DialogDescription>
            {faq
              ? 'Changes appear on the website as soon as you save.'
              : 'It goes live on the website as soon as you save.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-question">Question</Label>
            <Input
              id="f-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="How long does a deposit take?"
              autoFocus
              maxLength={300}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-category">Group</Label>
            <Input
              id="f-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Deposits"
              list="faq-categories"
              maxLength={60}
            />
            <datalist id="faq-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-muted-foreground t-caption">
              Questions with the same group appear together. Leave it blank for &ldquo;General&rdquo;.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-answer">Answer</Label>
            <RichTextEditor id="f-answer" value={answer} onChange={setAnswer} height={208} />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={save}
            loading={pending}
            disabled={question.trim().length < 3 || answer.trim().length < 1}
          >
            <Save className="size-4" />
            {faq ? 'Save changes' : 'Add question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
