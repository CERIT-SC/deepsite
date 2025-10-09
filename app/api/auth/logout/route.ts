import { NextResponse } from "next/server";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";
import { signOut } from "@/lib/my-auth";

export async function POST() {
  await signOut({redirect: false})

  return NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );
}
