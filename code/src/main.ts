/**
 * ------------------------------------------------------------------
 * Phantoma Code Service — entry point
 * ------------------------------------------------------------------
 * Unified service for code workspace management, file operations,
 * and AI-powered code analysis.
 *
 * `dotenv/config` MUST stay the first import so environment variables
 * are loaded before any config module reads them.
 * ------------------------------------------------------------------
 */

import 'dotenv/config';
import { startServer } from './bootstrap/server';

void startServer();