import { api } from "@/lib/api";
import { listCategoriesWithCounts } from "@/lib/services/catalog";

export async function GET() {
  return api((ctx) => listCategoriesWithCounts(ctx));
}
