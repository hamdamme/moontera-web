import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is missing");

      return NextResponse.json(
        { success: false, message: "Email service is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const body = await req.json();

    await resend.emails.send({
      from: "Moontera Website <onboarding@resend.dev>",
      to: ["llcmoontera@gmail.com"],
      subject: "New Quick Driver Application",
      html: `
        <h2>New Quick Driver Application</h2>

        <p><strong>Full Name:</strong> ${body.full_name}</p>
        <p><strong>Address:</strong> ${body.address}</p>
        <p><strong>City / State / ZIP:</strong> ${body.city_state_zip}</p>
        <p><strong>Date of Birth:</strong> ${body.dob}</p>
        <p><strong>Phone:</strong> ${body.phone}</p>
        <p><strong>Email:</strong> ${body.email}</p>
        <p><strong>Position:</strong> ${body.position}</p>
        <p><strong>Available Start Date:</strong> ${body.start_date}</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Quick application submitted.",
    });
  } catch (error) {
    console.error("Quick application error:", error);

    return NextResponse.json(
      { success: false, message: "Application could not be submitted." },
      { status: 500 }
    );
  }
}