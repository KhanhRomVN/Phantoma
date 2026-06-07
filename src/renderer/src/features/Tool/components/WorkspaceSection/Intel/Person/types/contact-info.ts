export interface ContactInfo {
  email?: string[];
  phoneNumber?: string[];
  address?: string;
  messengerAccounts?: { platform: string; username: string }[];
}