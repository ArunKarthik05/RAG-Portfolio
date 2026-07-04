/**
 * Secure proxy for conversation list + create.
 *
 * GET  /api/conversations      → list user's conversations
 * POST /api/conversations      → create a new conversation
 *
 * Both require a valid NextAuth session. User identity comes from the
 * verified session — never from client-supplied input.
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/conversations/`, {
    headers: backendHeaders(session.user.email),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const res = await fetch(`${BACKEND}/conversations/`, {
    method: "POST",
    headers: backendHeaders(session.user.email),
    // Override any client-supplied user_id with the verified session email
    body: JSON.stringify({ ...body, user_id: session.user.email }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
