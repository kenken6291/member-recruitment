module.paths.push('C:\\Users\\user\\\.antigravity-ide\\node_modules');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/user/.gemini/antigravity-ide/brain/de807c06-95e8-4c75-aae9-baaae3adf029';

// Find local chrome path
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || 'C:', 'Google\\Chrome\\Application\\chrome.exe')
];
let executablePath = null;
for (const p of chromePaths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

if (!executablePath) {
  console.error("Chrome executable not found.");
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();

  // Clear storage to force login screen
  await page.evaluateOnNewDocument(() => {
    sessionStorage.clear();
  });

  console.log("Navigating to target page...");
  await page.goto('http://localhost:8000/index.html?mock=true&v=fix_verified_2', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // --- Login Screen Test ---
  console.log("Testing password toggle on login screen...");
  await page.type('#loginPassword', 'demopassword');

  // Verify initial type is 'password'
  let inputType = await page.$eval('#loginPassword', el => el.type);
  console.log("Initial Login Password Input Type:", inputType); // should be 'password'

  // Screenshot 7: Password masked (default eye-off icon)
  await page.screenshot({ path: `${ARTIFACT_DIR}/7_login_password_toggle_off.png` });
  console.log("Screenshot 7 saved.");

  // Click password toggle button in the login password field
  const toggleSelector = '#loginCard .password-input-container .password-toggle-btn';
  await page.click(toggleSelector);
  await sleep(500);

  // Verify type changed to 'text'
  inputType = await page.$eval('#loginPassword', el => el.type);
  console.log("After Click, Login Password Input Type:", inputType); // should be 'text'

  // Screenshot 8: Password revealed (eye icon)
  await page.screenshot({ path: `${ARTIFACT_DIR}/8_login_password_toggle_on.png` });
  console.log("Screenshot 8 saved.");

  // Perform Login
  console.log("Logging in...");
  await page.type('#loginEmail', 'ken@example.com');
  // Re-enter password because type was changed, let's just make sure it's 'password'
  await page.click('#loginPassword');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('#loginPassword', 'password');
  
  await page.click('#loginSubmitBtn');
  await sleep(2500);

  // --- Profile Screen Test ---
  console.log("Opening profile edit modal...");
  await page.waitForSelector('#profileNavBtn', { visible: true, timeout: 5000 });
  await page.click('#profileNavBtn');
  await sleep(1500);

  console.log("Testing password toggles inside profile edit modal...");
  await page.type('#profileCurrentPassword', 'currentpass');
  await page.type('#profileNewPassword', 'newpass');
  await page.type('#profileNewPasswordConfirm', 'newpass');

  // Click toggle for 'profileNewPassword'
  await page.click('#profileNewPassword ~ .password-toggle-btn');
  // Click toggle for 'profileNewPasswordConfirm'
  await page.click('#profileNewPasswordConfirm ~ .password-toggle-btn');
  await sleep(500);

  // Screenshot 9: Profile passwords toggled
  await page.screenshot({ path: `${ARTIFACT_DIR}/9_profile_passwords_toggled.png` });
  console.log("Screenshot 9 saved.");

  // Close modal
  await page.click('#profileModal button.graph-reset-btn');
  await sleep(500);

  await browser.close();
  console.log("E2E password toggle test run finished successfully.");
}

run().catch(err => {
  console.error("E2E test run failed:", err);
  process.exit(1);
});
