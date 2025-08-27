import { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";

import { ApiWithAuth } from "@/lib/auth";
import Project from "@/models/Project";
import dbConnect from "@/lib/mongodb";
import { getPTag } from "@/lib/utils";
import { logInfo } from "@/lib/logger";

export const GET = ApiWithAuth(async (
  request: NextAuthRequest,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  const user = request.auth?.user;

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
  request: NextAuthRequest,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  const user = request.auth?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const param = await params;
  const { namespace, repoId } = param;
  const { htmls, prompts } = await request.json();
  const path = `${namespace}/${repoId}`

  const project = await Project.findOne({
    user_id: user.id,
    space_id: path,
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
    { user_id: user.id, space_id: path },
    {
      $set: {
        prompts,
        htmls
      },
    }
  );

  logInfo(request, "Project update", { path, prompts })
  return NextResponse.json({ ok: true }, { status: 200 });
});

export const POST = ApiWithAuth(async (
  request: NextAuthRequest,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  const user = request.auth?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const param = await params;
  const { namespace, repoId } = param;

  const space_url = `https://huggingface.co/spaces/${namespace}/${repoId}/raw/main/index.html`;

  const response = await fetch(space_url);
  if (!response.ok) {
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
    prompts: ["<Project Import>"],
    title: repoId,
    htmls: [html]
  });

  await newProject.save();

  logInfo(request, "Project import", { path, space_url })
  return NextResponse.json(
    {
      ok: true,
      project: newProject,
      path
    },
    { status: 201 }
  );
});


export const DELETE = ApiWithAuth(async (
  request: NextAuthRequest,
  { params }: { params: { namespace: string; repoId: string } }
) => {
  const user = request.auth?.user;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const param = await params;
  const { namespace, repoId } = param;
  const path = `${namespace}/${repoId}`;

  const result = await Project.deleteOne({
    user_id: user.id,
    space_id: path,
  }).lean();

  if (result.deletedCount === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project not found",
      },
      { status: 404 }
    );
  }

  logInfo(request, "Project delete", { path })
  return NextResponse.json(
    {
      ok: true,
    },
    { status: 200 }
  );
})