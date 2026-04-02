"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { getProjects, type ProjectRead } from "@/lib/api/projects";

function getTitle(pathname: string) {
  if (pathname === "/" || pathname === "") return "Projects";

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "projects") {
    return `Project ${parts[1]}`;
  }

  return "task-collab";
}

function getProjectId(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "projects") return parts[1] ?? null;
  return null;
}

export default function Header() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const projectId = useMemo(() => getProjectId(pathname), [pathname]);

  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!projectId) {
        setProjectName(null);
        return;
      }

      try {
        const list = await getProjects();
        const found = (list as ProjectRead[]).find((p) => p.id === projectId);
        if (!cancelled) setProjectName(found?.name ?? null);
      } catch {
        if (!cancelled) setProjectName(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const shownTitle = projectId ? projectName ?? `Project ${projectId}` : title;

  return (
    <div className="px-4 py-3 md:px-6">
      <h1 className="text-base font-semibold">{shownTitle}</h1>
    </div>
  );
}

