/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { Session } from "next-auth";
import { NextRequest, NextResponse } from 'next/server';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
     {
        id: "einfracz",
        name: "e-INFRA CZ",
        type: "oidc",
        wellKnown: process.env.AUTHORITY_PROD_CONFIG,
        issuer: process.env.AUTHORITY_PROD,
        authorization: { params: { scope: "openid email profile" } },
        checks: ["pkce", "state"],
        clientId: process.env.CLIENT_ID_PROD,
        clientSecret: process.env.CLIENT_SECRET_PROD,
        profile(profile) {
           return {
               id: profile.sub,
               name: profile.name,
               email: profile.email,
           }
        },
     }
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session?.user) {
        session.user.id = await hashString(token.email!);
        session.user.name = token.name!;
        session.user.email = token.email!;
      }
      return session;
    }
  },
});

async function hashString(str: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const ApiWithAuth = (
  handler: (req: NextRequest, session: Session, ...args: any[]) => Promise<NextResponse|Response>
) => {
  return async (req: NextRequest, ...args: any[]) => {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: "Login Required" },
        { status: 401 }
      );
    }
    return handler(req, session, ...args);
  };
};
