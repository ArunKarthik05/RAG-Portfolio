/**
 * Server-side proxy for GitHub admin endpoints.
 * Injects ADMIN_API_KEY (server-side env) so it never leaks to the client.
 *
 * GET  /api/admin/github        → GET  /admin/github/repos
 * POST /api/admin/github        → POST /admin/github/ingest  { repo_names: [...] }
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

const HEADERS = { "x-admin-key": ADMIN_API_KEY, "Content-Type": "application/json" };

export async function GET() {
  const res = await fetch(`${API_URL}/admin/github/repos`, { headers: HEADERS });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/admin/github/ingest`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
