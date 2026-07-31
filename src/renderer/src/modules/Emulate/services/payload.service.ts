// Payload Service - Generate and manage payloads
import { PayloadItem, FuzzerJob } from '../types/repeater.types';

export class PayloadService {
  /**
   * Generate payload values from a PayloadItem
   */
  generatePayloadValues(payload: PayloadItem): string[] {
    return payload.values || [];
  }

  /**
   * Generate payloads from a FuzzerJob
   */
  *generateFuzzerPayloads(job: FuzzerJob): Generator<string> {
    if (job.payloadType === 'list') {
      for (const line of job.payloadList.split('\n')) {
        const p = line.trim();
        if (p) yield p;
      }
    } else if (job.payloadType === 'numbers') {
      for (let i = job.numberFrom; i <= job.numberTo; i += job.numberStep) {
        yield String(i);
      }
    } else {
      // Brute force
      const chars = job.bruteChars;
      const len = job.bruteLen;
      const total = Math.pow(chars.length, len);
      for (let i = 0; i < total; i++) {
        let n = i;
        let word = '';
        for (let j = 0; j < len; j++) {
          word = chars[n % chars.length] + word;
          n = Math.floor(n / chars.length);
        }
        yield word;
      }
    }
  }

  /**
   * Count total payloads from a FuzzerJob
   */
  countFuzzerPayloads(job: FuzzerJob): number {
    if (job.payloadType === 'list') {
      return job.payloadList.split('\n').filter((l) => l.trim()).length;
    }
    if (job.payloadType === 'numbers') {
      return Math.max(0, Math.floor((job.numberTo - job.numberFrom) / job.numberStep) + 1);
    }
    return Math.pow(job.bruteChars.length, job.bruteLen);
  }

  /**
   * Get enabled payloads from a list
   */
  getEnabledPayloads(payloads: PayloadItem[]): PayloadItem[] {
    return payloads.filter((p) => p.enabled && p.values.length > 0);
  }

  /**
   * Get active payload names from a template
   */
  getActivePayloadNames(template: string, payloads: PayloadItem[]): string[] {
    const names: string[] = [];
    const regex = /\$\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      const name = match[1];
      const payload = payloads.find((p) => p.name === name);
      if (payload && payload.enabled) {
        names.push(name);
      }
    }
    return names;
  }

  /**
   * Apply payload values to a template
   * Returns array of substituted strings
   */
  applyPayloadToTemplate(template: string, payload: PayloadItem, value: string): string {
    const placeholder = `\${${payload.name}}`;
    return template.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      value,
    );
  }

  /**
   * Generate all combinations of multiple payloads
   */
  generateCombinations(payloads: PayloadItem[]): Array<Record<string, string>> {
    const enabledPayloads = this.getEnabledPayloads(payloads);
    if (enabledPayloads.length === 0) return [];

    const result: Array<Record<string, string>> = [];

    const generate = (index: number, current: Record<string, string>) => {
      if (index >= enabledPayloads.length) {
        result.push({ ...current });
        return;
      }

      const payload = enabledPayloads[index];
      for (const value of payload.values) {
        current[payload.name] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return result;
  }

  /**
   * Format combination as label
   */
  formatCombinationLabel(combination: Record<string, string>): string {
    return Object.entries(combination)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
  }

  /**
   * Parse payloads from CSV/TSV file content
   */
  parsePayloadsFromFile(content: string): PayloadItem[] {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    const result: PayloadItem[] = [];

    for (const line of lines) {
      // Try to parse as TSV: name\tdescription\tvalues
      const parts = line.split('\t');
      if (parts.length >= 3) {
        result.push({
          id: crypto.randomUUID(),
          name: parts[0].trim(),
          description: parts[1].trim(),
          values: parts[2]
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v),
          enabled: true,
        });
      } else {
        // Fallback: treat as just values
        const values = line
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v);
        if (values.length > 0) {
          result.push({
            id: crypto.randomUUID(),
            name: `Payload ${result.length + 1}`,
            description: '',
            values,
            enabled: true,
          });
        }
      }
    }

    return result;
  }

  /**
   * Export payloads to TSV format
   */
  exportPayloadsToFile(payloads: PayloadItem[]): string {
    return payloads.map((p) => [p.name, p.description, p.values.join(', ')].join('\t')).join('\n');
  }
}

export const payloadService = new PayloadService();
export default payloadService;
