import { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { ApiWithAuth } from "@/lib/auth";
import Project from "@/models/Project";
import dbConnect from "@/lib/mongodb";
import { getPTag } from "@/lib/utils";

export const GET = ApiWithAuth(async (
  req: NextRequest,
  session: Session,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const param = await params;
  const { namespace, repoId } = param;

  const project = await Project.findOne({
    user_id: user.id,
    space_id: `${namespace}/${repoId}`,
  }).lean();
  if (!project) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project not found",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      project: {
        ...project,
      },
      ok: true,
    },
    { status: 200 }
  );
});

export const PUT = ApiWithAuth(async (
  req: NextRequest,
  session: Session,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const param = await params;
  const { namespace, repoId } = param;
  const { html, prompts } = await req.json();

  const project = await Project.findOne({
    user_id: user.id,
    space_id: `${namespace}/${repoId}`,
  }).lean();
  if (!project) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project not found",
      },
      { status: 404 }
    );
  }

  await Project.updateOne(
    { user_id: user.id, space_id: `${namespace}/${repoId}` },
    {
      $set: {
        prompts: [
          ...(project && "prompts" in project ? project.prompts : []),
          ...prompts,
        ],
        html
      },
    }
  );
  return NextResponse.json({ ok: true }, { status: 200 });
});

export const POST = ApiWithAuth(async (
  req: NextRequest,
  session: Session,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  // session is now available
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const param = await params;
  const { namespace, repoId } = param;

  const space_url = `https://huggingface.co/spaces/${namespace}/${repoId}/raw/main/index.html`;

  const response = await fetch(space_url);
  if (!response.ok) {
    console.log(await response.text())
    console.log(space_url)
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch space HTML",
      },
      { status: 404 }
    );
  }
  let html = await response.text();
  html = html.replace(getPTag(namespace + "/" + repoId), "");

  const path = `${user.id}/${repoId}`;
  const project = await Project.findOne({
    user_id: user.id,
    space_id: path
  }).lean();
  if (project) {
    // redirect to the project page if it already exists
    return NextResponse.json(
      {
        ok: false,
        error: "Project already exists",
        redirect: `/projects/${user.id}/${repoId}`,
      },
      { status: 400 }
    );
  }

  const newProject = new Project({
    user_id: user.id,
    space_id: path,
    prompts: [],
    title: repoId,
    html
  });

  await newProject.save();
  return NextResponse.json(
    {
      ok: true,
      project: newProject,
      path
    },
    { status: 201 }
  );
});
