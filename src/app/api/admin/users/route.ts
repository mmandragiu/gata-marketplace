import { api } from "@/lib/api";
import { listModerationUsers } from "@/lib/services/admin";

export async function GET() {
  return api((ctx) => listModerationUsers(ctx));
}
