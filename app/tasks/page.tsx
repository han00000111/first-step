import { AppShell } from "@/components/app-shell";
import { TaskList } from "@/components/task-list";
import { getTaskBoardData } from "@/lib/task-service";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const taskBoard = await getTaskBoardData();

  return (
    <AppShell
      eyebrow="任务列表"
      title="任务页负责保留全量上下文，但不强迫用户先做复杂管理。"
      description="这里已经接入真实数据库。你可以编辑、删除、归档任务，也可以手动把任务推入提醒中心。"
    >
      <TaskList
        activeTasks={taskBoard.activeTasks}
        archivedTasks={taskBoard.archivedTasks}
      />
    </AppShell>
  );
}
