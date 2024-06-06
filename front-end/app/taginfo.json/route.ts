import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ message: "TODO" }, { status: 200 });
}
