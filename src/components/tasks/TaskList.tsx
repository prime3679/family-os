'use client';

import { useState } from 'react';
import { Card, ErrorMessage } from '@/components/shared';
import Skeleton from '@/components/shared/Skeleton';
import { useTasks, Task, TaskCreate, filterTasks } from '@/hooks/useTasks';
import { TaskCard } from './TaskCard';
import { TaskForm, TaskQuickAdd } from './TaskForm';

interface TaskListProps {
  showFilters?: boolean;
  compact?: boolean;
}

type FilterTab = 'all' | 'pending' | 'completed';

export function TaskList({ showFilters = true, compact = false }: TaskListProps) {
  const { tasks, isLoading, error, refetch, createTask, updateTask, deleteTask, toggleComplete, weekKey } = useTasks();
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTasks = (() => {
    if (activeTab === 'all') return tasks;
    if (activeTab === 'completed') return filterTasks(tasks, { status: ['completed'] });
    return filterTasks(tasks, { status: ['pending', 'in_progress'] });
  })();

  // Separate high priority tasks
  const highPriorityTasks = filteredTasks.filter(t => t.priority === 'high' && t.status !== 'completed');
  const regularTasks = filteredTasks.filter(t => t.priority !== 'high' || t.status === 'completed');

  const handleAdd = async (data: TaskCreate) => {
    setIsSubmitting(true);
    const result = await createTask(data);
    setIsSubmitting(false);
    if (result) {
      setShowForm(false);
    }
  };

  const handleQuickAdd = async (title: string) => {
    await createTask({ title });
  };

  const handleEdit = async (data: TaskCreate) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    await updateTask(editingTask.id, data);
    setIsSubmitting(false);
    setEditingTask(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(id);
  };

  if (isLoading) {
    return (
      <Card padding="none">
        <div className="divide-y divide-border">
          <Skeleton.TaskCard />
          <Skeleton.TaskCard />
          <Skeleton.TaskCard />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <ErrorMessage message={error} onRetry={refetch} />
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2">
          {(['pending', 'completed', 'all'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-[44px] px-4 py-2 text-sm rounded-full transition-colors ${
                activeTab === tab
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-accent-primary/10'
              }`}
            >
              {tab === 'pending' ? 'To Do' : tab === 'completed' ? 'Done' : 'All'}
              {tab === 'pending' && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({filterTasks(tasks, { status: ['pending', 'in_progress'] }).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {(showForm || editingTask) && (
        <Card>
          <h3 className="font-medium text-text-primary mb-4">
            {editingTask ? 'Edit Task' : 'Add Task'}
          </h3>
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? handleEdit : handleAdd}
            onCancel={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
            isSubmitting={isSubmitting}
          />
        </Card>
      )}

      {/* High Priority Section */}
      {highPriorityTasks.length > 0 && activeTab !== 'completed' && (
        <div>
          <h3 className="text-xs font-semibold text-accent-alert uppercase tracking-wide mb-2">
            High Priority
          </h3>
          <Card padding="none">
            <div className="divide-y divide-border">
              {highPriorityTasks.map((task) => (
                <div key={task.id} className="group">
                  <TaskCard
                    task={task}
                    onToggle={toggleComplete}
                    onEdit={setEditingTask}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Regular Tasks */}
      <Card padding="none">
        {regularTasks.length > 0 ? (
          <div className="divide-y divide-border" aria-live="polite">
            {regularTasks.map((task) => (
              <div key={task.id} className="group">
                <TaskCard
                  task={task}
                  onToggle={toggleComplete}
                  onEdit={setEditingTask}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-text-tertiary text-sm">
            {activeTab === 'completed'
              ? 'No completed tasks yet'
              : tasks.length === 0
              ? 'No tasks this week'
              : 'All caught up!'}
          </div>
        )}

        {/* Quick Add */}
        {!compact && activeTab !== 'completed' && !showForm && !editingTask && (
          <TaskQuickAdd onAdd={handleQuickAdd} />
        )}
      </Card>
    </div>
  );
}
