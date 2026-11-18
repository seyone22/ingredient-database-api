import { type NextRequest, NextResponse } from "next/server";
import { FOODREPO_API_BASE } from "@/lib/api-config";
import { fetchFromBackendApi, jsonResponse } from "@/lib/backend-client";

const NESTJS_API_BASE = FOODREPO_API_BASE;

export async function GET(
  request: NextRequest,
  { params }: { params: any },
): Promise<NextResponse> {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  if (!id) {
    return NextResponse.json(
      { error: "Invalid ingredient ID" },
      { status: 400 },
    );
  }

  const query = searchParams.toString();
  const path = query ? `/ingredients/${id}?${query}` : `/ingredients/${id}`;
  const result = await fetchFromBackendApi(path);

  return jsonResponse(result);
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
    const ifMatch = req.headers.get("if-match");

    const backendRes = await fetch(`${NESTJS_API_BASE}/ingredients/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(ifMatch ? { "If-Match": ifMatch } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    const etag = backendRes.headers.get("etag");

    return NextResponse.json(data, {
      status: backendRes.status,
      headers: {
        "X-Powered-By": "foodrepo-api (NestJS)",
        ...(etag ? { ETag: etag } : {}),
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
