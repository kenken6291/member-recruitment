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
  console.error("Chrome executable not found. Tested paths:", chromePaths);
  process.exit(1);
}

console.log("Using Chrome at:", executablePath);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new', // Run in headless mode
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();
  
  // Set up alert dialog acceptance for SMS simulation
  page.on('dialog', async dialog => {
    console.log(`[ALERT] Dialog opened: "${dialog.message()}"`);
    await dialog.accept();
    console.log('[ALERT] Dialog accepted');
  });

  // Clear storage on launch to force fresh login flow every time
  await page.evaluateOnNewDocument(() => {
    sessionStorage.clear();
  });

  console.log("Navigating to target page...");
  await page.goto('http://localhost:8000/index.html?mock=true&v=fix_verified_2', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // 1. Check if logged in. If not, log in.
  const loginCardVisible = await page.evaluate(() => {
    const card = document.getElementById('loginCard');
    return card && card.style.display !== 'none';
  });

  if (loginCardVisible) {
    console.log("Logging in with demo credentials...");
    await page.type('#loginEmail', 'ken@example.com');
    await page.type('#loginPassword', 'password');
    await page.click('#loginSubmitBtn');
    await sleep(2500);
  } else {
    console.log("Already logged in or login card is not displayed.");
  }

  // Save screenshot 1: Logged in dashboard
  await page.screenshot({ path: `${ARTIFACT_DIR}/1_dashboard_logged_in.png` });
  console.log("Screenshot 1 saved.");

  // 2. Click profileNavBtn to open Profile Edit Modal
  console.log("Opening profile edit modal...");
  await page.waitForSelector('#profileNavBtn', { visible: true, timeout: 5000 });
  await page.click('#profileNavBtn');
  await sleep(1500);

  // Save screenshot 2: Profile Modal opened
  await page.screenshot({ path: `${ARTIFACT_DIR}/2_profile_modal_opened.png` });
  console.log("Screenshot 2 saved.");

  // 3. Edit nickname to 'デモユーザー改' (no password needed)
  console.log("Updating nickname...");
  // Clear field and type new value
  await page.click('#profileNickname', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#profileNickname', 'デモユーザー改');
  
  await page.click('#profileSaveBtn');
  await sleep(2000); // Wait for mock delay

  // Save screenshot 3: Dashboard after nickname change
  await page.screenshot({ path: `${ARTIFACT_DIR}/3_nickname_changed.png` });
  console.log("Screenshot 3 saved.");

  // Verify nickname change immediately in badge
  const badgeText = await page.$eval('#boardUserNickname', el => el.textContent);
  console.log("Updated Badge Nickname:", badgeText);

  // 4. Edit phone number and reauthenticate
  console.log("Re-opening profile modal to change phone number...");
  await page.click('#profileNavBtn');
  await sleep(1000);

  // Clear phone, enter new phone and current password
  await page.click('#profilePhone');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('#profilePhone', '09099999999');

  await page.type('#profileCurrentPassword', 'password');
  
  console.log("Submitting phone number change...");
  await page.click('#profileSaveBtn');
  await sleep(1500); // Wait for SMS dialog and overlay load

  // Save screenshot 4: SMS Modal opened
  await page.screenshot({ path: `${ARTIFACT_DIR}/4_sms_modal_opened.png` });
  console.log("Screenshot 4 saved.");

  // 5. Enter SMS code '123456'
  console.log("Entering SMS code...");
  await page.type('#profileVerificationCode', '123456');
  await page.click('#profileSmsSubmitBtn');
  await sleep(2000); // Wait for mock delay

  // Save screenshot 5: Verification complete
  await page.screenshot({ path: `${ARTIFACT_DIR}/5_sms_verification_complete.png` });
  console.log("Screenshot 5 saved.");

  // 6. Re-open profile modal one last time to verify phone is saved as '09099999999'
  console.log("Opening profile modal to verify final values...");
  await page.click('#profileNavBtn');
  await sleep(1000);

  const phoneValue = await page.$eval('#profilePhone', el => el.value);
  console.log("Final saved Phone value in profile modal:", phoneValue);

  // Save screenshot 6: final modal values
  await page.screenshot({ path: `${ARTIFACT_DIR}/6_profile_updated_final.png` });
  console.log("Screenshot 6 saved.");

  try {
    await page.click('#profileModal button.graph-reset-btn');
    await sleep(500);
  } catch (e) {
    console.log("Non-critical click error at the end, continuing...", e.message);
  }

  await browser.close();
  console.log("E2E test run finished successfully.");
}

run().catch(err => {
  console.error("E2E test run failed:", err);
  process.exit(1);
});
