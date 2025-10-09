"use server";

import { isAuthenticated } from "@/lib/my-auth";
import { NextResponse } from "next/server";
import { listSpaces } from "@/lib/my-hub";
import { ProjectType } from "@/types";

export async function getProjects(): Promise<{
  ok: boolean;
  projects: ProjectType[];
  isEmpty?: boolean;
}> {
  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return {
      ok: false,
      projects: [],
    };
  }

  const projects = [];
  for await (const space of listSpaces({
    accessToken: user.token as string,
    additionalFields: ["author", "cardData"],
    search: {
      owner: user.name,
    }
  })) {
    if (
      !space.private &&
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

  return {
    ok: true,
    projects,
  };
}
