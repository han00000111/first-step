import type { TaskListItem } from "@/lib/task-service";

import { TaskCard } from "@/components/task-card";

type TaskListProps = {
  activeTasks: TaskListItem[];
  archivedTasks: TaskListItem[];
};

export function TaskList({ activeTasks, archivedTasks }: TaskListProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">当前任务</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              保留任务上下文和提醒状态，但不强迫用户先做复杂计划。
            </p>
          </div>
          <div className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {activeTasks.length} 条
          </div>
        </div>

        {activeTasks.length > 0 ? (
          activeTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/72 p-6 text-sm leading-7 text-zinc-500">
            还没有任务。先去首页录入一句任务，系统就会生成推荐的第一步和下一次提醒时间。
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">已归档</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              归档任务会保留记录，但不会继续参与后续提醒。
            </p>
          </div>
          <div className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {archivedTasks.length} 条
          </div>
        </div>

        {archivedTasks.length > 0 ? (
          archivedTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/72 p-6 text-sm leading-7 text-zinc-500">
            当前还没有归档任务。
          </div>
        )}
      </section>
    </div>
  );
}
