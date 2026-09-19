import { NextRequest, NextResponse } from "next/server";

const NESTJS_API_BASE =
  process.env.FOODREPO_API_URL || "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = `${NESTJS_API_BASE}/oauth/authorize?${searchParams.toString()}`;

  try {
    const res = await fetch(targetUrl);
    if (res.redirected) {
      return NextResponse.redirect(res.url, 302);
    }

    const html = await res.text();
    return new NextResponse(html, {
      status: res.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new NextResponse("Authorization Gateway Error", { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  try {
    const res = await fetch(`${NESTJS_API_BASE}/oauth/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      redirect: "manual",
    });

    const location = res.headers.get("location");
    if (location) {
      return NextResponse.redirect(location, 302);
    }

    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err: any) {
    return new NextResponse("Authorization Submission Gateway Error", { status: 502 });
  }
}
