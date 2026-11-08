#!/usr/bin/env node

/**
 * List unique invalid colors found in the codebase
 */

const { execSync } = require('child_process');

try {
  const output = execSync('node scripts/check-invalid-tailwind-colors.js', { encoding: 'utf-8' });
  
  // Extract all invalid colors
  const colorMatches = output.matchAll(/Invalid color: "([^"]+)"/g);
  const colors = new Set();
  
  for (const match of colorMatches) {
    colors.add(match[1]);
  }
  
  const sortedColors = Array.from(colors).sort();
  
  console.log('\n🎨 Unique Invalid Colors Found:\n');
  
  // Group by category
  const categories = {
    'Warning variants': [],
    'Border variants': [],
    'Background variants': [],
    'Text variants': [],
    'Table variants': [],
    'Other': [],
  };
  
  for (const color of sortedColors) {
    if (color.includes('warning')) {
      categories['Warning variants'].push(color);
    } else if (color.startsWith('border-')) {
      categories['Border variants'].push(color);
    } else if (color.includes('table-')) {
      categories['Table variants'].push(color);
    } else if (color.includes('background')) {
      categories['Background variants'].push(color);
    } else if (color.includes('muted-foreground') || color.includes('accent-')) {
      categories['Text variants'].push(color);
    } else {
      categories['Other'].push(color);
    }
  }
  
  for (const [category, items] of Object.entries(categories)) {
    if (items.length > 0) {
      console.log(`\n${category}:`);
      items.forEach(item => console.log(`  - ${item}`));
    }
  }
  
  console.log(`\n\n📊 Total: ${sortedColors.length} unique invalid colors`);
  console.log('\n💡 These should be added to tailwind.config.js or replaced with valid colors.\n');
  
} catch (error) {
  console.error('Error running check script:', error.message);
  process.exit(1);
}