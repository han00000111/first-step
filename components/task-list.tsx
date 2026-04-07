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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">当前任务</h2>
            <p className="mt-1 text-sm text-zinc-500">
              这里展示所有活跃任务，以及它们当前的提醒状态。
            </p>
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {activeTasks.length} 条
          </div>
        </div>

        {activeTasks.length > 0 ? (
          activeTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 p-8 text-sm leading-7 text-zinc-500">
            还没有任务。先去首页录入一句任务，系统就会生成 parsedAction 和下一次提醒时间。
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">已归档</h2>
            <p className="mt-1 text-sm text-zinc-500">
              归档任务会保留记录，但不再参与后续提醒。
            </p>
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {archivedTasks.length} 条
          </div>
        </div>

        {archivedTasks.length > 0 ? (
          archivedTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 p-8 text-sm leading-7 text-zinc-500">
            当前还没有归档任务。
          </div>
        )}
      </section>
    </div>
  );
}
