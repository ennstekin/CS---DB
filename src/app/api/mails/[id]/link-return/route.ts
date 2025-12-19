import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST - Link a mail to a return
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { returnNumber, returnId } = body;

    if (!returnNumber && !returnId) {
      return NextResponse.json(
        { error: "İade numarası veya ID gerekli" },
        { status: 400 }
      );
    }

    console.log(`🔗 Linking mail ${id} to return ${returnNumber || returnId}`);

    // If only returnNumber provided, find the return
    let finalReturnId = returnId;
    let finalReturnNumber = returnNumber;

    if (!returnId && returnNumber) {
      const { data: returnData } = await supabase
        .from("returns")
        .select("id, return_number")
        .ilike("return_number", `%${returnNumber}%`)
        .limit(1)
        .single();

      if (returnData) {
        finalReturnId = returnData.id;
        finalReturnNumber = returnData.return_number;
      }
    }

    // Update the mail with the matched return
    const { data, error } = await supabase
      .from("mails")
      .update({
        matched_return_id: finalReturnId || null,
        matched_return_number: finalReturnNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error linking mail to return:", error);
      return NextResponse.json(
        { error: "Mail iadeye bağlanamadı" },
        { status: 500 }
      );
    }

    console.log(`✅ Mail ${id} linked to return ${finalReturnNumber}`);

    return NextResponse.json({
      success: true,
      matchedReturnNumber: finalReturnNumber,
      matchedReturnId: finalReturnId,
      mail: data,
    });
  } catch (error) {
    console.error("❌ Error in link-return:", error);
    return NextResponse.json(
      { error: "Bağlantı hatası" },
      { status: 500 }
    );
  }
}

// DELETE - Unlink a mail from a return
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🔓 Unlinking mail ${id} from return`);

    const { data, error } = await supabase
      .from("mails")
      .update({
        matched_return_id: null,
        matched_return_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error unlinking mail from return:", error);
      return NextResponse.json(
        { error: "Bağlantı kaldırılamadı" },
        { status: 500 }
      );
    }

    console.log(`✅ Mail ${id} unlinked from return`);

    return NextResponse.json({
      success: true,
      mail: data,
    });
  } catch (error) {
    console.error("❌ Error in unlink-return:", error);
    return NextResponse.json(
      { error: "Bağlantı kaldırma hatası" },
      { status: 500 }
    );
  }
}
