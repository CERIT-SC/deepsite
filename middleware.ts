import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  
  // If not logged in, redirect to login/signin
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/api/auth/signin', req.url));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth/|_next/static|_next/image|favicon.ico|providers/logo.svg).*)"],
};
