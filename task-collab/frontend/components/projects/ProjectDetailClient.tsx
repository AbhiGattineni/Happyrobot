"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  createTask,
  deleteTask,
  getTasksByProject,
  updateTask,
  type TaskRead,
  type TaskStatus,
} from "@/lib/api/tasks";
import { getProjects, type ProjectRead } from "@/lib/api/projects";
import {
  createComment,
  getCommentsByTask,
  type CommentRead,
} from "@/lib/api/comments";
import { connectProjectRealtime } from "@/lib/websocket/client";

function statusLabel(status: TaskStatus) {
  return status === "IN_PROGRESS" ? "IN PROGRESS" : status;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TASK_PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 5;

export default function ProjectDetailClient({
  projectId,
}: {
  projectId?: string;
}) {
  const trimmedProjectId = (projectId ?? "").trim();
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const taskPageRef = useRef(0);
  const tasksRef = useRef<TaskRead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTaskIdRef = useRef<string | null>(null);
  const [comments, setComments] = useState<CommentRead[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentPage, setCommentPage] = useState(0);
  const commentPageRef = useRef(0);
  const commentsRef = useRef<CommentRead[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  const projectIdValid =
    trimmedProjectId !== "" && trimmedProjectId !== "undefined" && UUID_RE.test(trimmedProjectId);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => {
    taskPageRef.current = taskPage;
  }, [taskPage]);

  useEffect(() => {
    commentPageRef.current = commentPage;
  }, [commentPage]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    setTaskPage(0);
  }, [trimmedProjectId]);

  useEffect(() => {
    if (!projectIdValid) {
      setTasks([]);
      setTaskTotal(0);
      setError("Invalid project id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const offset = taskPage * TASK_PAGE_SIZE;
        const res = await getTasksByProject(trimmedProjectId, {
          limit: TASK_PAGE_SIZE,
          offset,
        });
        if (cancelled) return;
        setTasks(res.items);
        setTaskTotal(res.total);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tasks.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectIdValid, trimmedProjectId, taskPage]);

  useEffect(() => {
    if (!projectIdValid || loading) return;
    const maxPage = Math.max(0, Math.ceil(taskTotal / TASK_PAGE_SIZE) - 1);
    if (taskPage > maxPage) setTaskPage(maxPage);
  }, [projectIdValid, loading, taskTotal, taskPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectName() {
      if (!projectIdValid) {
        setProjectName("");
        return;
      }

      try {
        const list = await getProjects();
        const found = (list as ProjectRead[]).find(
          (p) => p.id === trimmedProjectId,
        );
        if (!cancelled) setProjectName(found?.name ?? "");
      } catch {
        if (!cancelled) setProjectName("");
      }
    }

    loadProjectName();

    return () => {
      cancelled = true;
    };
  }, [projectIdValid, trimmedProjectId]);

  useEffect(() => {
    if (!projectIdValid) return;

    const disconnect = connectProjectRealtime(trimmedProjectId, {
      onEvent(ev) {
        if (ev.project_id !== trimmedProjectId) return;

        switch (ev.type) {
          case "TASK_CREATED": {
            const p = ev.payload;
            const title = p.title;
            const statusStr = p.status;
            const priorityVal = p.priority;
            if (
              typeof title !== "string" ||
              typeof statusStr !== "string" ||
              typeof priorityVal !== "string"
            ) {
              break;
            }
            if (tasksRef.current.some((t) => t.id === ev.entity_id)) {
              break;
            }
            setTaskTotal((t) => t + 1);
            if (taskPageRef.current !== 0) break;
            const newTask: TaskRead = {
              id: ev.entity_id,
              project_id: ev.project_id,
              title,
              status: statusStr as TaskStatus,
              priority: priorityVal,
              assigned_to_json: null,
              description: null,
              tags_json: null,
              custom_fields_json: null,
              version: 1,
              created_at: ev.timestamp,
              updated_at: ev.timestamp,
            };
            setTasks((prev) =>
              [newTask, ...prev].slice(0, TASK_PAGE_SIZE),
            );
            break;
          }
          case "TASK_UPDATED": {
            const p = ev.payload;
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id !== ev.entity_id) return t;
                const next = { ...t };
                if (typeof p.title === "string") next.title = p.title;
                if (typeof p.status === "string")
                  next.status = p.status as TaskStatus;
                if (typeof p.priority === "string") next.priority = p.priority;
                next.updated_at = ev.timestamp;
                return next;
              }),
            );
            break;
          }
          case "TASK_DELETED": {
            setTasks((prev) => prev.filter((t) => t.id !== ev.entity_id));
            setTaskTotal((t) => Math.max(0, t - 1));
            setSelectedTaskId((sid) => (sid === ev.entity_id ? null : sid));
            break;
          }
          case "COMMENT_CREATED": {
            const taskId =
              typeof ev.payload.task_id === "string"
                ? ev.payload.task_id
                : "";
            const author =
              typeof ev.payload.author === "string" ? ev.payload.author : "";
            const content =
              typeof ev.payload.content === "string" ? ev.payload.content : "";
            const createdAt =
              typeof ev.payload.created_at === "string"
                ? ev.payload.created_at
                : ev.timestamp;
            if (taskId && taskId === selectedTaskIdRef.current) {
              if (commentsRef.current.some((c) => c.id === ev.entity_id)) {
                break;
              }
              setCommentTotal((t) => t + 1);
              if (commentPageRef.current === 0) {
                setComments((prev) =>
                  [
                    {
                      id: ev.entity_id,
                      task_id: taskId,
                      content,
                      author,
                      created_at: createdAt,
                    },
                    ...prev,
                  ].slice(0, COMMENT_PAGE_SIZE),
                );
              }
            }
            break;
          }
          default:
            break;
        }
      },
    });

    return disconnect;
  }, [projectIdValid, trimmedProjectId]);

  useEffect(() => {
    if (!selectedTaskId) {
      setComments([]);
      setCommentTotal(0);
      setCommentsError(null);
      setCommentsLoading(false);
      return;
    }

    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError(null);

    (async () => {
      try {
        const offset = commentPage * COMMENT_PAGE_SIZE;
        const res = await getCommentsByTask(selectedTaskId, {
          limit: COMMENT_PAGE_SIZE,
          offset,
        });
        if (cancelled) return;
        setComments(res.items);
        setCommentTotal(res.total);
      } catch (e) {
        if (!cancelled) {
          setCommentsError(
            e instanceof Error ? e.message : "Failed to load comments.",
          );
        }
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTaskId, commentPage]);

  useEffect(() => {
    if (!selectedTaskId || commentsLoading) return;
    const maxPage = Math.max(0, Math.ceil(commentTotal / COMMENT_PAGE_SIZE) - 1);
    if (commentPage > maxPage) setCommentPage(maxPage);
  }, [selectedTaskId, commentsLoading, commentTotal, commentPage]);

  const statusOptions: TaskStatus[] = useMemo(
    () => ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"],
    [],
  );

  const priorityOptions = useMemo(
    () => [
      { value: "P0", label: "P0" },
      { value: "P1", label: "P1" },
      { value: "P2", label: "P2" },
      { value: "P3", label: "P3" },
    ],
    [],
  );

  const statusSelectOptions = useMemo(
    () =>
      statusOptions.map((s) => ({
        value: s,
        label: statusLabel(s),
      })),
    [statusOptions],
  );

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<string>("P2");
  const [creating, setCreating] = useState<boolean>(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!projectIdValid) {
      setError("Invalid project id.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedPriority = priority.trim();

    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }
    if (!trimmedPriority) {
      setError("Priority is required.");
      return;
    }

    setCreating(true);
    try {
      await createTask(trimmedProjectId, {
        title: trimmedTitle,
        status: "TODO",
        priority: trimmedPriority,
        description: description.trim() ? description.trim() : null,
      });

      setTitle("");
      setDescription("");
      setPriority("P2");
      setTaskPage(0);
      const res = await getTasksByProject(trimmedProjectId, {
        limit: TASK_PAGE_SIZE,
        offset: 0,
      });
      setTasks(res.items);
      setTaskTotal(res.total);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create task.");
    } finally {
      setCreating(false);
    }
  }

  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  async function handleUpdateStatus(taskId: string, newStatus: TaskStatus) {
    setError(null);
    setSuccessMessage(null);
    setUpdatingTaskId(taskId);
    try {
      await updateTask(taskId, { status: newStatus });
      const res = await getTasksByProject(trimmedProjectId, {
        limit: TASK_PAGE_SIZE,
        offset: taskPage * TASK_PAGE_SIZE,
      });
      setTasks(res.items);
      setTaskTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update task.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  async function handleDelete(taskId: string) {
    setError(null);
    setSuccessMessage(null);
    setDeletingTaskId(taskId);
    try {
      await deleteTask(taskId);
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
        setComments([]);
        setCommentTotal(0);
        setCommentsError(null);
      }
      const res = await getTasksByProject(trimmedProjectId, {
        limit: TASK_PAGE_SIZE,
        offset: taskPage * TASK_PAGE_SIZE,
      });
      setTasks(res.items);
      setTaskTotal(res.total);
      setSuccessMessage("Task deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  }

  function selectTask(id: string) {
    setSelectedTaskId(id);
    setCommentPage(0);
  }

  const taskRangeStart = taskTotal === 0 ? 0 : taskPage * TASK_PAGE_SIZE + 1;
  const taskRangeEnd = Math.min(taskTotal, (taskPage + 1) * TASK_PAGE_SIZE);
  const commentRangeStart =
    commentTotal === 0 ? 0 : commentPage * COMMENT_PAGE_SIZE + 1;
  const commentRangeEnd = Math.min(
    commentTotal,
    (commentPage + 1) * COMMENT_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-sm font-semibold">
              {projectName || "Project"}
            </h1>
            <p className="mt-0.5 text-xs font-mono text-zinc-600 dark:text-zinc-400">
              ID: {projectIdValid ? trimmedProjectId : ""}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage tasks for this project.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {successMessage ? (
            <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Create task</h2>
            <form onSubmit={handleCreate} className="grid gap-3">
              <div className="grid gap-1.5">
                <label
                  className="text-xs font-medium text-zinc-500"
                  htmlFor="task-title"
                >
                  Title
                </label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  placeholder="e.g. Implement auth flow"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label
                  className="text-xs font-medium text-zinc-500"
                  htmlFor="task-description"
                >
                  Description
                </label>
                <Input
                  id="task-description"
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="grid gap-1.5">
                <label
                  className="text-xs font-medium text-zinc-500"
                  htmlFor="task-priority"
                >
                  Priority
                </label>
                <Select
                  value={priority as "P0" | "P1" | "P2" | "P3"}
                  options={priorityOptions}
                  onChange={(v) => setPriority(v)}
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
                {loading ? (
                  <span className="text-sm text-zinc-500">Loading...</span>
                ) : null}
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Tasks</h2>

            {loading && tasks.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading tasks...
              </div>
            ) : null}

            {!loading && taskTotal === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                No tasks yet.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className={[
                    "cursor-pointer p-3",
                    selectedTaskId === task.id ? "border-blue-500" : "",
                  ].join(" ")}
                  onClick={() => selectTask(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      selectTask(task.id);
                    }
                  }}
                >
                  <div className="space-y-2">
                    <div className="font-medium">{task.title}</div>

                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Status:
                      </span>{" "}
                      {statusLabel(task.status)}
                    </div>

                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Priority:
                      </span>{" "}
                      {task.priority}
                    </div>

                    <div className="grid gap-1.5">
                      <label
                        className="text-xs font-medium text-zinc-500"
                        htmlFor={`status-${task.id}`}
                      >
                        Update status
                      </label>
                      <Select
                        value={task.status}
                        options={statusSelectOptions}
                        disabled={
                          updatingTaskId === task.id ||
                          deletingTaskId === task.id
                        }
                        onChange={(v) => handleUpdateStatus(task.id, v)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={deletingTaskId === task.id}
                        onClick={() => handleDelete(task.id)}
                      >
                        {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {taskTotal > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <span className="text-xs text-zinc-500">
                  {taskRangeStart}–{taskRangeEnd} of {taskTotal}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || taskPage === 0}
                    onClick={() => setTaskPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      loading ||
                      (taskPage + 1) * TASK_PAGE_SIZE >= taskTotal
                    }
                    onClick={() => setTaskPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Comments</h2>

            {!selectedTaskId ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Select a task to view and add comments.
              </div>
            ) : null}

            {selectedTaskId && commentsError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                {commentsError}
              </div>
            ) : null}

            {selectedTaskId && commentsLoading && comments.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading comments...
              </div>
            ) : null}

            {selectedTaskId &&
            !commentsLoading &&
            commentTotal === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                No comments yet.
              </div>
            ) : null}

            {selectedTaskId && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => {
                  const ts = new Date(comment.created_at);
                  const timestamp = Number.isNaN(ts.getTime())
                    ? comment.created_at
                    : ts.toLocaleString();

                  return (
                    <div
                      key={comment.id}
                      className="rounded border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-black/10"
                    >
                      <div className="text-sm font-medium">{comment.author}</div>
                      <div className="text-xs text-zinc-500">
                        {timestamp}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm">
                        {comment.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {selectedTaskId && commentTotal > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <span className="text-xs text-zinc-500">
                  {commentRangeStart}–{commentRangeEnd} of {commentTotal}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={commentsLoading || commentPage === 0}
                    onClick={() =>
                      setCommentPage((p) => Math.max(0, p - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      commentsLoading ||
                      (commentPage + 1) * COMMENT_PAGE_SIZE >=
                        commentTotal
                    }
                    onClick={() => setCommentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedTaskId ? (
              <form
                className="mt-5 grid gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCommentsError(null);

                  const trimmedContent = newCommentContent.trim();
                  if (!trimmedContent) return;

                  try {
                    const created = await createComment(selectedTaskId, {
                      content: trimmedContent,
                      author: "You",
                    });
                    setNewCommentContent("");
                    setCommentTotal((t) => t + 1);
                    if (commentPageRef.current === 0) {
                      setComments((prev) => {
                        if (prev.some((c) => c.id === created.id)) return prev;
                        return [created, ...prev].slice(
                          0,
                          COMMENT_PAGE_SIZE,
                        );
                      });
                    }
                  } catch (e2) {
                    setCommentsError(
                      e2 instanceof Error
                        ? e2.message
                        : "Failed to create comment.",
                    );
                  }
                }}
              >
                <label
                  className="text-xs font-medium text-zinc-500"
                  htmlFor="new-comment"
                >
                  Add comment
                </label>
                <Input
                  id="new-comment"
                  value={newCommentContent}
                  onChange={(ev) => setNewCommentContent(ev.target.value)}
                  placeholder="Write a comment..."
                  required
                />
                <div className="flex items-center gap-3 pt-1">
                  <Button type="submit">Submit</Button>
                  {commentsLoading ? (
                    <span className="text-sm text-zinc-500">...</span>
                  ) : null}
                </div>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

