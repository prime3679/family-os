import { z } from 'zod';

// Tool: Query week's events
export const queryWeekTool = {
  description: 'Get events for a specific day or the whole week',
  parameters: z.object({
    day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).optional()
      .describe('Specific day to query, or omit for whole week'),
    range: z.enum(['today', 'tomorrow', 'week']).optional()
      .describe('Time range to query'),
  }),
  execute: async ({ day, range }: { day?: string; range?: string }) => {
    // For now, return placeholder - will integrate with calendar API later
    return { events: [], message: 'Events will be fetched here' };
  },
};

// Tool: Get unresolved conflicts
export const getConflictsTool = {
  description: 'Get list of unresolved scheduling conflicts for this week',
  parameters: z.object({}),
  execute: async () => {
    return { conflicts: [], message: 'No conflicts found' };
  },
};

// Tool: Create a task
export const createTaskTool = {
  description: 'Create a new task or reminder for the family. Use this when the user wants to add a todo item, reminder, or task.',
  parameters: z.object({
    title: z.string().describe('What needs to be done - keep it concise'),
    description: z.string().optional().describe('Additional details about the task'),
    assignedTo: z.enum(['parent_a', 'parent_b', 'both']).optional()
      .describe('Who should handle this task. Default to "both" if unclear'),
    priority: z.enum(['low', 'normal', 'high']).optional()
      .describe('How urgent is this task'),
    childName: z.string().optional()
      .describe('Name of child this task relates to, if any'),
  }),
};

// Tool: Create an event (placeholder for now)
export const createEventTool = {
  description: 'Create a new calendar event. Use this when the user wants to add something to the schedule.',
  parameters: z.object({
    title: z.string().describe('Name of the event'),
    day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).describe('Day of the week'),
    time: z.string().describe('Time in format like "2:00 PM" or "14:00"'),
    duration: z.number().optional().describe('Duration in minutes'),
    parent: z.enum(['parent_a', 'parent_b', 'both']).optional()
      .describe('Who is responsible for this event'),
  }),
};

export const familyOSTools = {
  queryWeek: queryWeekTool,
  getConflicts: getConflictsTool,
  createTask: createTaskTool,
  createEvent: createEventTool,
};
