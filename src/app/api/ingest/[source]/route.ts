import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

export async function POST(
  req: NextRequest,
  { params }: { params: { source: string } }
) {
  const { source } = params;
  const contentType = req.headers.get("content-type") ?? "";

  // Forward the body as-is (handles both JSON and multipart/form-data)
  const body = contentType.includes("multipart") ? await req.formData() : null;

  const res = await fetch(`${API_URL}/ingest/${source}`, {
    method: "POST",
    headers: {
      "x-admin-key": ADMIN_API_KEY,
      // Don't forward content-type for multipart — fetch sets it with boundary automatically
      ...(body ? {} : { "content-type": "application/json" }),
    },
    body: body ?? undefined,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
