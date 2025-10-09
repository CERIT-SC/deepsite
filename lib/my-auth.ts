/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from "@/types";
import NextAuth, {NextAuthRequest} from "next-auth";
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
        style: {
          logo: "https://www.e-infra.cz/img/logo.svg"
        },
        profile(profile) {
           return {
               id: profile.sub,
               name: profile.preferred_username,
               email: profile.email,
           }
        },
     }
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session?.user) {
        if (token.sub) session.user.id = await hashString(token.sub);
        if (token.name) session.user.name = token.name.replace(/\s+/g, '-').trim();
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
    jwt(params) {
      if (params.profile?.sub) params.token.sub = params.profile.sub
      if (params.profile?.name) params.token.name = params.profile.preferred_username
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

type UserResponse = User & { token: string };

export const isAuthenticated = async (): Promise<UserResponse | NextResponse<unknown> | undefined> => {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Wrong castle fam :(",
      },
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const user = {
    fullname: session.user.name as string,
    avatarUrl: "https://ui-avatars.com/api/?name=" + encodeURIComponent(session.user.name as string),
    name: session.user.name as string,
    isPro: true,
    id: session.user.id as string,
  }
  return {
    ...user,
    token: "DUMMY_TOKEN"
  }
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
