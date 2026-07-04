/**
 * Secure proxy for conversation messages.
 *
 * GET  /api/conversations/[id]/messages  → read messages (ownership verified by backend)
 * POST /api/conversations/[id]/messages  → append a message (ownership verified by backend)
 *
 * x-user-id is taken from the verified session, not from the client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? "";

function backendHeaders(userId: string) {
  return {
    "Content-Type": "application/json",
    "x-internal-key": INTERNAL_KEY,
    "x-user-id": userId,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/conversations/${params.id}/messages`, {
    headers: backendHeaders(session.user.email),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const res = await fetch(`${BACKEND}/conversations/${params.id}/messages`, {
    method: "POST",
    headers: backendHeaders(session.user.email),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
