import type { PhantomTarget } from '../types/phantom-target';

export const mockTargetGroups: PhantomTarget[] = [
  {
    id: 'target-1',
    subTargets: [
      { id: 'subtarget-1' },
      { id: 'subtarget-2' },
    ],
  },
  {
    id: 'target-2',
    subTargets: [
      { id: 'subtarget-3' },
      { id: 'subtarget-4' },
    ],
  },
];