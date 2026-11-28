import { Response } from 'express';

export const json = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json({ success: true, data });
};

export const fail = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, error: message });
};