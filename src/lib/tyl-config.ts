
// TYL (Third Year Lateral) Configuration

// TYL Subject Passing Marks Configuration
// Each TYL subject has a total of 100 marks
export const TYL_PASSING_MARKS: Record<string, number> = {
  // Language
  'l1': 65,
  'l2': 65,
  'l3': 70,
  'l4': 70,
  
  // Aptitude
  'a1': 50,
  'a2': 50,
  'a3': 50,
  'a4': 60,
  
  // Soft Skills
  's1': 50,
  's2': 50,
  's3': 50,
  's4': 50,
  
  // Programming
  'p1': 50, // P1 (C)
  'p2': 50, // P2 (Python)
  'p3': 60, // P3 (Python) or P3 (Java) - both 60
  'p4': 70, // All P4 subjects = 70
  
  // Core tests
  'c2-odd': 10,
  'c2-full': 10,
  'c3-odd': 25,
  'c3-full': 50,
  'c4-odd': 50,
  'c4-full': 50,
  'c5-full': 50,
};

// Helper function to get passing marks for a TYL subject
export function getTYLPassingMarks(subjectCode: string, variant?: 'odd' | 'full'): number {
  const code = subjectCode.toLowerCase();
  
  // Handle core subjects with variants
  if (code.includes('c2-odd') || (code.startsWith('c2') && variant === 'odd')) {
    return TYL_PASSING_MARKS['c2-odd'];
  }
  if (code.includes('c2-full') || (code.startsWith('c2') && variant === 'full')) {
    return TYL_PASSING_MARKS['c2-full'];
  }
  if (code.includes('c3-odd') || (code.startsWith('c3') && variant === 'odd')) {
    return TYL_PASSING_MARKS['c3-odd'];
  }
  if (code.includes('c3-full') || (code.startsWith('c3') && variant === 'full')) {
    return TYL_PASSING_MARKS['c3-full'];
  }
  if (code.includes('c4-odd') || (code.startsWith('c4') && variant === 'odd')) {
    return TYL_PASSING_MARKS['c4-odd'];
  }
  if (code.includes('c4-full') || (code.startsWith('c4') && variant === 'full')) {
    return TYL_PASSING_MARKS['c4-full'];
  }
  if (code.startsWith('c5')) {
    return TYL_PASSING_MARKS['c5-full'];
  }
  
  // Handle P4 subjects (all P4 variants have same passing marks = 70)
  if (code.startsWith('p4')) {
    return TYL_PASSING_MARKS['p4'];
  }
  
  // Handle P3 subjects (both Python and Java have same passing marks = 60)
  if (code.startsWith('p3')) {
    return TYL_PASSING_MARKS['p3'];
  }
  
  // Handle P1 and P2
  if (code.startsWith('p1')) {
    return TYL_PASSING_MARKS['p1'];
  }
  if (code.startsWith('p2')) {
    return TYL_PASSING_MARKS['p2'];
  }
  
  // Handle other subjects (extract base code like a1, l1, s1, etc.)
  const baseCode = code.match(/^([a-z]\d)/)?.[1];
  if (baseCode && baseCode in TYL_PASSING_MARKS) {
    return TYL_PASSING_MARKS[baseCode];
  }
  
  // Default fallback
  return 50;
}

// TYL Subject Categories
export const TYL_CATEGORIES = {
  aptitude: ['a1', 'a2', 'a3', 'a4'],
  language: ['l1', 'l2', 'l3', 'l4'],
  'soft skills': ['s1', 's2', 's3', 's4'],
  programming: ['p1', 'p2', 'p3', 'p4'],
  core: ['c2', 'c3', 'c4', 'c5'],
} as const;

// Helper to check if a subject code is TYL
export function isTYLSubject(subjectCode: string): boolean {
  const code = subjectCode.toLowerCase();
  const tylPattern = /^(a[1-4]|c[2-5]|l[1-4]|p[1-4]|s[1-4])(-odd|-full|-python|-java|-c|-mad|-fsd|-ds)?$/i;
  return tylPattern.test(code);
}

// TYL Total Marks (all subjects have 100 total marks)
export const TYL_TOTAL_MARKS = 100;

