import { AppShell } from "@/components/app-shell";
import { TaskList } from "@/components/task-list";
import { getTaskBoardData } from "@/lib/task-service";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const taskBoard = await getTaskBoardData();

  return (
    <AppShell eyebrow="任务列表" title="把现在要处理的事放在眼前。">
      <TaskList
        activeTasks={taskBoard.activeTasks}
        archivedTasks={taskBoard.archivedTasks}
      />
    </AppShell>
  );
}
