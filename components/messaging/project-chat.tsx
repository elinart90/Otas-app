'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Pin, Loader2, MessageSquare, CheckCheck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
type MessageSender = {
  id: string;
  full_name: string;
  role: string;
};

type Message = {
  id: string;
  content: string;
  is_action: boolean;
  is_read: boolean;
  created_at: string;
  sender: MessageSender | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function groupByDate(messages: Message[]): [string, Message[]][] {
  const groups = new Map<string, Message[]>();
  for (const m of messages) {
    const key = new Date(m.created_at).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return [...groups.entries()];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Component ────────────────────────────────────────────────────────────────
// Accepts groupId (preferred, group-scoped) or projectId (legacy per-project).
export function ProjectChat({
  groupId,
  projectId,
  currentUserId,
  isSupervisor,
}: {
  groupId?: string;
  projectId?: string;
  currentUserId: string;
  isSupervisor: boolean;
}) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [content, setContent]     = useState('');
  const [isAction, setIsAction]   = useState(false);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const threadParam = groupId
    ? `group_id=${groupId}`
    : `project_id=${projectId}`;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (initial = false) => {
      try {
        const res = await fetch(`/api/messages?${threadParam}`);
        const data = await res.json();
        if (data.ok) setMessages(data.messages ?? []);
      } finally {
        if (initial) setLoading(false);
      }
    },
    [threadParam]
  );

  useEffect(() => {
    fetchMessages(true);
    intervalRef.current = setInterval(() => fetchMessages(false), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMessages]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const threadBody = groupId
        ? { group_id: groupId, content: trimmed, is_action: isAction }
        : { project_id: projectId, content: trimmed, is_action: isAction };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threadBody),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? 'Send failed'); return; }
      setContent('');
      setIsAction(false);
      await fetchMessages(false);
      textareaRef.current?.focus();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSending(false);
    }
  }

  const unreadCount = messages.filter(
    (m) => !m.is_read && (m.sender as unknown as { id: string } | null)?.id !== currentUserId
  ).length;

  const grouped = groupByDate(messages);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {groupId ? 'Group chat' : 'Project chat'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSupervisor
                ? groupId ? 'Group thread — all members can read' : 'Guidance for your student'
                : groupId ? 'Shared thread with your supervisor and group' : 'Messages from your supervisor'}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          <span className="text-xs text-muted-foreground">Live · updates every 5s</span>
        </div>
      </div>

      {/* ── Message area ───────────────────────────────────────────────── */}
      <div
        className="flex h-[420px] flex-col overflow-y-auto bg-[#f7f9f8] px-4 py-4"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading messages…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No messages yet</p>
              <p className="mt-1 max-w-[26ch] text-xs text-muted-foreground">
                {isSupervisor
                  ? 'Send comments, feedback, or action items to the group.'
                  : 'Your supervisor and group members can chat here.'}
              </p>
            </div>
          </div>
        ) : (
          /* Messages — flex-col so they stack top→bottom, then scroll */
          <div className="flex flex-col gap-1 justify-end min-h-full">
            {grouped.map(([dateKey, group]) => (
              <div key={dateKey} className="space-y-1">

                {/* Date pill */}
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                    {formatDate(group[0].created_at)}
                  </span>
                </div>

                {/* Messages in this date group */}
                {group.map((msg, idx) => {
                  const sender   = msg.sender as unknown as MessageSender | null;
                  const isOwn    = sender?.id === currentUserId;
                  const showName = !isOwn && (idx === 0 || (group[idx - 1].sender as unknown as MessageSender | null)?.id !== sender?.id);

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {/* Avatar — other party only, shown on last message in a run */}
                      <div className="w-7 shrink-0">
                        {!isOwn && showName ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary border border-border text-[10px] font-bold text-foreground">
                            {initials(sender?.full_name ?? '?')}
                          </div>
                        ) : null}
                      </div>

                      {/* Bubble + meta */}
                      <div
                        className={cn(
                          'flex max-w-[72%] flex-col gap-1',
                          isOwn ? 'items-end' : 'items-start'
                        )}
                      >
                        {/* Sender name (first message in a run from other party) */}
                        {showName && (
                          <span className="px-1 text-[11px] font-semibold text-muted-foreground">
                            {sender?.full_name}
                          </span>
                        )}

                        {/* Action item bubble */}
                        {msg.is_action ? (
                          <div className="rounded-2xl rounded-tl-sm border-2 border-warning/40 bg-warning/10 px-4 py-3 shadow-sm">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <Pin className="h-3 w-3 text-warning-foreground" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-warning-foreground">
                                Action item
                              </span>
                            </div>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                              {msg.content}
                            </p>
                          </div>
                        ) : isOwn ? (
                          /* Own message */
                          <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 shadow-sm">
                            <p className="whitespace-pre-line text-sm leading-relaxed text-primary-foreground">
                              {msg.content}
                            </p>
                          </div>
                        ) : (
                          /* Other party message */
                          <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 shadow-sm">
                            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                              {msg.content}
                            </p>
                          </div>
                        )}

                        {/* Time + read receipt */}
                        <div className={cn('flex items-center gap-1 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.created_at)}
                          </span>
                          {isOwn && (
                            msg.is_read
                              ? <CheckCheck className="h-3 w-3 text-primary" />
                              : <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Composer ───────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-card">

        {/* Action item toggle — supervisors only */}
        {isSupervisor && (
          <div className="border-b border-border px-4 py-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 select-none">
              <button
                type="button"
                role="switch"
                aria-checked={isAction}
                onClick={() => setIsAction(!isAction)}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors duration-200',
                  isAction ? 'bg-warning' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    isAction ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
              <Pin
                className={cn(
                  'h-3.5 w-3.5 transition-colors duration-150',
                  isAction ? 'text-warning-foreground' : 'text-muted-foreground'
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-150',
                  isAction ? 'text-warning-foreground' : 'text-muted-foreground'
                )}
              >
                {isAction ? 'Sending as action item — student must complete this' : 'Pin as action item'}
              </span>
            </label>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder={
              isAction
                ? 'Describe the action item the student must complete…'
                : 'Type a message… (Enter to send · Shift+Enter for new line)'
            }
            className={cn(
              'flex-1 resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed transition-all duration-150',
              'bg-secondary/60 focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring',
              isAction ? 'border-warning/50 focus:ring-warning/40' : 'border-input'
            )}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !content.trim()}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-150',
              sending || !content.trim()
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : isAction
                  ? 'bg-warning text-warning-foreground shadow-sm hover:opacity-90'
                  : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95'
            )}
            aria-label="Send message"
          >
            {sending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Error + char count */}
        {(error || content.length > 3500) && (
          <div className="flex items-center justify-between px-4 pb-3">
            {error
              ? <p className="text-xs text-destructive">{error}</p>
              : <span />
            }
            {content.length > 3500 && (
              <span className={cn(
                'text-xs tabular-nums',
                content.length > 3900 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {content.length}/4000
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
