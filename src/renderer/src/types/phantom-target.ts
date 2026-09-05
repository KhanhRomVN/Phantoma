export interface SubTarget {
  id: string;
}

export interface PhantomTarget {
  id: string;
  subTargets: SubTarget[];
}