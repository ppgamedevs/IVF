import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except API routes, admin routes, static files, and Next.js internals
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
