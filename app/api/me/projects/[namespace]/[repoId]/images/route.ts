import { NextRequest, NextResponse } from "next/server";
import { RepoDesignation, spaceInfo, uploadFiles } from "@/lib/my-hub";

import { isAuthenticated } from "@/lib/my-auth";
import Project from "@/models/Project";
import dbConnect from "@/lib/mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ namespace: string; repoId: string }> }
) {
  try {
    const user = await isAuthenticated();

    if (user instanceof NextResponse || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const param = await params;
    const { namespace, repoId } = param;

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

    // Parse the FormData to get the images
    const formData = await req.formData();
    const imageFiles = formData.getAll("images") as File[];

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "At least one image file is required under the 'images' key",
        },
        { status: 400 }
      );
    }

    const files: File[] = [];
    for (const file of imageFiles) {
      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid file format - all items under 'images' key must be files",
          },
          { status: 400 }
        );
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          {
            ok: false,
            error: `File ${file.name} is not an image`,
          },
          { status: 400 }
        );
      }

      // Create File object with images/ folder prefix
      const fileName = `images/${file.name}`;
      const processedFile = new File([file], fileName, { type: file.type });
      files.push(processedFile);
    }

    // Upload files to HuggingFace space
    const repo: RepoDesignation = {
      type: "space",
      name: `${namespace}/${repoId}`,
    };

    await uploadFiles({
      repo,
      files,
      accessToken: user.token as string,
      commitTitle: `Upload ${files.length} image(s)`,
    });

    return NextResponse.json({ 
      ok: true, 
      message: `Successfully uploaded ${files.length} image(s) to ${namespace}/${repoId}/images/`,
      uploadedFiles: files.map((file) => `${process.env.NEXT_APP_API_URL}/me/projects/${namespace}/${repoId}/images/${file.name.split('/').pop()}`),
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to upload images",
      },
      { status: 500 }
    );
  }
}
