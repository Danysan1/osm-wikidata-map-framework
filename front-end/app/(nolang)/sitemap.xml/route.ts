export const dynamic = "force-static";

import { NextResponse } from "next/server";

export function GET() {
  if (process.env.owmf_sitemap_url)
    return NextResponse.redirect(process.env.owmf_sitemap_url);
  else
    return NextResponse.error();
}
