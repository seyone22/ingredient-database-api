import { type NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

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

    let backendRes: Response;
    let targetBase = NESTJS_API_BASE;

    try {
      backendRes = await fetch(`${targetBase}/ingredients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (primaryErr: any) {
      // If primary target is localhost and fails with connection refused, try remote API fallback
      if (
        (primaryErr?.cause?.code === "ECONNREFUSED" ||
          primaryErr?.message?.includes("fetch failed")) &&
        targetBase.includes("localhost")
      ) {
        const fallbackBase = "https://foodapi.seyone.dev/api/v1";
        try {
          backendRes = await fetch(`${fallbackBase}/ingredients`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          });
          targetBase = fallbackBase;
        } catch {
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }

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
        ? "ECONNREFUSED"
        : "NETWORK_ERROR");
    const isConn =
      code === "ECONNREFUSED" || err?.message?.includes("fetch failed");

    const userMessage = isConn
      ? `Cannot connect to FoodRepo backend API at ${NESTJS_API_BASE}. The backend service is currently offline or unreachable.`
      : err.message || "An unexpected error occurred while communicating with the backend API.";

    const hint = isConn
      ? "Ensure foodrepo-api is running on port 4000 (npm run start:dev), or set FOODREPO_API_URL in .env.local."
      : "Check server logs or verify your network connection.";

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
