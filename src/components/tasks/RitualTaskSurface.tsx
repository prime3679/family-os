'use client';

import { Task } from '@prisma/client';
import { Card, Button, Checkbox } from '@/components/shared';

interface RitualTaskSurfaceProps {
  tasks: Task[];
  title?: string;
  emptyMessage?: string;
  onToggle?: (taskId: string, completed: boolean) => void;
  onAddTask?: () => void;
  showAddButton?: boolean;
  type?: 'event-prep' | 'decision-followup' | 'standalone';
}

export function RitualTaskSurface({
  tasks,
  title = 'Tasks',
  emptyMessage = 'No tasks for this week.',
  onToggle,
  onAddTask,
  showAddButton = false,
  type,
}: RitualTaskSurfaceProps) {
  const filteredTasks = type ? tasks.filter((t) => t.type === type) : tasks;
  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const handleToggle = (task: Task) => {
    const newCompleted = task.status !== 'completed';
    onToggle?.(task.id, newCompleted);
  };

  if (filteredTasks.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-text-primary">{title}</h4>
        {showAddButton && (
          <Button variant="ghost" size="sm" onClick={onAddTask}>
            + Add Task
          </Button>
        )}
      </div>

      {filteredTasks.length === 0 ? (
        <p className="text-text-tertiary text-sm text-center py-4">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {/* Pending tasks */}
          {pendingTasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={() => handleToggle(task)} />
          ))}

          {/* Completed tasks */}
          {completedTasks.length > 0 && pendingTasks.length > 0 && (
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs text-text-tertiary mb-2">Completed</p>
            </div>
          )}
          {completedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task)}
              completed
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function TaskItem({
  task,
  onToggle,
  completed = false,
}: {
  task: Task;
  onToggle: () => void;
  completed?: boolean;
}) {
  const priorityStyles = {
    high: 'border-l-accent-alert',
    normal: 'border-l-transparent',
    low: 'border-l-text-tertiary',
  };

  const assigneeLabels = {
    parent_a: 'You',
    parent_b: 'Partner',
    both: 'Both',
  };

  return (
    <div
      className={`flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-surface-alt transition-colors border-l-2 ${
        priorityStyles[task.priority as keyof typeof priorityStyles] || priorityStyles.normal
      }`}
    >
      <Checkbox checked={completed} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            completed ? 'text-text-tertiary line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary">
            {assigneeLabels[task.assignedTo as keyof typeof assigneeLabels] || task.assignedTo}
          </span>
          {task.dueDate && (
            <>
              <span className="text-xs text-text-tertiary">•</span>
              <span className="text-xs text-text-tertiary">
                Due {new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
