import { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { ApiWithAuth } from "@/lib/auth";

import Project from "@/models/Project";
import dbConnect from "@/lib/mongodb";
// import type user
export const GET = ApiWithAuth(async (request: NextRequest, session: Session) => {
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const projects = await Project.find({
    user_id: user.id,
  })
    .sort({ _createdAt: -1 })
    .limit(100)
    .lean();
  if (!projects) {
    return NextResponse.json(
      {
        ok: false,
        projects: [],
      },
      { status: 404 }
    );
  }
  return NextResponse.json(
    {
      ok: true,
      projects,
    },
    { status: 200 }
  );
});

/**
 * This API route creates a new project in Hugging Face Spaces.
 * It requires an Authorization header with a valid token and a JSON body with the project details.
 */
export const POST = ApiWithAuth(async (request: NextRequest, session: Session) => {
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { title, html, prompts } = await request.json();

  if (!title || !html) {
    return NextResponse.json(
      { message: "Title and HTML content are required.", ok: false },
      { status: 400 }
    );
  }

  await dbConnect();

  try {
    const newTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .split("-")
      .filter(Boolean)
      .join("-")
      .slice(0, 96);

    const path = `${user.id}/${newTitle}`;
    const project = await Project.create({
      user_id: user.id,
      space_id: path,
      prompts,
      html,
      title: newTitle,
    });
    return NextResponse.json({ project, path, ok: true }, { status: 201 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, ok: false },
      { status: 500 }
    );
  }
});
