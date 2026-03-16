import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  { pages: { signIn: "/login" } }
);

export const config = {
  matcher: ["/dashboard/:path*", "/cotizaciones/:path*", "/admin/:path*"],
};
