import { NextRequest, NextResponse } from "next/server";
import { RepoDesignation, createRepo, listCommits, spaceInfo, uploadFiles } from "@/lib/my-hub";

import { isAuthenticated } from "@/lib/my-auth";
import { Commit, Page } from "@/types";
import { COLORS } from "@/lib/utils";

export async function POST(
  req: NextRequest,
) {
  const user = await isAuthenticated();
  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { title: titleFromRequest, pages, prompt } = await req.json();

  const title = titleFromRequest ?? "DeepSite Project";

  const formattedTitle = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .split("-")
  .filter(Boolean)
  .join("-")
  .slice(0, 96);

  const repo: RepoDesignation = {
    type: "space",
    name: `${user.name}/${formattedTitle}`,
  };
  const colorFrom = COLORS[Math.floor(Math.random() * COLORS.length)];
  const colorTo = COLORS[Math.floor(Math.random() * COLORS.length)];
  const README = `---
title: ${title}
colorFrom: ${colorFrom}
colorTo: ${colorTo}
emoji: 🐳
sdk: static
pinned: false
tags:
  - deepsite-v3
---

# Welcome to your new DeepSite project!
This project was created with [DeepSite](https://deepsite.hf.co).
`;

  const files: File[] = [];
  const readmeFile = new File([README], "README.md", { type: "text/markdown" });
  files.push(readmeFile);
  pages.forEach((page: Page) => {
    const file = new File([page.html], page.path, { type: "text/html" });
    files.push(file);
  });

  try {
    const { repoUrl} = await createRepo({
      repo,
      accessToken: user.token as string,
    });
    const commitTitle = !prompt || prompt.trim() === "" ? "Redesign my website" : prompt;
    await uploadFiles({
      repo,
      files,
      accessToken: user.token as string,
      commitTitle
    });

    const path = repoUrl.split("/").slice(-2).join("/");

    const commits: Commit[] = [];
    for await (const commit of listCommits({ repo, accessToken: user.token as string })) {
      if (commit.title.includes("initial commit") || commit.title.includes("image(s)") || commit.title.includes("Promote version")) {
        continue;
      }
      commits.push({
        title: commit.title,
        oid: commit.oid,
        date: commit.date,
      });
    }

    const space = await spaceInfo({
      name: repo.name,
      accessToken: user.token as string,
    });

    let newProject = {
      files,
      pages,
      commits,
      project: {
        id: space.id,
        space_id: space.name,
        _updatedAt: space.updatedAt,
      }
    }
    
    return NextResponse.json({ space: newProject, path, ok: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, ok: false },
      { status: 500 }
    );
  }
}