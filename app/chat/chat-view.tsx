"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { postChatMessage, type PostChatMessageState } from "./actions";
import type { ChatMessageRow } from "./page";

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

export function ChatView({
  initialMessages,
  currentUserId,
}: {
  initialMessages: ChatMessageRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [state, action, pending] = useActionState<
    PostChatMessageState,
    FormData
  >(async (prev, formData) => {
    const result = await postChatMessage(prev, formData);
    if (result?.ok) setText("");
    return result;
  }, null);

  // Polling: refresh server data cada 5s mientras la pestaña está visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  // Auto-scroll al pie cuando llegan mensajes nuevos.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages.length]);

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
    <div className="flex flex-1 flex-col gap-3">
      <div className="bg-background-container border-opacity-white-12 flex min-h-[60vh] flex-1 flex-col gap-2 overflow-y-auto rounded-md border p-3">
        {initialMessages.length === 0 ? (
          <p className="text-text-gray flex flex-1 items-center justify-center text-center text-sm">
            Todavía nadie dijo nada. Tirá la primera.
          </p>
        ) : (
          initialMessages.map((m) => {
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
        <div ref={scrollAnchorRef} />
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
        <div className="flex items-center justify-between">
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
    </div>
  );
}
