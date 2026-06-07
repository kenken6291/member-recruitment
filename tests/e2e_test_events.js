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
    defaultViewport: { width: 1200, height: 900 }
  });

  const page = await browser.newPage();

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.toString());
  });
  page.on('console', msg => {
    console.log('PAGE CONSOLE:', msg.text());
  });

  // Clear storage on launch to force fresh login
  await page.evaluateOnNewDocument(() => {
    sessionStorage.clear();
    localStorage.removeItem('mock_events'); // Reset events storage
  });

  console.log("Navigating to target page...");
  await page.goto('http://localhost:8000/index.html?mock=true&v=fix_verified_2', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Check if we need to log in
  const loginCardVisible = await page.evaluate(() => {
    const container = document.getElementById('authContainer');
    return container && container.style.display !== 'none';
  });

  if (loginCardVisible) {
    console.log("Logging in with demo credentials...");
    await page.waitForSelector('#loginEmail', { visible: true });
    await page.type('#loginEmail', 'ken@example.com');
    await page.type('#loginPassword', 'password');
    await sleep(500);
    await page.click('#loginSubmitBtn');
    await sleep(2500);
  } else {
    console.log("Already logged in. Skipping login step.");
  }

  // Click Events Tab
  console.log("Switching to Events Tab...");
  await page.waitForSelector('#tabBtnEvents', { visible: true });
  await page.click('#tabBtnEvents');
  await sleep(1500);

  // Screenshot 10: Events tab initially loaded
  await page.screenshot({ path: `${ARTIFACT_DIR}/10_events_tab_initial.png` });
  console.log("Screenshot 10 saved.");

  // Fill in Event Form
  console.log("Filling in event creation form...");
  await page.type('#eventName', '第1回 卓球交流大会 (Spring Ping-Pong Meet)');
  
  // Set datetime-local input value
  await page.evaluate(() => {
    document.getElementById('eventDateTime').value = '2026-06-15T10:00';
  });

  await page.type('#eventLocation', '中央区スポーツセンター 卓球室');
  await page.type('#eventJoinMethod', '当日現地集合（または本カードで参加表明）');
  await page.type('#eventDescription', '初心者から上級者まで、楽しくラリーしましょう！マイラケットをお持ちの方はご持参ください。');
  
  // Edit warning/disclaimer field
  await page.evaluate(() => {
    const terms = document.getElementById('eventTerms');
    if (terms) {
      terms.value += '\n【追加 / Additional】雨天決行です。(Event runs rain or shine.)';
    }
  });

  // Submit form
  console.log("Submitting event form...");
  await page.evaluate(() => {
    const btn = document.getElementById('eventSubmitBtn');
    if (btn) btn.click();
  });
  await sleep(2500); // Wait for mock delay

  // Screenshot 11: Event created and shown in timeline
  await page.screenshot({ path: `${ARTIFACT_DIR}/11_event_created_timeline.png` });
  console.log("Screenshot 11 saved.");

  // Verify created event details
  const firstEventTitle = await page.$eval('.event-card-title', el => el.textContent);
  console.log("Created Event Title:", firstEventTitle);

  // Click accordion details to expand Terms & Disclaimer
  console.log("Opening Terms & Disclaimer accordion in the event card...");
  await page.evaluate(() => {
    const summary = document.querySelector('.event-card details summary');
    if (summary) summary.click();
  });
  await sleep(500);

  // Screenshot 12: Accordion opened
  await page.screenshot({ path: `${ARTIFACT_DIR}/12_event_details_accordion_opened.png` });
  console.log("Screenshot 12 saved.");

  await browser.close();
  console.log("E2E event test run finished successfully.");
}

run().catch(err => {
  console.error("E2E test run failed:", err);
  process.exit(1);
});
