"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  postChatMessage,
  type PostChatMessageState,
} from "@/app/actions";
import type { ChatMessagesResponse } from "@/app/api/chat/messages/route";

const POLL_INTERVAL_MS = 5000;
const MAX_LEN = 500;

const timestampFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTimestamp(iso: string): string {
  return timestampFormatter.format(new Date(iso));
}

export type ChatMessageRow = {
  id: number;
  userId: string;
  nickname: string;
  text: string;
  createdAt: string; // ISO
};

function maxId(messages: ChatMessageRow[]): number {
  let max = 0;
  for (const m of messages) {
    if (m.id > max) max = m.id;
  }
  return max;
}

export function ChatSection({
  initialMessages,
  currentUserId,
}: {
  initialMessages: ChatMessageRow[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const lastSeenIdRef = useRef<number>(maxId(initialMessages));

  const pollOnce = useCallback(async () => {
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    try {
      const since = lastSeenIdRef.current;
      const res = await fetch(`/api/chat/messages?since=${since}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) return;
      const body = (await res.json()) as ChatMessagesResponse;

      setMessages((prev) => {
        if (body.truncated) {
          lastSeenIdRef.current = maxId(body.messages);
          return body.messages;
        }
        if (body.messages.length === 0) return prev;
        const next = [...prev, ...body.messages];
        lastSeenIdRef.current = maxId(next);
        return next;
      });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      console.error("[chat] poll failed:", err);
    } finally {
      if (inFlightRef.current === ctrl) inFlightRef.current = null;
    }
  }, []);

  const [state, action, pending] = useActionState<
    PostChatMessageState,
    FormData
  >(async (prev, formData) => {
    const result = await postChatMessage(prev, formData);
    if (result?.ok) {
      setText("");
      // Forzamos un poll inmediato para ver nuestro propio mensaje sin
      // esperar al próximo tick.
      void pollOnce();
    }
    return result;
  }, null);

  // Polling cada 5s mientras la pestaña está visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      timer = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        void pollOnce();
        start();
      } else {
        stop();
        inFlightRef.current?.abort();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      inFlightRef.current?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollOnce]);

  // Auto-scroll al pie del contenedor cuando cambia la cantidad de
  // mensajes (primer mount o mensaje nuevo).
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages.length]);

  const remaining = MAX_LEN - text.length;
  const showCounter = text.length > 400;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (text.trim().length === 0) e.preventDefault();
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-text-gray text-xs tracking-wider uppercase">
        Chat
      </h2>

      <div
        ref={scrollContainerRef}
        className="bg-background-container border-opacity-white-12 flex h-[35vh] min-h-[180px] flex-col gap-2 overflow-y-auto rounded-md border p-3"
      >
        {messages.length === 0 ? (
          <p className="text-text-gray flex flex-1 items-center justify-center text-center text-sm">
            Todavía nadie dijo nada. Tirá la primera.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.userId === currentUserId;
            return (
              <div
                key={m.id}
                className={
                  "flex flex-col gap-0.5 " +
                  (mine ? "items-end" : "items-start")
                }
              >
                <div className="text-text-gray flex items-center gap-2 text-xs">
                  <span className={mine ? "text-default font-semibold" : ""}>
                    {m.nickname}
                  </span>
                  <span>·</span>
                  <span>{formatTimestamp(m.createdAt)}</span>
                </div>
                <p
                  className={
                    "max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap " +
                    (mine
                      ? "bg-default-40 text-text-light"
                      : "bg-background-home-section text-text-light")
                  }
                >
                  {m.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={MAX_LEN}
          placeholder="Tirá una chicana"
          className="bg-background-home-section border-opacity-white-12 text-text-light placeholder:text-text-gray focus:border-default rounded-md border px-3 py-2 text-sm outline-none"
          disabled={pending}
        />
        <div className="flex items-center justify-between gap-2">
          {showCounter ? (
            <span
              className={
                "text-xs " +
                (remaining < 0 ? "text-system-error-dark" : "text-text-gray")
              }
            >
              {text.length} / {MAX_LEN}
            </span>
          ) : (
            <span className="text-text-gray text-xs">
              ⌘/Ctrl + Enter para enviar
            </span>
          )}
          {state?.error && (
            <span className="text-system-error-dark text-xs">
              {state.error}
            </span>
          )}
          <button
            type="submit"
            disabled={pending || text.trim().length === 0}
            className="bg-default text-text-light rounded-md px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </section>
  );
}
