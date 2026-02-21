"use client";

import { useEffect, useState } from "react";

/**
 * Renders a mailto link only after mount so the email is not in the initial HTML
 * (reduces spam harvesting). Display text can be passed or defaults to the email.
 */
export default function ObfuscatedEmail({
  user,
  domain,
  display,
  className,
}: {
  user: string;
  domain: string;
  display?: string;
  className?: string;
}) {
  const [href, setHref] = useState<string | null>(null);
  const email = `${user}@${domain}`;

  useEffect(() => {
    setHref(`mailto:${email}`);
  }, [email]);

  if (!href) {
    return (
      <span className={className} aria-label={email}>
        {display ?? `${user} [at] ${domain.replace(/\./g, " [dot] ")}`}
      </span>
    );
  }

  return (
    <a href={href} className={className} aria-label={display ? email : undefined}>
      {display ?? email}
    </a>
  );
}
