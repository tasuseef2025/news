import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret") || "";
}

function sameSecret(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

export function verifyCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ message: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const token = readBearerToken(request);
  if (!token || !sameSecret(token, secret)) {
    return NextResponse.json({ message: "Unauthorized cron request" }, { status: 401 });
  }

  return null;
}
