/*
 * Family OS — Mock Data
 *
 * Rich, realistic data for the weekly ritual experience.
 * Designed to feel like real family chaos.
 */

// ============================================
// TYPES
// ============================================

export type Event = {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  period: 'morning' | 'afternoon' | 'evening';
  parent: 'A' | 'B' | 'both';
  calendar: string;
  type?: 'work' | 'kids' | 'personal' | 'family' | 'travel';
  needsPrep?: boolean;
};

export type Conflict = {
  id: string;
  timeRange: string;
  day: string;
  description: string;
  humanContext: string; // The warm, human explanation
  type: 'overlap' | 'logistics' | 'coverage';
  severity: 'high' | 'medium';
  events: string[];
  question?: string; // Decision question for this conflict
};

export type PrepItem = {
  id: string;
  eventTitle: string;
  eventTime: string;
  items: {
    id: string;
    text: string;
    done: boolean;
  }[];
};

export type Decision = {
  id: string;
  title: string;
  context: string;
  options?: string[];
  resolved: boolean;
  resolution?: string;
};

export type WeekSummary = {
  totalEvents: number;
  handoffs: number;
  travelDays: number;
  soloParentingDays: number;
  heaviestDay: string;
  lightestDay: string;
  intensity: 'light' | 'moderate' | 'heavy' | 'intense';
  narrative: string;
};

// ============================================
// WEEK METADATA
// ============================================

export const currentWeek = {
  label: 'This week',
  range: 'Dec 9–15',
  year: 2024,
  days: [
    { key: 'mon', short: 'Mon', date: '9', full: 'Monday, Dec 9' },
    { key: 'tue', short: 'Tue', date: '10', full: 'Tuesday, Dec 10' },
    { key: 'wed', short: 'Wed', date: '11', full: 'Wednesday, Dec 11' },
    { key: 'thu', short: 'Thu', date: '12', full: 'Thursday, Dec 12' },
    { key: 'fri', short: 'Fri', date: '13', full: 'Friday, Dec 13' },
    { key: 'sat', short: 'Sat', date: '14', full: 'Saturday, Dec 14' },
    { key: 'sun', short: 'Sun', date: '15', full: 'Sunday, Dec 15' },
  ],
};

// ============================================
// EVENTS
// ============================================

export const mockEvents: Event[] = [
  // Monday - moderate
  { id: '1', title: 'Team standup', time: '9:00 AM', day: 'mon', period: 'morning', parent: 'A', calendar: 'Work', type: 'work' },
  { id: '2', title: 'Daycare dropoff', time: '8:00 AM', day: 'mon', period: 'morning', parent: 'B', calendar: 'Family', type: 'kids' },
  { id: '3', title: 'Client call', time: '2:00 PM', day: 'mon', period: 'afternoon', parent: 'A', calendar: 'Work', type: 'work' },
  { id: '4', title: 'Daycare pickup', time: '5:30 PM', day: 'mon', period: 'afternoon', parent: 'B', calendar: 'Family', type: 'kids' },

  // Tuesday - tricky (conflict day)
  { id: '5', title: 'Dentist - Emma', time: '10:00 AM', endTime: '11:00 AM', day: 'tue', period: 'morning', parent: 'B', calendar: 'Kids', type: 'kids', needsPrep: true },
  { id: '6', title: 'Product review', time: '10:30 AM', endTime: '11:30 AM', day: 'tue', period: 'morning', parent: 'A', calendar: 'Work', type: 'work' },
  { id: '7', title: 'Soccer practice', time: '4:30 PM', day: 'tue', period: 'afternoon', parent: 'both', calendar: 'Kids', type: 'kids' },

  // Wednesday - busy but manageable
  { id: '8', title: 'Board meeting', time: '9:00 AM', endTime: '11:00 AM', day: 'wed', period: 'morning', parent: 'A', calendar: 'Work', type: 'work' },
  { id: '9', title: 'Playdate - Jake', time: '3:00 PM', day: 'wed', period: 'afternoon', parent: 'B', calendar: 'Kids', type: 'kids' },
  { id: '10', title: 'Date night', time: '7:00 PM', day: 'wed', period: 'evening', parent: 'both', calendar: 'Personal', type: 'personal', needsPrep: true },

  // Thursday - heavy (travel + solo parenting)
  { id: '11', title: 'Flight to NYC', time: '6:00 AM', day: 'thu', period: 'morning', parent: 'A', calendar: 'Work', type: 'travel', needsPrep: true },
  { id: '12', title: 'Pediatrician - both kids', time: '3:00 PM', day: 'thu', period: 'afternoon', parent: 'B', calendar: 'Kids', type: 'kids', needsPrep: true },
  { id: '13', title: 'Conference dinner', time: '7:00 PM', day: 'thu', period: 'evening', parent: 'A', calendar: 'Work', type: 'work' },

  // Friday - moderate
  { id: '14', title: 'Conference Day 1', time: '9:00 AM', day: 'fri', period: 'morning', parent: 'A', calendar: 'Work', type: 'work' },
  { id: '15', title: 'Daycare dropoff', time: '8:00 AM', day: 'fri', period: 'morning', parent: 'B', calendar: 'Family', type: 'kids' },
  { id: '16', title: 'Movie night', time: '7:00 PM', day: 'fri', period: 'evening', parent: 'both', calendar: 'Family', type: 'family' },

  // Saturday - family day
  { id: '17', title: 'Soccer game', time: '10:00 AM', day: 'sat', period: 'morning', parent: 'both', calendar: 'Kids', type: 'kids' },
  { id: '18', title: 'Grocery run', time: '2:00 PM', day: 'sat', period: 'afternoon', parent: 'A', calendar: 'Personal', type: 'personal' },

  // Sunday - recovery
  { id: '19', title: 'Brunch with grandparents', time: '11:00 AM', day: 'sun', period: 'morning', parent: 'both', calendar: 'Family', type: 'family' },
  { id: '20', title: 'Meal prep', time: '4:00 PM', day: 'sun', period: 'afternoon', parent: 'B', calendar: 'Personal', type: 'personal' },
  { id: '21', title: 'Weekly planning', time: '8:00 PM', day: 'sun', period: 'evening', parent: 'both', calendar: 'Family', type: 'family' },
];

