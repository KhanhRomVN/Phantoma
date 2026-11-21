/**
 * ------------------------------------------------------------------
 * Phantoma Emulate Service — entry point
 * ------------------------------------------------------------------
 * Unified service for traffic interception (MITM proxy, CDP, eBPF,
 * mobile) plus the Emulate target / filter / fuzzer / report API.
 *
 * `dotenv/config` MUST stay the first import so environment variables
 * are loaded before any config module reads them.
 * ------------------------------------------------------------------
 */

import 'dotenv/config';
import { startServer } from './bootstrap/server';

void startServer();
