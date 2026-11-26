/** Quốc gia → timezone / ngôn ngữ / tiền tệ kỳ vọng (dùng cho phép kiểm tra nhất quán). */
export interface CountryInfo { tz: string[]; lang: string[]; cur: string }

export const COUNTRY: Record<string, CountryInfo> = {
  Vietnam: { tz: ['Asia/Saigon', 'Asia/Ho_Chi_Minh'], lang: ['vi'], cur: 'VND' },
  Singapore: { tz: ['Asia/Singapore'], lang: ['en', 'zh', 'ms', 'ta'], cur: 'SGD' },
  Japan: { tz: ['Asia/Tokyo'], lang: ['ja'], cur: 'JPY' },
  'South Korea': { tz: ['Asia/Seoul'], lang: ['ko'], cur: 'KRW' },
  Thailand: { tz: ['Asia/Bangkok'], lang: ['th'], cur: 'THB' },
  China: { tz: ['Asia/Shanghai'], lang: ['zh'], cur: 'CNY' },
  India: { tz: ['Asia/Kolkata', 'Asia/Calcutta'], lang: ['en', 'hi'], cur: 'INR' },
  'United States': { tz: ['America/', 'Pacific/Honolulu'], lang: ['en'], cur: 'USD' },
  'United Kingdom': { tz: ['Europe/London'], lang: ['en'], cur: 'GBP' },
  Germany: { tz: ['Europe/Berlin'], lang: ['de'], cur: 'EUR' },
  France: { tz: ['Europe/Paris'], lang: ['fr'], cur: 'EUR' },
};
