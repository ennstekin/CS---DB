import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ImapMailClient } from "@/lib/mail/imap-client";

// GET - Fetch mail labels
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: mail, error } = await supabase
      .from("mails")
      .select("labels, flags")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      labels: mail?.labels || [],
      flags: mail?.flags || [],
    });
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

// PUT - Update mail labels
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { labels, flags } = await request.json();

    const updateData: any = {};
    if (labels !== undefined) updateData.labels = labels;
    if (flags !== undefined) updateData.flags = flags;

    const { data, error } = await supabase
      .from("mails")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      labels: data.labels,
      flags: data.flags,
    });
  } catch (error) {
    console.error("Error updating labels:", error);
    return NextResponse.json(
      { error: "Failed to update labels" },
      { status: 500 }
    );
  }
}

// POST - Add label to mail
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { label, flag } = await request.json();

    // Önce mevcut labels/flags ve message_id'yi al
    const { data: mail, error: fetchError } = await supabase
      .from("mails")
      .select("labels, flags, message_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const updateData: any = {};
    let shouldSyncImap = false;
    let labelToSync = "";

    if (label) {
      const currentLabels = mail?.labels || [];
      if (!currentLabels.includes(label)) {
        updateData.labels = [...currentLabels, label];
        shouldSyncImap = true;
        labelToSync = label;
      }
    }

    if (flag) {
      const currentFlags = mail?.flags || [];
      if (!currentFlags.includes(flag)) {
        updateData.flags = [...currentFlags, flag];
      }
    }

    if (Object.keys(updateData).length > 0) {
      // Database'i güncelle
      const { data, error } = await supabase
        .from("mails")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Gmail ile senkronize et (label varsa ve message_id mevcutsa)
      if (shouldSyncImap && mail?.message_id) {
        try {
          // IMAP ayarlarını al
          const { data: settings } = await supabase
            .from("settings")
            .select("key, value");

          if (settings) {
            const settingsMap: Record<string, string> = {};
            settings.forEach((row) => {
              settingsMap[row.key] = row.value;
            });

            // IMAP config oluştur
            if (
              settingsMap.mail_imap_host &&
              settingsMap.mail_imap_user &&
              settingsMap.mail_imap_password
            ) {
              const imapClient = new ImapMailClient({
                host: settingsMap.mail_imap_host,
                port: parseInt(settingsMap.mail_imap_port || "993"),
                user: settingsMap.mail_imap_user,
                password: settingsMap.mail_imap_password,
                tls: settingsMap.mail_imap_tls === "true",
              });

              // Gmail'e label ekle
              await imapClient.addLabel(mail.message_id, labelToSync);
              console.log(`✅ Label "${labelToSync}" synced to Gmail for message ${mail.message_id}`);
            }
          }
        } catch (imapError) {
          console.error("⚠️ IMAP sync failed (database updated):", imapError);
          // IMAP hatası olsa bile database güncellemesi başarılı, hatayı loglayıp devam et
        }
      }

      return NextResponse.json({
        success: true,
        labels: data.labels,
        flags: data.flags,
      });
    }

    return NextResponse.json({
      success: true,
      labels: mail.labels,
      flags: mail.flags,
    });
  } catch (error) {
    console.error("Error adding label:", error);
    return NextResponse.json(
      { error: "Failed to add label" },
      { status: 500 }
    );
  }
}

// DELETE - Remove label from mail
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { label, flag } = await request.json();

    // Önce mevcut labels/flags ve message_id'yi al
    const { data: mail, error: fetchError } = await supabase
      .from("mails")
      .select("labels, flags, message_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const updateData: any = {};
    let shouldSyncImap = false;
    let labelToSync = "";

    if (label) {
      const currentLabels = mail?.labels || [];
      updateData.labels = currentLabels.filter((l: string) => l !== label);
      shouldSyncImap = true;
      labelToSync = label;
    }

    if (flag) {
      const currentFlags = mail?.flags || [];
      updateData.flags = currentFlags.filter((f: string) => f !== flag);
    }

    // Database'i güncelle
    const { data, error } = await supabase
      .from("mails")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Gmail ile senkronize et (label varsa ve message_id mevcutsa)
    if (shouldSyncImap && mail?.message_id) {
      try {
        // IMAP ayarlarını al
        const { data: settings } = await supabase
          .from("settings")
          .select("key, value");

        if (settings) {
          const settingsMap: Record<string, string> = {};
          settings.forEach((row) => {
            settingsMap[row.key] = row.value;
          });

          // IMAP config oluştur
          if (
            settingsMap.mail_imap_host &&
            settingsMap.mail_imap_user &&
            settingsMap.mail_imap_password
          ) {
            const imapClient = new ImapMailClient({
              host: settingsMap.mail_imap_host,
              port: parseInt(settingsMap.mail_imap_port || "993"),
              user: settingsMap.mail_imap_user,
              password: settingsMap.mail_imap_password,
              tls: settingsMap.mail_imap_tls === "true",
            });

            // Gmail'den label sil
            await imapClient.removeLabel(mail.message_id, labelToSync);
            console.log(`✅ Label "${labelToSync}" removed from Gmail for message ${mail.message_id}`);
          }
        }
      } catch (imapError) {
        console.error("⚠️ IMAP sync failed (database updated):", imapError);
        // IMAP hatası olsa bile database güncellemesi başarılı, hatayı loglayıp devam et
      }
    }

    return NextResponse.json({
      success: true,
      labels: data.labels,
      flags: data.flags,
    });
  } catch (error) {
    console.error("Error removing label:", error);
    return NextResponse.json(
      { error: "Failed to remove label" },
      { status: 500 }
    );
  }
}
