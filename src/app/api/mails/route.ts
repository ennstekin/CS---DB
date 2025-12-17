import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch all mails from database
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {};

    if (status) {
      if (status === "new") {
        where.status = "NEW";
      } else if (status === "open") {
        where.status = { in: ["OPEN", "PENDING"] };
      } else if (status === "resolved") {
        where.status = "RESOLVED";
      }
    }

    const mails = await prisma.mail.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        customer: true,
        order: true,
        assignedTo: true,
      },
    });

    return NextResponse.json(mails);
  } catch (error) {
    console.error("Error fetching mails:", error);
    return NextResponse.json(
      { error: "Failed to fetch mails" },
      { status: 500 }
    );
  }
}
