export interface DeveloperInfo {
  contributors: { name: string; email: string; commits: number }[];
  commitEmails: string[];
  maintainers: string[];
}