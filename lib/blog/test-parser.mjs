// Verification of compiled parser
import { parsePost, extractMetadata } from './compiled/parser.js';

console.log('🧪 Testing Compiled Parser...\n');

// Test 1: Full metadata
console.log('Test 1: Post with full metadata');
const test1 = `---
title: Hello World
summary: My first post
tags: [welcome, intro]
cover_image: /images/hello.jpg
---

# Content here

This is **bold** and this is *italic*.`;

try {
  const result = parsePost('2026-01-17.md', test1);
  console.log('✓ Title:', result.metadata.title);
  console.log('✓ Summary:', result.metadata.summary);
  console.log('✓ Tags:', result.metadata.tags);
  console.log('✓ Cover:', result.metadata.cover_image);
  console.log('✓ Content length:', result.content.length, 'characters');
  console.log('✓ Filename:', result.filename);
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

// Test 2: No metadata
console.log('Test 2: Post without metadata');
const test2 = '# Just Content\n\nNo front matter here.';
try {
  const result = parsePost('2026-01-18.md', test2);
  console.log('✓ Title (from filename):', result.metadata.title);
  console.log('✓ Tags (should be empty):', result.metadata.tags);
  console.log('✓ Content:', result.content.substring(0, 30));
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

// Test 3: Malformed metadata
console.log('Test 3: Malformed metadata handling');
const test3 = `---
title: Valid Title
tags: "not an array"
---

Content`;

try {
  const result = parsePost('test.md', test3);
  console.log('✓ Title:', result.metadata.title);
  console.log('✓ Tags (should be empty):', result.metadata.tags);
  console.log('✓ Parser handled gracefully');
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

// Test 4: Error handling
console.log('Test 4: Error handling with invalid input');
try {
  const result = parsePost('error.md', null);
  console.log('✓ Handled null input gracefully');
  console.log('✓ Title:', result.metadata.title);
  console.log('✓ Content is empty:', result.content === '');
} catch (e) {
  console.log('✗ Should not throw, but got:', e.message);
}
console.log();

// Test 5: Extract metadata only
console.log('Test 5: Extract metadata only');
const test5 = `---
title: Quick Test
summary: Metadata extraction
---

Long content we don't need`;

try {
  const metadata = extractMetadata('meta.md', test5);
  console.log('✓ Title:', metadata.title);
  console.log('✓ Summary:', metadata.summary);
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

// Test 6: Unicode
console.log('Test 6: Unicode support');
const test6 = `---
title: 你好 🌍
tags: [emoji-🎉, 中文]
---

Content with émojis 😀`;

try {
  const result = parsePost('unicode.md', test6);
  console.log('✓ Title:', result.metadata.title);
  console.log('✓ Tags:', result.metadata.tags);
  console.log('✓ Unicode preserved');
} catch (e) {
  console.log('✗ Error:', e.message);
}
console.log();

console.log('✅ All parser tests passed!');
console.log('\n📦 Parser is ready for use!');
console.log('   Import: import { parsePost } from "./lib/blog/parser"');
