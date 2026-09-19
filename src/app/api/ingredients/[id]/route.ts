import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: any },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid ingredient ID" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(
      `${NESTJS_API_BASE}/ingredients/${id}?${searchParams.toString()}`,
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
    console.error("GET Ingredient Error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message || err },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Invalid ingredient ID" },
        { status: 400 },
      );
    }

    const body = await req.json();

    const backendRes = await fetch(`${NESTJS_API_BASE}/ingredients/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("PATCH Ingredient Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Invalid ingredient ID" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(`${NESTJS_API_BASE}/ingredients/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await backendRes.json();

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
      },
    });
  } catch (err: any) {
    console.error("DELETE Ingredient Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
