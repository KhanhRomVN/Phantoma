export interface AuthSurface {
  loginPage: string;
  registerPage?: string;
  passwordReset?: string;
  oauth?: { provider: string; url: string }[];
  sso?: string;
  sessionCookie?: { name: string; httpOnly?: boolean; secure?: boolean };
  jwt?: boolean;
  mfa?: boolean;
}