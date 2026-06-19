import { describe, it, expect } from 'vitest';

/**
 * Copy of getLanguage function from Body.tsx for testing
 */
function getLanguage(contentType?: string, content?: string): string {
  // Check content type first
  if (contentType) {
    if (contentType.includes('json')) return 'json';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('xml')) return 'xml';
    if (contentType.includes('javascript') || contentType.includes('js')) return 'javascript';
    if (contentType.includes('css')) return 'css';
  }

  // If no content type or unknown, try to detect from content
  if (content) {
    const trimmed = content.trim();
    // Check if it looks like JSON (starts with { or [ and ends with } or ])
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON, continue
      }
    }
    // Check if it looks like HTML
    if (trimmed.startsWith('<') && trimmed.includes('>')) {
      return 'html';
    }
    // Check if it looks like XML
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
      return 'xml';
    }
  }

  return 'text';
}

describe('Language Detection', () => {
  describe('JSON detection', () => {
    const validJson = `{
  "code": 0,
  "msg": "",
  "data": {
    "biz_code": 0,
    "biz_msg": "",
    "biz_data": {
      "id": "9c484dfe-7fb0-4c8f-8193-eb3e62878643",
      "token": "O+N07qwtW9GtyP0uPoI7p0LCiEd03J0FEjQMmC+8gdwQa/iUTOkAaHs2eePFGyow",
      "email": "thie*******468@gmail.com",
      "mobile_number": "",
      "area_code": "",
      "status": 0
    }
  }
}`;

    it('should detect JSON from content when no contentType', () => {
      expect(getLanguage(undefined, validJson)).toBe('json');
    });

    it('should detect JSON from content when contentType is empty string', () => {
      expect(getLanguage('', validJson)).toBe('json');
    });

    it('should detect JSON from content when contentType is unknown', () => {
      expect(getLanguage('text/plain', validJson)).toBe('json');
    });

    it('should detect JSON from content when contentType is application/json', () => {
      expect(getLanguage('application/json', validJson)).toBe('json');
    });

    it('should detect JSON array', () => {
      const jsonArray = '["item1", "item2", "item3"]';
      expect(getLanguage(undefined, jsonArray)).toBe('json');
    });

    it('should not detect invalid JSON', () => {
      const invalidJson = '{ "invalid": "json" missing quote }';
      expect(getLanguage(undefined, invalidJson)).toBe('text');
    });

    it('should detect JSON even with whitespace', () => {
      const jsonWithWhitespace = '\n\n{\n  "key": "value"\n}\n\n';
      expect(getLanguage(undefined, jsonWithWhitespace)).toBe('json');
    });
  });

  describe('HTML detection', () => {
    const htmlContent = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';

    it('should detect HTML from content', () => {
      expect(getLanguage(undefined, htmlContent)).toBe('html');
    });

    it('should detect HTML from content when contentType is text/html', () => {
      expect(getLanguage('text/html', htmlContent)).toBe('html');
    });
  });

  describe('XML detection', () => {
    const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><root><item>value</item></root>';

    it('should detect XML from content', () => {
      expect(getLanguage(undefined, xmlContent)).toBe('xml');
    });

    it('should detect XML from content when contentType is application/xml', () => {
      expect(getLanguage('application/xml', xmlContent)).toBe('xml');
    });
  });

  describe('JavaScript detection', () => {
    const jsContent = 'function test() { const x = 10; return x * 2; }';

    it('should detect JavaScript from contentType', () => {
      expect(getLanguage('application/javascript', jsContent)).toBe('javascript');
      expect(getLanguage('text/javascript', jsContent)).toBe('javascript');
      expect(getLanguage('application/js', jsContent)).toBe('javascript');
    });

    it('should not detect JavaScript from content without contentType', () => {
      // JavaScript doesn't have a unique structure to detect, so it falls back to 'text'
      expect(getLanguage(undefined, jsContent)).toBe('text');
    });
  });

  describe('CSS detection', () => {
    const cssContent = '.container { display: flex; color: #333; }';

    it('should detect CSS from contentType', () => {
      expect(getLanguage('text/css', cssContent)).toBe('css');
    });

    it('should not detect CSS from content without contentType', () => {
      expect(getLanguage(undefined, cssContent)).toBe('text');
    });
  });

  describe('Text fallback', () => {
    it('should return text for plain text content', () => {
      const plainText = 'This is just plain text. Nothing special here.';
      expect(getLanguage(undefined, plainText)).toBe('text');
    });

    it('should return text for empty content', () => {
      expect(getLanguage(undefined, undefined)).toBe('text');
      expect(getLanguage(undefined, '')).toBe('text');
    });

    it('should prioritize contentType over content detection', () => {
      const jsonContent = '{"key":"value"}';
      expect(getLanguage('text/html', jsonContent)).toBe('html');
      expect(getLanguage('text/plain', jsonContent)).toBe('json'); // content detection kicks in
    });
  });

  describe('Real-world examples', () => {
    it('should detect DeepSeek API response as JSON', () => {
      const deepseekResponse = `{
  "code": 0,
  "msg": "",
  "data": {
    "biz_code": 0,
    "biz_msg": "",
    "biz_data": {
      "id": "9c484dfe-7fb0-4c8f-8193-eb3e62878643",
      "token": "O+N07qwtW9GtyP0uPoI7p0LCiEd03J0FEjQMmC+8gdwQa/iUTOkAaHs2eePFGyow",
      "email": "thie*******468@gmail.com",
      "status": 0
    }
  }
}`;
      expect(getLanguage(undefined, deepseekResponse)).toBe('json');
    });

    it('should detect GitHub API response as JSON', () => {
      const githubResponse = `[
  {
    "id": 1,
    "node_id": "MDEwOlJlcG9zaXRvcnkx",
    "name": "repo-name",
    "full_name": "user/repo-name",
    "private": false
  }
]`;
      expect(getLanguage(undefined, githubResponse)).toBe('json');
    });
  });
});