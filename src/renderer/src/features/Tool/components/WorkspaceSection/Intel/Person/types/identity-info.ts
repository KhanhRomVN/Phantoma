export interface IdentityInfo {
  fullName: string;
  alias?: string[];
  username?: string[];
  nickname?: string | null;
  avatar?: string | null;
  possibleRealNames?: string[];
  estimatedAge?: string | null;
  gender?: string | null;
  nationality?: string | null;
  language?: string[];
  notes?: string | null;
}