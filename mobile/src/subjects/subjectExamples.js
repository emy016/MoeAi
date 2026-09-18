/**
 * Removable subject fixtures used only while the real institution feed is absent.
 * User-created subjects are stored separately by subjectStore.js.
 */
const lecture = (id, title, progress, day, files = []) => ({
  id,
  title,
  progress,
  createdAt: `2026-09-${String(day).padStart(2, '0')}T09:00:00.000Z`,
  files,
});

const sampleFile = (name) => ({ id: `demo-${name}`, name, uri: null, mimeType: 'application/pdf', size: null });

export const SUBJECT_EXAMPLES = [
  {
    id: 'demo-subject-mathematics', name: 'Mathematics', owner: 'university', iconQuery: 'mathematics',
    lectures: [
      lecture('math-1', 'Functions and graphs', 1, 2, [sampleFile('functions-and-graphs.pdf')]),
      lecture('math-2', 'Limits', 1, 4),
      lecture('math-3', 'Differentiation', 1, 7, [sampleFile('differentiation.pdf')]),
      lecture('math-4', 'Integration', 0.45, 10),
      lecture('math-5', 'Sequences', 0.1, 13),
    ],
  },
  {
    id: 'demo-subject-physics', name: 'Physics', owner: 'university', iconQuery: 'physics',
    lectures: [
      lecture('physics-1', 'Kinematics', 1, 1),
      lecture('physics-2', 'Newton’s laws', 1, 5, [sampleFile('newtons-laws.pdf')]),
      lecture('physics-3', 'Work and energy', 0.6, 9),
      lecture('physics-4', 'Waves', 0.15, 14),
    ],
  },
  {
    id: 'demo-subject-chemistry', name: 'Chemistry', owner: 'university', iconQuery: 'chemistry',
    lectures: [
      lecture('chemistry-1', 'Atomic structure', 1, 3),
      lecture('chemistry-2', 'Chemical bonding', 0.55, 8, [sampleFile('chemical-bonding.pdf')]),
      lecture('chemistry-3', 'Stoichiometry', 0.2, 12),
    ],
  },
  {
    id: 'demo-subject-computer-science', name: 'Computer Science', owner: 'university', iconQuery: 'computer science',
    lectures: [
      lecture('cs-1', 'Algorithms', 1, 1),
      lecture('cs-2', 'Data structures', 1, 3),
      lecture('cs-3', 'Object-oriented design', 1, 6),
      lecture('cs-4', 'Databases', 1, 9, [sampleFile('database-notes.pdf')]),
      lecture('cs-5', 'Networks', 0.7, 12),
      lecture('cs-6', 'Operating systems', 0.25, 15),
    ],
  },
  {
    id: 'demo-subject-biology', name: 'Biology', owner: 'university', iconQuery: 'biology',
    lectures: [
      lecture('biology-1', 'Cell biology', 1, 2),
      lecture('biology-2', 'Genetics', 0.8, 6, [sampleFile('genetics.pdf')]),
      lecture('biology-3', 'Evolution', 0.35, 11),
      lecture('biology-4', 'Ecology', 0.1, 15),
    ],
  },
];

export default SUBJECT_EXAMPLES;
