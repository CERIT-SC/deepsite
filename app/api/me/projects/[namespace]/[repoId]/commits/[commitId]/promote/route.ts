import { NextRequest, NextResponse } from "next/server";
import { RepoDesignation, listFiles, spaceInfo, uploadFiles, deleteFiles, downloadFile } from "@/lib/my-hub";

import { isAuthenticated } from "@/lib/my-auth";
import { Page } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { 
    params: Promise<{ 
      namespace: string; 
      repoId: string; 
      commitId: string; 
    }> 
  }
) {
  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const param = await params;
  const { namespace, repoId, commitId } = param;

  try {
    const repo: RepoDesignation = {
      type: "space",
      name: `${namespace}/${repoId}`,
    };

    const space = await spaceInfo({
      name: `${namespace}/${repoId}`,
      accessToken: user.token as string,
      additionalFields: ["author"],
    });

    if (!space || space.sdk !== "static") {
      return NextResponse.json(
        { ok: false, error: "Space is not a static space." },
        { status: 404 }
      );
    }
    
    if (space.author !== user.name) {
      return NextResponse.json(
        { ok: false, error: "Space does not belong to the authenticated user." },
        { status: 403 }
      );
    }

    // Fetch files from the specific commit
    const files: File[] = [];
    const pages: Page[] = [];
    const allowedExtensions = ["html", "md", "css", "js", "json", "txt"];
    const commitFilePaths: Set<string> = new Set();
    
    // Get all files from the specific commit
    for await (const fileInfo of listFiles({
      repo,
      accessToken: user.token as string,
      revision: commitId,
    })) {
      const fileExtension = fileInfo.path.split('.').pop()?.toLowerCase();
      
      if (allowedExtensions.includes(fileExtension || "")) {
        commitFilePaths.add(fileInfo.path);
        
        // Fetch the file content from the specific commit
        // const response = await fetch(
        //   `https://huggingface.co/spaces/${namespace}/${repoId}/raw/${commitId}/${fileInfo.path}`
        // );
        
        const response = await downloadFile({
          repo,
          path: fileInfo.path,
          revision: commitId,
        });

        if (response) {
          const content = await response.text();
          let mimeType = "text/plain";
          
          switch (fileExtension) {
            case "html":
              mimeType = "text/html";
              // Add HTML files to pages array for client-side setPages
              pages.push({
                path: fileInfo.path,
                html: content,
              });
              break;
            case "css":
              mimeType = "text/css";
              break;
            case "js":
              mimeType = "application/javascript";
              break;
            case "json":
              mimeType = "application/json";
              break;
            case "md":
              mimeType = "text/markdown";
              break;
          }
          
          const file = new File([content], fileInfo.path, { type: mimeType });
          files.push(file);
        }
      }
    }

    // Get files currently in main branch to identify files to delete
    const mainBranchFilePaths: Set<string> = new Set();
    for await (const fileInfo of listFiles({
      repo,
      accessToken: user.token as string,
      revision: "main",
    })) {
      const fileExtension = fileInfo.path.split('.').pop()?.toLowerCase();
      
      if (allowedExtensions.includes(fileExtension || "")) {
        mainBranchFilePaths.add(fileInfo.path);
      }
    }

    // Identify files to delete (exist in main but not in commit)
    const filesToDelete: string[] = [];
    for (const mainFilePath of mainBranchFilePaths) {
      if (!commitFilePaths.has(mainFilePath)) {
        filesToDelete.push(mainFilePath);
      }
    }

    if (files.length === 0 && filesToDelete.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No files found in the specified commit and no files to delete" },
        { status: 404 }
      );
    }

    // Delete files that exist in main but not in the commit being promoted
    if (filesToDelete.length > 0) {
      await deleteFiles({
        repo,
        paths: filesToDelete,
        accessToken: user.token as string,
        commitTitle: `Removed files from promoting ${commitId.slice(0, 7)}`,
        commitDescription: `Removed files that don't exist in commit ${commitId}:\n${filesToDelete.map(path => `- ${path}`).join('\n')}`,
      });
    }

    // Upload the files to the main branch with a promotion commit message
    if (files.length > 0) {
      await uploadFiles({
        repo,
        files,
        accessToken: user.token as string,
        commitTitle: `Promote version ${commitId.slice(0, 7)} to main`,
        commitDescription: `Promoted commit ${commitId} to main branch`,
      });
    }

    return NextResponse.json(
      { 
        ok: true, 
        message: "Version promoted successfully",
        promotedCommit: commitId,
        pages: pages,
      },
      { status: 200 }
    );

  } catch (error: any) {
    
    // Handle specific HuggingFace API errors
    if (error.statusCode === 404) {
      return NextResponse.json(
        { ok: false, error: "Commit not found" },
        { status: 404 }
      );
    }
    
    if (error.statusCode === 403) {
      return NextResponse.json(
        { ok: false, error: "Access denied to repository" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { ok: false, error: error.message || "Failed to promote version" },
      { status: 500 }
    );
  }
}
