export const HEAT: number[][] = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const work = Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2));
    return Math.max(0, Math.round(work * 9 + ((d * 17 + h * 31) % 6) - (d >= 5 ? 3 : 0)));
  }),
);