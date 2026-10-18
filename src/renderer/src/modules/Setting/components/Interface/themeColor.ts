export const toRgb = (value?: string, fallback = 'rgb(128, 128, 128)'): string => {
  const n = value?.match(/\d+/g);
  return n && n.length >= 3 ? `rgb(${n[0]}, ${n[1]}, ${n[2]})` : fallback;
};