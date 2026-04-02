import ProjectDetailClient from "@/components/projects/ProjectDetailClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }> | { projectId: string };
}) {
  const resolvedParams = await params;
  return <ProjectDetailClient projectId={resolvedParams.projectId} />;
}

