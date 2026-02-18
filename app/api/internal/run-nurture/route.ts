import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getResend, getFromAddress, buildNurtureHtml } from "@/lib/email";
import type { SupportedLocale } from "@/lib/locale-strings";

export const dynamic = "force-dynamic";

function verifyToken(request: NextRequest): boolean {
  const token = request.headers.get("x-internal-token");
  const expectedToken = process.env.INTERNAL_CRON_TOKEN;
  if (!expectedToken) {
    throw new Error("INTERNAL_CRON_TOKEN environment variable is not set");
  }
  return token === expectedToken;
}

/**
 * Calculate next nurture date based on stage.
 * Stage 1 -> 2: +7 days
 * Stage 2 -> 3: +14 days
 */
function getNextNurtureDate(stage: number): Date {
  const now = new Date();
  if (stage === 1) {
    now.setDate(now.getDate() + 7);
  } else if (stage === 2) {
    now.setDate(now.getDate() + 14);
  }
  return now;
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = getDb();
    const resend = getResend();
    const from = getFromAddress();

    // Query leads that need nurture emails
    const leads = await sql`
      SELECT 
        id, first_name, email, locale, nurture_stage
      FROM leads
      WHERE intent_level = 'low'
        AND nurture_completed = false
        AND nurture_next_at IS NOT NULL
        AND nurture_next_at <= NOW()
      ORDER BY nurture_next_at ASC
      LIMIT 100
    `;

    console.log(`[nurture] Found ${leads.length} leads ready for nurture emails`);

    const results = await Promise.allSettled(
      leads.map(async (lead) => {
        const leadId = lead.id as string;
        const firstName = lead.first_name as string;
        const email = lead.email as string;
        const locale = (lead.locale || "ro") as SupportedLocale;
        const stage = lead.nurture_stage as number;

        try {
          // Send email based on stage
          let nextStage: number;
          let nextDate: Date | null;
          let completed = false;

          if (stage === 1) {
            // Send Email #1
            const html = buildNurtureHtml(1, firstName, email, locale);
            const subject = locale === "ro"
              ? "Ce presupune FIV în România – pași generali"
              : "What IVF involves in Romania – general steps";

            await resend.emails.send({
              from,
              to: email,
              subject,
              html,
            });

            nextStage = 2;
            nextDate = getNextNurtureDate(1);
            console.log(`[nurture] Lead ${leadId}: Sent Email #1, next stage 2 in 7 days`);
          } else if (stage === 2) {
            // Send Email #2
            const html = buildNurtureHtml(2, firstName, email, locale);
            const subject = locale === "ro"
              ? "Când este momentul potrivit pentru a începe FIV?"
              : "When is the right time to start IVF?";

            await resend.emails.send({
              from,
              to: email,
              subject,
              html,
            });

            nextStage = 3;
            nextDate = getNextNurtureDate(2);
            console.log(`[nurture] Lead ${leadId}: Sent Email #2, next stage 3 in 14 days`);
          } else if (stage === 3) {
            // Send Email #3
            const html = buildNurtureHtml(3, firstName, email, locale);
            const subject = locale === "ro"
              ? "Doriți să discutăm opțiunile disponibile?"
              : "Would you like to discuss available options?";

            await resend.emails.send({
              from,
              to: email,
              subject,
              html,
            });

            nextStage = 3;
            nextDate = null;
            completed = true;
            console.log(`[nurture] Lead ${leadId}: Sent Email #3, sequence completed`);
          } else {
            // Invalid stage, mark as completed
            console.warn(`[nurture] Lead ${leadId}: Invalid stage ${stage}, marking as completed`);
            nextStage = stage;
            nextDate = null;
            completed = true;
          }

          // Update lead in database
          await sql`
            UPDATE leads
            SET nurture_stage = ${nextStage},
                nurture_next_at = ${nextDate ? nextDate.toISOString() : null},
                nurture_completed = ${completed},
                updated_at = ${new Date().toISOString()}
            WHERE id = ${leadId}
          `;

          return {
            leadId,
            stage,
            status: "success",
          };
        } catch (err) {
          console.error(`[nurture] Lead ${leadId}: Failed to send email:`, err);
          return {
            leadId,
            stage,
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      }),
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.status === "success").length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      processed: leads.length,
      successful,
      failed,
      results: results.map((r) => (r.status === "fulfilled" ? r.value : { status: "error", error: "Promise rejected" })),
    });
  } catch (err) {
    console.error("[nurture] Cron endpoint error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
