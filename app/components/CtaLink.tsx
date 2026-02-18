"use client";

import { trackCtaClick } from "@/lib/analytics";

interface CtaLinkProps {
  href: string;
  location: string;
  className?: string;
  children: React.ReactNode;
}

export default function CtaLink({ href, location, className, children }: CtaLinkProps) {
  return (
    <a
      href={href}
      onClick={() => trackCtaClick(location)}
      className={className}
    >
      {children}
    </a>
  );
}
