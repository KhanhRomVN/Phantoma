import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.INTERCEPTOR_PORT || '3001', 10),
  PROXY_BASE_PORT: parseInt(process.env.PROXY_BASE_PORT || '8081', 10),
  MAIN_SERVER_URL: process.env.MAIN_SERVER_URL || 'http://localhost:8080', // Where to send intercepted events
};