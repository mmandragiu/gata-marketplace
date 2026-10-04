import { messageInputSchema, parseOrThrow } from "@/lib/validation";

import { AppError, toAppError } from "./errors";
import { requireActive } from "./guards";
import { iso } from "./mappers";
import { getContact } from "./profiles";
import type { Contact, Ctx, Job, Message } from "./types";

/** Chat between the client and the accepted worker (RLS: parties only). */
export async function listMessages(ctx: Ctx, jobId: string): Promise<Message[]> {
  if (!ctx.viewer) return [];
  const rows = await ctx.db.asUser(ctx.viewer.authUserId, (q) =>
    q.query(
      `select m.id, m.job_id, m.sender_id, p.full_name as sender_name, m.body, m.created_at
       from public.messages m join public.profiles p on p.id = m.sender_id
       where m.job_id = $1
       order by m.created_at asc
       limit 300`,
      [jobId],
    ),
  );
  return rows.map((r) => ({
    id: String(r.id),
    jobId: String(r.job_id),
    senderId: String(r.sender_id),
    senderName: String(r.sender_name ?? ""),
    body: String(r.body),
    createdAt: iso(r.created_at),
  }));
}

export async function sendMessage(ctx: Ctx, jobId: string, raw: unknown): Promise<string> {
  const viewer = requireActive(ctx);
  const { body } = parseOrThrow(messageInputSchema, raw);
  try {
    const rows = await ctx.db.asUser(viewer.authUserId, (q) =>
      q.query<{ id: string }>(
        `insert into public.messages (job_id, sender_id, body)
         values ($1, public.current_profile_id(), $2)
         returning id`,
        [jobId, body],
      ),
    );
    return rows[0].id;
  } catch (err) {
    const e = toAppError(err);
    if (e.code === "FORBIDDEN") {
      throw new AppError("FORBIDDEN", "Chatul se deblochează doar pentru client și lucrătorul ales.");
    }
    throw e;
  }
}

/** True when the viewer is the client or the assigned worker of an assigned/completed job. */
export function isJobParty(ctx: Ctx, job: Job): boolean {
  const me = ctx.viewer?.profile.id;
  if (!me || (job.status !== "assigned" && job.status !== "completed")) return false;
  return job.client.id === me || job.assignedWorkerId === me;
}

/** The other party's contact details, unlocked after a bid is accepted. */
export async function getCounterpartyContact(ctx: Ctx, job: Job): Promise<Contact | null> {
  if (!isJobParty(ctx, job)) return null;
  const me = ctx.viewer!.profile.id;
  const otherId = job.client.id === me ? job.assignedWorkerId : job.client.id;
  return otherId ? getContact(ctx, otherId) : null;
}
