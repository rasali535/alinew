const fs = require('fs');
const content = fs.readFileSync('apps/ralion/src/app/(dashboard)/growth/page.tsx', 'utf8');
const lines = content.split('\n');

let braceStack = [];
let parenStack = [];
let inString = null;
let inComment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prev = j > 0 ? line[j - 1] : '';
    const next = j < line.length - 1 ? line[j + 1] : '';

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        j++;
      }
      continue;
    }

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      break; // line comment
    }
    if (char === '/' && next === '*') {
      inComment = true;
      j++;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') braceStack.push({ line: i + 1, col: j + 1, preview: line.trim().slice(0, 40) });
    if (char === '}') {
      if (braceStack.length === 0) {
        console.log('Extra closing brace at line', i + 1);
      } else {
        braceStack.pop();
      }
    }
    if (char === '(') parenStack.push({ line: i + 1, col: j + 1 });
    if (char === ')') parenStack.pop();
  }
}

console.log('Unclosed braces count:', braceStack.length);
console.log('Unclosed braces (last 5):', braceStack.slice(-5));
console.log('Unclosed parens count:', parenStack.length);
console.log('Unclosed parens (last 5):', parenStack.slice(-5));
