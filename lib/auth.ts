/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { NextAuthRequest } from "next-auth";
import { NextResponse } from 'next/server';

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
        if (token.sub) session.user.id = await hashString(token.sub);
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
    jwt(params) {
      if (params.profile?.sub) params.token.sub = params.profile.sub
      if (params.profile?.name) params.token.name = params.profile.name
      if (params.profile?.email) params.token.email = params.profile.email
      return params.token
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
  handler: (req: NextAuthRequest, ...args: any[]) => Promise<NextResponse|Response>
) => {
  return async (req: NextAuthRequest, ...args: any[]) => {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: "Login Required" },
        { status: 401 }
      );
    }
    req.auth = session;
    return handler(req, ...args);
  };
};
