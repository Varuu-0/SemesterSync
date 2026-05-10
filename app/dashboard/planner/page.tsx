"use client";

import { useState } from "react";
import type { StudyPlanNode } from "@/lib/types";

export default function PlannerPage() {
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<StudyPlanNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!goal.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        plan?: StudyPlanNode[];
      };
      if (!res.ok) throw new Error(json.error ?? "Planner request failed");
      setPlan(json.plan ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Agentic Planner</h1>
        <p className="mt-1 text-sm text-ink-600">
          Generate a recursive study plan breakdown from your semester context.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Build me a 10-day study plan for finals"
            className="flex-1 rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={generate}
            disabled={busy || !goal.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-60"
          >
            {busy ? "Generating..." : "Generate Plan"}
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        {plan.length === 0 ? (
          <div className="text-sm text-ink-500">
            No plan yet. Enter a goal and generate a tree.
          </div>
        ) : (
          <ul className="space-y-2">
            {plan.map((node, idx) => (
              <PlanNode key={`${node.title}-${idx}`} node={node} depth={0} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PlanNode({ node, depth }: { node: StudyPlanNode; depth: number }) {
  return (
    <li className="space-y-2">
      <div
        className="rounded-lg border border-ink-200 bg-ink-50/40 p-3"
        style={{ marginLeft: `${depth * 14}px` }}
      >
        <div className="text-sm font-medium text-ink-900">{node.title}</div>
        {(node.estimateMinutes || node.reason) && (
          <div className="mt-1 text-xs text-ink-600">
            {node.estimateMinutes ? `${node.estimateMinutes} min` : ""}
            {node.estimateMinutes && node.reason ? " · " : ""}
            {node.reason ?? ""}
          </div>
        )}
      </div>
      {(node.children ?? []).length > 0 && (
        <ul className="space-y-2">
          {node.children?.map((child, idx) => (
            <PlanNode key={`${child.title}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
