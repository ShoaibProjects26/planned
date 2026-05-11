"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  AlertCircle,
  Lock,
  Sparkles,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

type Phase = "loading" | "ready" | "paywall" | "error";

const SUGGESTED_PROMPTS = [
  "Can you explain multiplication in a different way?",
  "What's a fun activity for adding fractions?",
  "How do I help my child with handwriting?",
  "Suggest a creative project about the solar system",
];

export default function ChatPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch("/api/chat");
      if (res.status === 403) {
        setPhase("paywall");
        return;
      }
      if (!res.ok) throw new Error("Couldn't load chat");
      const json = await res.json();
      setMessages(json.messages ?? []);
      setPhase("ready");
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setErrorMsg("");
    setInput("");

    // Optimistic user message — replaced by server ID once the response lands.
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: trimmed, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't send message");
      }
      const json = await res.json();
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== tempId)
          .concat([json.userMessage, json.assistantMessage]),
      );
    } catch (err: unknown) {
      // Roll back the optimistic message and surface the error.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setInput(trimmed); // restore so user can retry
    } finally {
      setSending(false);
    }
  }

  async function clearHistory() {
    if (!confirm("Clear all chat history? This can't be undone.")) return;
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([]);
    } catch {
      /* swallow — UI just stays as-is and the parent can retry */
    }
  }

  // ── Paywall ──────────────────────────────────────────────────────────────
  if (phase === "paywall") {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-mint flex items-center justify-center">
          <Lock className="w-7 h-7 text-brand-green" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            Ask anything — Premium feature
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get help adapting lessons, clarifying concepts, or planning activities
            for your child — from a UK-curriculum-aware AI tutor that knows your
            family&apos;s setup.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
        <span className="text-muted-foreground text-sm">Loading chat…</span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-green-deep mb-1">
            Couldn&apos;t load chat
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
          <button
            onClick={load}
            className="bg-brand-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-green-deep transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-0rem)] max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl planned-gradient flex items-center justify-center shadow-sm">
            <MessageCircle className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-brand-green-deep leading-tight">
              Ask the homeschool assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Context-aware to your family setup
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-muted"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-6">
              <div className="text-4xl">👋</div>
              <h2 className="font-display font-semibold text-brand-green-deep">
                Ask me anything about your homeschool day
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                I know your curriculum, faith setting, and your children — so
                you don&apos;t need to re-explain things every time.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Try asking
              </p>
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white border border-[hsl(var(--border))] hover:border-brand-green/40 hover:bg-brand-mint/30 text-sm text-brand-green-deep transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="px-5 py-2 bg-destructive/10 border-t border-destructive/20 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-[hsl(var(--border))] bg-white px-4 py-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder="Type a question… (Enter to send, Shift+Enter for new line)"
          rows={1}
          maxLength={4000}
          disabled={sending}
          className="flex-1 bg-muted/30 border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green resize-none max-h-32"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="shrink-0 w-10 h-10 rounded-xl bg-brand-green hover:bg-brand-green-deep disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-brand-green text-white rounded-br-sm"
            : "bg-white border border-[hsl(var(--border))] text-brand-green-deep rounded-bl-sm",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
