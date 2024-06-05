import { NextResponse } from "next/server";

// To handle a GET request to /api
export function GET() {
  // Do whatever you want
  return NextResponse.json({ message: "TODO" }, { status: 200 });
}
