'use client';

import { useState } from 'react';
import { Button, ErrorMessage } from '@/components/shared';
import { TaskList } from '@/components/tasks';
import { TaskForm } from '@/components/tasks/TaskForm';
import { Card } from '@/components/shared';
import { useTasks, TaskCreate } from '@/hooks/useTasks';

export default function TasksPage() {
  const { createTask, weekKey, error, refetch } = useTasks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format week display
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const handleAdd = async (data: TaskCreate) => {
    setIsSubmitting(true);
    const result = await createTask(data);
    setIsSubmitting(false);
    if (result) {
      setShowAddForm(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-text-primary">Tasks</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
          </div>
          {!showAddForm && (
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              + Add Task
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Error Display */}
          {error && (
            <ErrorMessage message={error} onRetry={refetch} />
          )}

          {/* Add Form */}
          {showAddForm && (
            <Card>
              <h2 className="font-medium text-text-primary mb-4">New Task</h2>
              <TaskForm
                onSubmit={handleAdd}
                onCancel={() => setShowAddForm(false)}
                isSubmitting={isSubmitting}
              />
            </Card>
          )}

          {/* Task List */}
          <TaskList showFilters={true} />
        </div>
      </div>
    </div>
  );
}
