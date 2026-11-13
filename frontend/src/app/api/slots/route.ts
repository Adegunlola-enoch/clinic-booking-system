
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiKey = process.env.API_KEY;

  if (!apiBaseUrl || !apiKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const provider = requestUrl.searchParams.get("provider");

    const backendUrl = new URL("/slots", apiBaseUrl);

    if (provider) {
      backendUrl.searchParams.set("provider", provider);
    }

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to booking service" },
      { status: 502 }
    );
  }
}
