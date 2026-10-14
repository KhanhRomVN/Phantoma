// Mock script: trích email từ văn bản thô
export function extractEmails(text) {
  const re = /[\w.+-]+@[\w-]+\.[\w.]+/g;
  return [...new Set(text.match(re) ?? [])];
}

console.log(extractEmails('Liên hệ: a@example.com, b@example.org'));