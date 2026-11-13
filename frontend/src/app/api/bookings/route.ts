
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiKey = process.env.API_KEY;

  if (!apiBaseUrl || !apiKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const idempotencyKey = request.headers.get("Idempotency-Key");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const response = await fetch(`${apiBaseUrl}/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    const retryAfter = response.headers.get("Retry-After");

    if (retryAfter) {
      nextResponse.headers.set("Retry-After", retryAfter);
    }

    return nextResponse;
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to booking service" },
      { status: 502 }
    );
  }
}
