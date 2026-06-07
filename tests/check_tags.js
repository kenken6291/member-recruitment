const fs = require('fs');

try {
  const html = fs.readFileSync('c:\\Users\\user\\.antigravity-ide\\index.html', 'utf8');
  
  const tagRegex = /<\/?([a-z0-9:-]+)(?:\s+[^>]*?)?>/gi;
  let match;
  const stack = [];
  const errors = [];
  const selfClosing = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  while ((match = tagRegex.exec(html)) !== null) {
    const isClosing = match[0].startsWith('</');
    const tagName = match[1].toLowerCase();
    
    if (match[0].startsWith('<!')) continue;
    if (selfClosing.has(tagName)) continue;
    if (match[0].endsWith('/>')) continue;
    
    const line = html.substring(0, match.index).split('\n').length;
    
    if (isClosing) {
      if (stack.length === 0) {
        errors.push(`Unexpected closing tag </${tagName}> at line ${line}`);
      } else {
        const last = stack.pop();
        if (last.name !== tagName) {
          if (tagName === 'div' || tagName === 'section' || tagName === 'main' || last.name === 'div' || last.name === 'section') {
            errors.push(`Mismatched tag: expected </${last.name}> (opened at line ${last.line}), but found </${tagName}> at line ${line}`);
          }
        }
      }
    } else {
      stack.push({ name: tagName, line });
    }
  }
  
  while (stack.length > 0) {
    const last = stack.pop();
    if (last.name === 'div' || last.name === 'section' || last.name === 'main' || last.name === 'body' || last.name === 'html') {
      errors.push(`Tag <${last.name}> opened at line ${last.line} was never closed`);
    }
  }

  console.log(`Tag validation errors: ${errors.length}`);
  errors.forEach(e => console.log(e));
} catch (e) {
  console.error(e);
}
