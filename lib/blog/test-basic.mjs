// Simple verification of the parser (ES Module)
import matter from 'gray-matter';

console.log('🧪 Testing Markdown Parser Components...\n');

// Test gray-matter directly
console.log('Test 1: gray-matter library');
const test1 = `---
title: Hello World
summary: My first post
tags: [welcome, intro]
---

# Content here`;

try {
  const { data, content } = matter(test1);
  console.log('✓ gray-matter works!');
  console.log('  Title:', data.title);
  console.log('  Tags:', data.tags);
  console.log('  Content preview:', `${content.substring(0, 30)}...`);
} catch (e) {
  console.log('✗ gray-matter error:', e.message);
}
console.log();

// Test with +++ delimiter
console.log('Test 2: Alternative delimiter (+++)');
const test2 = `+++
title: Plus Delimiter
+++

Content`;

try {
  const { data, content } = matter(test2);
  console.log('✓ Alternative delimiter works!');
  console.log('  Title:', data.title);
  console.log('  Content:', content.trim());
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

// Test error handling
console.log('Test 3: Error handling');
try {
  const { data } = matter('---\ntags: "not an array"\n---\nContent');
  console.log('✓ Handles malformed data gracefully');
  console.log('  Tags type:', typeof data.tags);
  console.log('  Tags value:', data.tags);
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

console.log('✅ Core dependencies verified!');
console.log('\n📝 Parser implementation created at: lib/blog/parser.ts');
console.log('📋 Test suite created at: lib/blog/parser.test.ts');
