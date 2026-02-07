
import { readFileSync } from 'fs';

const content = readFileSync('d:\\returnneosiam-pro (18)\\components\\NCRSystem.tsx', 'utf8');
const openCount = (content.match(/<div/g) || []).length;
const closeCount = (content.match(/<\/div/g) || []).length;
console.log(`Open: ${openCount}, Close: ${closeCount}`);