// ============================================
// CONFLICTS — With human context
// ============================================

export const mockConflicts: Conflict[] = [
  {
    id: 'c1',
    timeRange: '10:00 AM – 11:30 AM',
    day: 'Tuesday',
    description: 'Emma\'s dentist overlaps with product review',
    humanContext: 'Tuesday morning is tight. Emma\'s dentist appointment starts at 10, but the product review meeting is at 10:30. One of you needs to flex here.',
    type: 'overlap',
    severity: 'high',
    events: ['Dentist - Emma', 'Product review'],
    question: 'Can the product review be moved, or should we reschedule the dentist?',
  },
  {
    id: 'c2',
    timeRange: 'All day',
    day: 'Thursday',
    description: 'Solo parenting day — Parent A traveling',
    humanContext: 'Thursday is your heaviest day, and you\'re flying solo. The pediatrician visit with both kids during nap-disruption hours could be rough.',
    type: 'coverage',
    severity: 'high',
    events: ['Flight to NYC', 'Pediatrician - both kids'],
    question: 'Do you need backup support for Thursday? Grandparent? Sitter?',
  },
  {
    id: 'c3',
    timeRange: '5:30 PM – 7:00 PM',
    day: 'Wednesday',
    description: 'Tight window between pickup and date night',
    humanContext: 'There\'s only 90 minutes between daycare pickup and your dinner reservation. Factor in kid handoff, getting ready, and sitter arrival.',
    type: 'logistics',
    severity: 'medium',
    events: ['Daycare pickup', 'Date night'],
    question: 'Is the sitter confirmed? What time should they arrive?',
  },
];

// ============================================
// PREP ITEMS — The invisible work
// ============================================

