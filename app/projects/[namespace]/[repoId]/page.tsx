import { redirect } from "next/navigation";

import { AppEditor } from "@/components/editor";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { auth } from "@/lib/auth";

async function getProjectForUser(
  userId: string,
  namespace: string,
  repoId: string
) {
  await dbConnect();
  
  const project = await Project.findOne({
    space_id: `${namespace}/${repoId}`,
    user_id: userId
  }).lean();

  return project ? JSON.parse(JSON.stringify(project)) : null;
}

export default async function ProjectNamespacePage({
  params,
}: {
  params: Promise<{ namespace: string; repoId: string }>;
}) {
  const { namespace, repoId } = await params;
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/projects")
  }

  const project = await getProjectForUser(session.user.id, namespace, repoId);

  if (!project?.htmls) {
    redirect("/projects");
  }
  return <AppEditor project={project} />;
}
