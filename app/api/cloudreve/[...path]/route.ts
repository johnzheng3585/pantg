import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BASE = "http://localhost:5212/api/v4";

function getTargetBase() {
  const base = process.env.CLOUDREVE_API_BASE || DEFAULT_BASE;
  return base.replace(/\/$/, "");
}

function buildTargetUrl(request: NextRequest, segments: string[]) {
  const base = getTargetBase();
  const suffix = segments.map(encodeURIComponent).join("/");
  const incoming = new URL(request.url);
  const apiBase = base.endsWith("/api/v4") ? base : `${base}/api/v4`;
  return `${apiBase}/${suffix}${incoming.search}`;
}

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  const headers = new Headers(request.headers);
  headers.delete("host");

  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  const upstream = await fetch(buildTargetUrl(request, context.params.path), {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store"
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
