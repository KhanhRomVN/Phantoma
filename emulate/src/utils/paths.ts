import { homedir } from 'os';
import { join } from 'path';

// Directory for storing generated CA certificates
export const CERTS_DIR = join(homedir(), '.phantoma', 'certs');