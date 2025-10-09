import { isAuthenticated } from "@/lib/my-auth";
import { downloadFile, RepoDesignation } from "@/lib/my-hub";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { 
    params: Promise<{ 
      namespace: string; 
      repoId: string; 
      commitId: string; 
      path?: string[] 
    }> 
  }
): Promise<NextResponse> {
  const { namespace, repoId, commitId, path } = await params;

  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let actualPath = (path || ["index.html"]).join("/")

  const extension = actualPath.split(".").pop()

  if (extension !== "html") {
    return new NextResponse("Invalid file", { status: 400 })
  }

  const repo: RepoDesignation = {
    type: "space",
    name: `${namespace}/${repoId}`,
  };
  
  const file = await downloadFile({
    repo,
    path: actualPath,
    revision: commitId,
  });

  const html = await file?.text() || ""

  return new NextResponse(html, { headers: {
    "Content-Type": "text/html"
  }});
}
