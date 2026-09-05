// Entry point - chỉ import một số items từ utils
import { usedFunction, USED_CONSTANT, UsedInterface, UsedType } from './utils';

const data: UsedInterface = {
  id: 1,
  name: 'Test'
};

const value: UsedType = USED_CONSTANT;

console.log(usedFunction());
console.log(value, data);

// Main export - được phép unused vì đây là entry file
export function main() {
  console.log('App started');
}
