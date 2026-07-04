/**
 * DELETE /api/admin/github/[repo]  → DELETE /admin/github/repos/{repo}
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { repo: string } }
) {
  const res = await fetch(`${API_URL}/admin/github/repos/${params.repo}`, {
    method: "DELETE",
    headers: { "x-admin-key": ADMIN_API_KEY },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
