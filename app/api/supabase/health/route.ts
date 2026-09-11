import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseConfig } from "@/utils/supabase/config";

export const dynamic = "force-dynamic";

// Read-only connectivity check. Never returns user data, cookies or API keys.
export async function GET() {
  try {
    const supabase = await createClient();
    await supabase.auth.getClaims();
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json(
      { connected: response.ok },
      {
        status: response.ok ? 200 : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { connected: false },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
