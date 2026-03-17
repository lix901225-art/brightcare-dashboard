import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:4000";

async function proxy(req: NextRequest) {
  try {
    const upstreamPath = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");

    // Reject path traversal and protocol-relative URLs
    if (upstreamPath.includes("..") || upstreamPath.startsWith("//")) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 });
    }

    const upstreamUrl = `${API_BASE_URL}${upstreamPath}${req.nextUrl.search}`;

    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    const userId = req.headers.get("x-user-id");
    const tenantId = req.headers.get("x-tenant-id");

    if (contentType) headers.set("content-type", contentType);
    if (userId) headers.set("x-user-id", userId);
    if (tenantId) headers.set("x-tenant-id", tenantId);

    // Forward Accept header for correct content negotiation
    const accept = req.headers.get("accept");
    if (accept) headers.set("accept", accept);

    // Track B: forward Bearer token when present (coexists with legacy headers)
    const authorization = req.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);

    const method = req.method.toUpperCase();
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await req.text();

    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    // Log full error server-side; return only message to client
    console.error("[proxy]", error);
    return NextResponse.json({ message }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
