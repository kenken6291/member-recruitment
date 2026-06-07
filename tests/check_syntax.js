const fs = require('fs');
const vm = require('vm');

try {
  const html = fs.readFileSync('C:/Users/user/.antigravity-ide/index.html', 'utf8');
  
  // Extract content of <script type="module">
  const scriptRegex = /<script\b[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    let code = match[1];
    // Replace import statements with comments so vm.Script doesn't throw on ES module imports
    code = code.replace(/import\s+[\s\S]*?from\s+['"].*?['"];/g, (m) => m.split('\n').map(l => '// ' + l).join('\n'));
    
    count++;
    console.log(`Checking script block #${count}...`);
    try {
      new vm.Script(code);
      console.log(`Script block #${count} syntax is OK.`);
    } catch (e) {
      console.error(`Syntax Error in script block #${count}:`, e.message);
      // Log surrounding lines
      const lines = code.split('\n');
      const errLine = e.stack.split('\n')[0];
      console.error(errLine);
      process.exit(1);
    }
  }
  
  if (count === 0) {
    console.log("No <script type='module'> found in index.html");
  } else {
    console.log("Syntax validation complete. All scripts are syntactically valid.");
  }
} catch (err) {
  console.error("Failed to run syntax check:", err.message);
  process.exit(1);
}
