"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackThankYouPageView } from "@/lib/analytics";

interface ThankYouClientProps {
  locale: string;
}

/**
 * Client-side analytics for the thank-you page.
 *
 * When a lead is submitted, the form can optionally redirect here
 * with ?lead_id=xxx for URL-based Google Ads conversion tracking.
 * The page view event fires once on mount.
 */
export default function ThankYouClient({ locale }: ThankYouClientProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const leadId = searchParams.get("lead_id") || "unknown";
    trackThankYouPageView({ locale, lead_id: leadId });
  }, [locale, searchParams]);

  return null;
}
