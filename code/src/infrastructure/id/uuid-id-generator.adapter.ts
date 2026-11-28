import type { IdGeneratorPort } from '../../application/ports/id-generator.port';
import { newId } from '../../utils/id.util';

export class UuidIdGeneratorAdapter implements IdGeneratorPort {
  newId(): string {
    return newId();
  }
}