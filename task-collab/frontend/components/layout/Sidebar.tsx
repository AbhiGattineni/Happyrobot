"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getProjects, type ProjectRead } from "@/lib/api/projects";

export default function Sidebar() {
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await getProjects();
        if (!cancelled) setProjects(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load projects.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="text-lg font-semibold">task-collab</div>

      <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-2" aria-label="Sidebar">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Projects
        </div>

        <div className="mt-2">
          <Link
            href="/"
            className="block w-full rounded border border-zinc-200 bg-white/60 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white dark:bg-black/10 dark:text-zinc-100 dark:border-zinc-800"
          >
            All projects
          </Link>
        </div>

        {error ? (
          <div className="text-sm text-red-700 dark:text-red-200">{error}</div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading...
            </div>
          ) : null}

          {!loading && projects.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              No projects yet.
            </div>
          ) : null}

          {!loading
            ? projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block w-full rounded border border-zinc-200 bg-white/60 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white dark:bg-black/10 dark:text-zinc-100 dark:border-zinc-800"
                >
                  {project.name}
                </Link>
              ))
            : null}
        </div>
      </nav>
    </div>
  );
}

