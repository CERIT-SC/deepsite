import { ApiWithAuth, isAuthenticated } from "@/lib/my-auth";
import { listSpaces } from "@/lib/my-hub";
import { User } from "@/types";
import { NextAuthRequest } from "next-auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const isAuth = await isAuthenticated();

  if (isAuth instanceof NextResponse || !isAuth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  
  const user: User = isAuth;
  const token = isAuth.token;

  const projects = [];
  for await (const space of listSpaces({
    accessToken: token.replace("Bearer ", "") as string,
    additionalFields: ["author", "cardData"],
    search: {
      owner: user.name,
    }
  })) {
    if (
      space.sdk === "static" &&
      Array.isArray((space.cardData as { tags?: string[] })?.tags) &&
      (
        ((space.cardData as { tags?: string[] })?.tags?.includes("deepsite-v3")) ||
        ((space.cardData as { tags?: string[] })?.tags?.includes("deepsite"))
      )
    ) {
      projects.push(space);
    }
  }

  return NextResponse.json({ user, projects, errCode: null }, { status: 200 });
}
