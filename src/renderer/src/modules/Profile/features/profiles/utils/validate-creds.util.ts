import { Creds, ValidationErrors } from '../components/ProfileDrawer/tabs/OverviewTab/overview-tab.types';

export function validateCreds(creds: Creds): ValidationErrors {
  const errors: ValidationErrors = {};
  if (creds.recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creds.recoveryEmail)) {
    errors.recoveryEmail = 'Invalid email format';
  }
  if (creds.phone && !/^\+?[0-9\s-()]+$/.test(creds.phone)) {
    errors.phone = 'Invalid phone format';
  }
  if (creds.password && creds.password.length < 6) {
    errors.password = 'Password too short';
  }
  return errors;
}
