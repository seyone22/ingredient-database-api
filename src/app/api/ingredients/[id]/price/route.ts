import { type NextRequest, NextResponse } from "next/server";
import { fetchFromBackendApi, jsonResponse } from "@/lib/backend-client";

export async function GET(request: NextRequest, { params }: { params: any }) {
  const ingredientId = (await params).id;

  if (!ingredientId) {
    return NextResponse.json(
      { error: "Invalid ingredient ID" },
      { status: 400 },
    );
  }

  const result = await fetchFromBackendApi(
    `/ingredients/${ingredientId}/price`,
  );
  return jsonResponse(result);
}
