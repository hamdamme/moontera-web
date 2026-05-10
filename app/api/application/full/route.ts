import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
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
      subject: "New Full Driver Application",
      html: `
        <h2>New Full Driver Application</h2>

        <h3>Applicant Information</h3>
        <p><strong>Full Name:</strong> ${body.full_name}</p>
        <p><strong>Address:</strong> ${body.address}</p>
        <p><strong>City / State / ZIP:</strong> ${body.city_state_zip}</p>
        <p><strong>Date of Birth:</strong> ${body.dob}</p>
        <p><strong>Phone:</strong> ${body.phone}</p>
        <p><strong>Email:</strong> ${body.email}</p>
        <p><strong>Position:</strong> ${body.position}</p>
        <p><strong>Available Start Date:</strong> ${body.start_date}</p>

        <hr />

        <h3>CDL Information</h3>
        <p><strong>License Number:</strong> ${body.license_number}</p>
        <p><strong>License State:</strong> ${body.license_state}</p>
        <p><strong>License Class:</strong> ${body.license_class}</p>
        <p><strong>Endorsements:</strong> ${body.endorsements || "None"}</p>
        <p><strong>License Expiration:</strong> ${body.license_expiration}</p>

        <hr />

        <h3>Medical Card & DOT Information</h3>
        <p><strong>Medical Card Registration:</strong> ${body.medcard_registration}</p>
        <p><strong>Medical Card Expiration:</strong> ${body.medcard_expiration}</p>
        <p><strong>Last DOT Test Date:</strong> ${body.last_dot_test_date}</p>

        <hr />

        <h3>FMCSA Clearinghouse Consent</h3>
        <p><strong>Consent Acknowledged:</strong> ${body.clearinghouse_portal_ack ? "Yes" : "No"}</p>
        <p><strong>Typed Signature:</strong> ${body.clearinghouse_consent_signature}</p>
        <p><strong>Consent Date:</strong> ${body.consent_date}</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Full application submitted.",
    });
  } catch (error) {
    console.error("Full application error:", error);

    return NextResponse.json(
      { success: false, message: "Full application could not be submitted." },
      { status: 500 }
    );
  }
}