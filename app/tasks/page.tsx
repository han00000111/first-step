import { AppShell } from "@/components/app-shell";
import { TaskList } from "@/components/task-list";
import { getTaskBoardData } from "@/lib/task-service";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const taskBoard = await getTaskBoardData();

  return (
    <AppShell
      eyebrow="任务列表"
      title="把该开始的事放在眼前，不做复杂管理。"
      description="这里保留任务的上下文和提醒状态。你可以编辑、删除、归档任务，也可以手动把任务推入提醒中心。"
    >
      <TaskList
        activeTasks={taskBoard.activeTasks}
        archivedTasks={taskBoard.archivedTasks}
      />
    </AppShell>
  );
}
