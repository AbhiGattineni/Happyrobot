"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { createProject, getProjects, type ProjectRead } from "@/lib/api/projects";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const list = await getProjects();
      setProjects(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createProject({
        name: trimmedName,
        description: trimmedDescription ? trimmedDescription : null,
      });

      setName("");
      setDescription("");
      await loadProjects();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Projects</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create and open projects. Tasks and comments will be added later.
        </p>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleCreate} className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-zinc-500" htmlFor="name">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="e.g. Website Redesign"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label
              className="text-xs font-medium text-zinc-500"
              htmlFor="description"
            >
              Description
            </label>
            <Input
              id="description"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Project"}
            </Button>
            {loading ? <span className="text-sm text-zinc-500">Loading...</span> : null}
          </div>
        </form>
      </Card>

      {loading && projects.length === 0 ? (
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading projects...
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block"
          >
            <Card className="h-full">
              <div className="font-medium">{project.name}</div>
              {project.description ? (
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </div>
              ) : null}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
