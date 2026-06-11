import { asc, eq } from "drizzle-orm";
import { MainTabs } from "@/components/main-tabs";
import { db } from "@/db/client";
import { chatMessages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ChatView } from "./chat-view";

export const dynamic = "force-dynamic";

export type ChatMessageRow = {
  id: number;
  userId: string;
  nickname: string;
  text: string;
  createdAt: string; // ISO
};

export default async function ChatPage() {
  const { user } = await requireUser();

  const rows = await db
    .select({
      id: chatMessages.id,
      userId: chatMessages.userId,
      nickname: users.nickname,
      text: chatMessages.text,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .orderBy(asc(chatMessages.createdAt));

  const initialMessages: ChatMessageRow[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    nickname: r.nickname,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <MainTabs />
      <h1 className="text-default text-xl font-bold">Chat</h1>
      <ChatView initialMessages={initialMessages} currentUserId={user.id} />
    </main>
  );
}
