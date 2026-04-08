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
              把现在要处理的事放在眼前，按需要编辑、提醒或归档就够了。
            </p>
          </div>
          <div className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {activeTasks.length} 条
          </div>
        </div>

        {activeTasks.length > 0 ? (
          activeTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[24px] border border-dashed border-zinc-200 bg-white/72 p-5 text-sm leading-6 text-zinc-500 sm:p-6 sm:leading-7">
            还没有任务。先去首页记下一句想开始的事。
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">已归档</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              先收起来，之后需要时再回来翻看。
            </p>
          </div>
          <div className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {archivedTasks.length} 条
          </div>
        </div>

        {archivedTasks.length > 0 ? (
          archivedTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-[24px] border border-dashed border-zinc-200 bg-white/72 p-5 text-sm leading-6 text-zinc-500 sm:p-6 sm:leading-7">
            当前还没有归档任务。
          </div>
        )}
      </section>
    </div>
  );
}
