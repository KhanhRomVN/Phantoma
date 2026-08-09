/**
 * Test file for regex syntax highlighting
 */

// Simple regex
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Regex with flags
const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Named capture groups
const datePattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;

// Test strings
const testEmail = "test@example.com";
const isValid = emailPattern.test(testEmail);

// String replace with regex
const text = "Hello World 123";
const replaced = text.replace(/\d+/g, "XXX");

// Match groups
const dateString = "2024-01-15";
const match = dateString.match(datePattern);
if (match && match.groups) {
  console.log(match.groups.year);   // "2024"
  console.log(match.groups.month);  // "01"
  console.log(match.groups.day);    // "15"
}

// Split with regex
const words = "one,two;three:four".split(/[,:;]/);

// Regex in template literal (NOT a regex - just a string!)
const notARegex = `/pattern/g`;  // This is a STRING, not regex!

// Real regex literal
const realRegex = /pattern/g;     // This IS a regex!

export { emailPattern, urlPattern, datePattern };
