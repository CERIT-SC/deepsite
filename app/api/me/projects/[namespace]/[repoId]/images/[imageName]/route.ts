import { NextRequest, NextResponse } from "next/server";
import { RepoDesignation, spaceInfo, downloadFile } from "@/lib/my-hub";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ namespace: string; repoId: string, imageName: string }> }
) {
  const param = await params;
  const { namespace, repoId, imageName } = param;

  try {
    const space = await spaceInfo({
      name: namespace + "/" + repoId,
      additionalFields: ["author"],
    });

    if (!space || space.sdk !== "static") {
      return NextResponse.json(
        {
          ok: false,
          error: "Space is not a static space",
        },
        { status: 404 }
      );
    }

    const repo: RepoDesignation = {
      type: "space",
      name: `${namespace}/${repoId}`,
    };

    
    const imageFile = await downloadFile({
      repo,
      path: `images/${imageName}`,
    });

    if (!imageFile) {
        return NextResponse.json(
            { error: "Image not found", ok: false },
            { status: 404 }
        );
    }

    return new NextResponse(imageFile, {
      status: 200
    });

  } catch (error: any) {
    if (error.statusCode === 404) {
      return NextResponse.json(
        { error: "Space not found", ok: false },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message, ok: false },
      { status: 500 }
    );
  }
}
