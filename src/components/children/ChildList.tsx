'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/shared';
import Skeleton from '@/components/shared/Skeleton';
import { useChildren, Child } from '@/hooks/useChildren';
import { ChildCard } from './ChildCard';
import { ChildForm } from './ChildForm';

export function ChildList() {
  const { children, isLoading, addChild, updateChild, deleteChild } = useChildren();
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (data: { name: string; color: string; avatarEmoji: string | null; birthdate: string | null }) => {
    setIsSubmitting(true);
    const result = await addChild(data);
    setIsSubmitting(false);
    if (result) {
      setShowForm(false);
    }
  };

  const handleEdit = async (data: { name: string; color: string; avatarEmoji: string | null; birthdate: string | null }) => {
    if (!editingChild) return;
    setIsSubmitting(true);
    const result = await updateChild(editingChild.id, data);
    setIsSubmitting(false);
    if (result) {
      setEditingChild(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this child from your household?')) return;
    await deleteChild(id);
  };

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Children</h2>
        </div>
        <Card padding="none">
          <div className="divide-y divide-border">
            <Skeleton.ChildCard />
            <Skeleton.ChildCard />
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Children</h2>
        {!showForm && !editingChild && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            + Add Child
          </Button>
        )}
      </div>

      {(showForm || editingChild) && (
        <Card className="mb-4">
          <h3 className="font-medium text-text-primary mb-4">
            {editingChild ? 'Edit Child' : 'Add Child'}
          </h3>
          <ChildForm
            child={editingChild}
            onSubmit={editingChild ? handleEdit : handleAdd}
            onCancel={() => {
              setShowForm(false);
              setEditingChild(null);
            }}
            isSubmitting={isSubmitting}
          />
        </Card>
      )}

      <Card padding="none">
        {children.length > 0 ? (
          <div className="divide-y divide-border" aria-live="polite">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onEdit={setEditingChild}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-text-tertiary text-sm mb-4">
              No children added yet. Add your children to tag events and tasks to them.
            </p>
            {!showForm && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Add Your First Child
              </Button>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
