'use client';

import { Task } from '@/hooks/useTasks';
import { ChildBadge } from '@/components/children';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  showActions?: boolean;
}

const priorityStyles = {
  high: 'border-l-4 border-l-accent-alert',
  normal: '',
  low: 'opacity-75',
};

const typeLabels = {
  'event-prep': 'Prep',
  'decision-followup': 'Decision',
  standalone: '',
};

const assignedLabels = {
  parent_a: 'Parent A',
  parent_b: 'Parent B',
  both: 'Both',
};

export function TaskCard({ task, onToggle, onEdit, onDelete, showActions = true }: TaskCardProps) {
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`flex items-start gap-3 p-4 ${priorityStyles[task.priority]} ${
        isCompleted ? 'bg-surface/50' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={isCompleted ? 'Mark task incomplete' : 'Mark task complete'}
        className={`mt-0.5 min-h-[44px] min-w-[44px] h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
          isCompleted
            ? 'bg-accent-calm border-accent-calm text-white'
            : 'border-border hover:border-accent-primary'
        }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span
            className={`font-medium ${
              isCompleted ? 'line-through text-text-tertiary' : 'text-text-primary'
            }`}
          >
            {task.title}
          </span>
          {task.child && <ChildBadge child={task.child} size="small" />}
        </div>

        {task.description && (
          <p className="text-sm text-text-tertiary mt-1 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
          <span className="capitalize">{assignedLabels[task.assignedTo]}</span>
          {task.type !== 'standalone' && (
            <>
              <span className="text-border">•</span>
              <span>{typeLabels[task.type]}</span>
            </>
          )}
          {task.dueDate && (
            <>
              <span className="text-border">•</span>
              <span>Due {new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </>
          )}
          {task.priority === 'high' && (
            <>
              <span className="text-border">•</span>
              <span className="text-accent-alert font-medium">High priority</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            className="min-h-[44px] min-w-[44px] p-2 text-text-tertiary hover:text-text-primary rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            className="min-h-[44px] min-w-[44px] p-2 text-text-tertiary hover:text-accent-alert rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
