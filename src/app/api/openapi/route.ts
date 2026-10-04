import { NextResponse } from "next/server";

import { buildOpenApiDocument, originFromHeaders } from "@/lib/openapi";

export async function GET(request: Request) {
  return NextResponse.json(buildOpenApiDocument(originFromHeaders(request.headers)));
}
