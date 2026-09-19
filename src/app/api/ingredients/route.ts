import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "https://foodapi.seyone.dev/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  try {
    const backendRes = await fetch(
      `${NESTJS_API_BASE}/ingredients?${searchParams.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("Text Search Error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message || err },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Ingredient name is required" },
        { status: 400 },
      );
    }

    const payload = {
      name: body.name.trim(),
      aliases: Array.isArray(body.aliases) ? body.aliases : [],
      country: Array.isArray(body.country) ? body.country : [],
      cuisine: Array.isArray(body.cuisine) ? body.cuisine : [],
      region: Array.isArray(body.region) ? body.region : [],
      flavor_profile: Array.isArray(body.flavor_profile)
        ? body.flavor_profile
        : [],
      dietary_flags: Array.isArray(body.dietary_flags)
        ? body.dietary_flags
        : [],
      provenance: body.provenance?.trim() || undefined,
      comment: body.comment?.trim() || undefined,
      pronunciation: body.pronunciation?.trim() || undefined,
      photo: body.photo?.trim() || undefined,
      derivatives: Array.isArray(body.derivatives) ? body.derivatives : [],
    };

    const backendRes = await fetch(`${NESTJS_API_BASE}/ingredients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data: any;
    try {
      data = await backendRes.json();
    } catch {
      data = { error: backendRes.statusText || "Server error" };
    }

    if (!backendRes.ok) {
      const errorMessage =
        (Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message) ||
        data?.detail ||
        data?.error ||
        "Failed to add ingredient";

      return NextResponse.json(
        { error: errorMessage, details: data },
        {
          status: backendRes.status,
          headers: {
            "X-Powered-By": "foodrepo-api (NestJS)",
          },
        },
      );
    }

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("Add Ingredient Error:", err);
    const code =
      err?.cause?.code ||
      (err?.message?.includes("fetch failed")
        ? "CONNECTION_FAILED"
        : "NETWORK_ERROR");
    const isConn =
      code === "ECONNREFUSED" ||
      code === "CONNECTION_FAILED" ||
      err?.message?.includes("fetch failed");

    const userMessage = isConn
      ? `Cannot connect to FoodRepo backend API at ${NESTJS_API_BASE}. The backend service is currently offline or unreachable.`
      : err.message || "An unexpected error occurred while communicating with the backend API.";

    const hint = isConn
      ? "Verify the foodrepo-api service status on Railway or check network connectivity."
      : "Check server logs or verify network connection.";

    return NextResponse.json(
      {
        error: userMessage,
        details: {
          code,
          endpoint: `${NESTJS_API_BASE}/ingredients`,
          hint,
        },
      },
      { status: 503 },
    );
  }
}