export const mockPrepItems: PrepItem[] = [
  {
    id: 'prep-1',
    eventTitle: 'Dentist - Emma',
    eventTime: 'Tuesday 10:00 AM',
    items: [
      { id: 'p1-1', text: 'Check insurance card is in wallet', done: true },
      { id: 'p1-2', text: 'Write down questions for dentist', done: false },
      { id: 'p1-3', text: 'Pack comfort item for Emma', done: false },
      { id: 'p1-4', text: 'Confirm who\'s handling pickup after', done: false },
    ],
  },
  {
    id: 'prep-2',
    eventTitle: 'Flight to NYC',
    eventTime: 'Thursday 6:00 AM',
    items: [
      { id: 'p2-1', text: 'Pack bag night before', done: false },
      { id: 'p2-2', text: 'Confirm hotel reservation', done: true },
      { id: 'p2-3', text: 'Share flight details with partner', done: false },
      { id: 'p2-4', text: 'Set early alarm (5 AM latest)', done: false },
      { id: 'p2-5', text: 'Arrange ride to airport', done: true },
    ],
  },
  {
    id: 'prep-3',
    eventTitle: 'Pediatrician - both kids',
    eventTime: 'Thursday 3:00 PM',
    items: [
      { id: 'p3-1', text: 'Update vaccination records', done: false },
      { id: 'p3-2', text: 'List any concerns/symptoms', done: false },
      { id: 'p3-3', text: 'Pack snacks for waiting room', done: false },
      { id: 'p3-4', text: 'Charge tablet for entertainment', done: true },
      { id: 'p3-5', text: 'Prep easy dinner for after', done: false },
    ],
  },
  {
    id: 'prep-4',
    eventTitle: 'Date night',
    eventTime: 'Wednesday 7:00 PM',
    items: [
      { id: 'p4-1', text: 'Confirm sitter (arrive by 6:30)', done: false },
      { id: 'p4-2', text: 'Write down bedtime routine', done: false },
      { id: 'p4-3', text: 'Leave emergency contacts', done: true },
      { id: 'p4-4', text: 'Prep kids\' dinner before leaving', done: false },
    ],
  },
];

// ============================================
// DECISIONS — What needs discussing
// ============================================

export const mockDecisions: Decision[] = [
  {
    id: 'd1',
    title: 'Tuesday morning conflict',
    context: 'The dentist and product review overlap. Someone needs to handle the dentist while the other takes the meeting.',
    options: ['Parent A takes dentist, reschedule meeting', 'Parent B handles both', 'Reschedule dentist to next week'],
    resolved: false,
  },
  {
    id: 'd2',
    title: 'Thursday backup support',
    context: 'Solo parenting plus pediatrician visit is a lot. Should we call in reinforcements?',
    options: ['Ask grandma to help', 'Hire sitter for afternoon', 'Handle it solo'],
    resolved: false,
  },
  {
    id: 'd3',
    title: 'Wednesday sitter arrival',
    context: 'The window between pickup and date night is tight. Sitter should arrive early to avoid rushing.',
    options: ['Sitter arrives at 6:00 PM', 'Sitter arrives at 6:30 PM', 'Move reservation to 7:30 PM'],
    resolved: false,
  },
];

// ============================================
// WEEK SUMMARY — The big picture
// ============================================

export const mockWeekSummary: WeekSummary = {
  totalEvents: 21,
  handoffs: 4,
  travelDays: 1,
  soloParentingDays: 2,
  heaviestDay: 'Thursday',
  lightestDay: 'Sunday',
  intensity: 'heavy',
  narrative: `This is a fuller week. Thursday stands out as the stress peak — Parent A is traveling while Parent B handles both kids and a pediatrician visit. Tuesday has an overlap that needs resolving.

The good news: Wednesday evening has date night protected, and the weekend is mostly family time. Sunday is your recovery day.

Three things need your attention before the week starts: the Tuesday conflict, Thursday backup, and confirming the sitter for date night.`,
};

// ============================================
// AFFIRMATION DATA — For the exhale
// ============================================

export const weekAffirmation = {
  headline: "You've got this.",
  subtext: "You've handled weeks like this before. The tricky spots are identified, the prep is listed, and the decisions are made.",
  stats: [
    { label: 'Events mapped', value: 21 },
    { label: 'Conflicts surfaced', value: 3 },
    { label: 'Prep items ready', value: 18 },
    { label: 'Decisions to make', value: 3 },
  ],
  closingMessage: "Take a breath. You're ready for whatever this week brings.",
};

// ============================================
// CALENDAR SETTINGS
// ============================================

export const mockCalendars = [
  { id: 'cal1', name: 'Work - Adrian', account: 'adrian@company.com', included: true, color: '#7C6A5D' },
  { id: 'cal2', name: 'Personal - Adrian', account: 'adrian@gmail.com', included: true, color: '#8B9D83' },
  { id: 'cal3', name: 'Work - Partner', account: 'partner@company.com', included: true, color: '#9B8AA6' },
  { id: 'cal4', name: 'Personal - Partner', account: 'partner@gmail.com', included: true, color: '#C4A484' },
  { id: 'cal5', name: 'Family', account: 'family@gmail.com', included: true, color: '#C17F59' },
  { id: 'cal6', name: 'Kids', account: 'family@gmail.com', included: true, color: '#7A9E7E' },
  { id: 'cal7', name: 'Holidays', account: 'adrian@gmail.com', included: false, color: '#9C9690' },
];
