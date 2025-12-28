'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared';
import { ChildPicker } from '@/components/children';
import { Task, TaskCreate } from '@/hooks/useTasks';

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (data: TaskCreate) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TaskForm({ task, onSubmit, onCancel, isSubmitting }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'normal');
  const [assignedTo, setAssignedTo] = useState<Task['assignedTo']>(task?.assignedTo || 'both');
  const [childId, setChildId] = useState<string | null>(task?.childId || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setAssignedTo(task.assignedTo);
      setChildId(task.childId);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate title
    if (!title.trim()) {
      setErrors({ title: 'Task title is required' });
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignedTo,
      childId,
      type: task?.type || 'standalone',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-text-primary mb-1">
          Task
        </label>
        <input
          type="text"
          id="task-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) {
              setErrors({});
            }
          }}
          placeholder="What needs to be done?"
          className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          autoFocus
        />
        {errors.title && (
          <p className="mt-1 text-sm text-accent-alert">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="task-desc" className="block text-sm font-medium text-text-primary mb-1">
          Notes (optional)
        </label>
        <textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          rows={2}
          className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Priority */}
        <div>
          <label htmlFor="task-priority" className="block text-sm font-medium text-text-primary mb-1">Priority</label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Assigned To */}
        <div>
          <label htmlFor="task-assigned" className="block text-sm font-medium text-text-primary mb-1">Assigned To</label>
          <select
            id="task-assigned"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value as Task['assignedTo'])}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          >
            <option value="both">Both</option>
            <option value="parent_a">Parent A</option>
            <option value="parent_b">Parent B</option>
          </select>
        </div>
      </div>

      {/* Child */}
      <div>
        <label htmlFor="task-child" className="block text-sm font-medium text-text-primary mb-1">Related to child</label>
        <ChildPicker
          value={childId}
          onChange={setChildId}
          placeholder="None"
          className="w-full"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || isSubmitting}>
          {isSubmitting ? 'Saving...' : task ? 'Save Changes' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}

// Quick add component for inline task creation
interface TaskQuickAddProps {
  onAdd: (title: string) => void;
  placeholder?: string;
}

export function TaskQuickAdd({ onAdd, placeholder = 'Add a task...' }: TaskQuickAddProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-border">
      <span className="text-text-tertiary">+</span>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />
    </form>
  );
}
