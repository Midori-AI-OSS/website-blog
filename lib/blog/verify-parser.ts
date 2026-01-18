/**
 * Manual verification script for markdown parser
 * Run with: node --loader ts-node/esm lib/blog/verify-parser.ts
 * Or: npx tsx lib/blog/verify-parser.ts
 */

import { parsePost, extractMetadata } from './parser.js';

console.log('🧪 Testing Markdown Parser...\n');

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

const result1 = parsePost('2026-01-17.md', test1);
console.log('✓ Title:', result1.metadata.title);
console.log('✓ Summary:', result1.metadata.summary);
console.log('✓ Tags:', result1.metadata.tags);
console.log('✓ Cover:', result1.metadata.cover_image);
console.log('✓ Content preview:', result1.content.substring(0, 50) + '...');
console.log();

// Test 2: No metadata
console.log('Test 2: Post without metadata');
const test2 = '# Just Content\n\nNo front matter here.';
const result2 = parsePost('2026-01-18.md', test2);
console.log('✓ Title (from filename):', result2.metadata.title);
console.log('✓ Content:', result2.content);
console.log();

// Test 3: Malformed metadata
console.log('Test 3: Post with malformed metadata');
const test3 = `---
title: Valid Title
tags: "not an array"
---

Content stays safe`;

const result3 = parsePost('test.md', test3);
console.log('✓ Title:', result3.metadata.title);
console.log('✓ Tags (should be empty):', result3.metadata.tags);
console.log('✓ Content:', result3.content);
console.log();

// Test 4: Extract metadata only
console.log('Test 4: Extract metadata only');
const test4 = `---
title: Metadata Test
summary: Quick extraction
---

Very long content we don't need...`;

const result4 = extractMetadata('meta.md', test4);
console.log('✓ Title:', result4.title);
console.log('✓ Summary:', result4.summary);
console.log();

// Test 5: Error handling
console.log('Test 5: Error handling with invalid input');
try {
  const result5 = parsePost('error.md', null as any);
  console.log('✓ Handled gracefully - Title:', result5.metadata.title);
  console.log('✓ Content (should be empty):', result5.content === '' ? 'empty' : 'has content');
} catch (e) {
  console.log('✗ Should not throw:', e);
}
console.log();

// Test 6: Unicode
console.log('Test 6: Unicode support');
const test6 = `---
title: 你好 🌍
tags: [emoji-🎉, 中文]
---

Content with émojis 😀`;

const result6 = parsePost('unicode.md', test6);
console.log('✓ Title:', result6.metadata.title);
console.log('✓ Tags:', result6.metadata.tags);
console.log('✓ Content:', result6.content);
console.log();

console.log('✅ All verification tests completed!');
