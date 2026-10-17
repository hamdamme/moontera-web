import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("Contact form submitted:", body);

    return NextResponse.json({
      success: true,
      message: "Message received successfully.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
