export interface ReadMemoryParams {
  _empty?: true;
}

export const parseReadMemory = (_innerContent: string): ReadMemoryParams => {
  // read_memory không nhận tham số nào.
  return {};
};