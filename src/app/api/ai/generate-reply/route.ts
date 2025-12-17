import { NextRequest, NextResponse } from "next/server";
import { generateMailResponse, type MailResponseRequest } from "@/lib/ai/mail-responder";

export async function POST(request: NextRequest) {
  try {
    const body: MailResponseRequest = await request.json();

    // Validasyon
    if (!body.from || !body.subject || !body.body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // AI yanıt üret
    const response = await generateMailResponse(body);

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Reply Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
