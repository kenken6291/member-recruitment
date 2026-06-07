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
  // 1.5MBの巨大なダミーテスト画像ファイルを一時生成
  const dummyFilePath = path.join(__dirname, 'dummy_large_image.png');
  const buffer = Buffer.alloc(1.5 * 1024 * 1024); // 1.5MB
  fs.writeFileSync(dummyFilePath, buffer);
  console.log(`Generated a 1.5MB dummy file at: ${dummyFilePath}`);

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

  // Clear storage
  await page.evaluateOnNewDocument(() => {
    sessionStorage.clear();
    localStorage.removeItem('mock_posts');
  });

  console.log("Navigating to target page...");
  await page.goto('http://localhost:8000/index.html?mock=true&v=fix_verified_2', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Login
  console.log("Logging in...");
  await page.waitForSelector('#loginEmail', { visible: true });
  await page.type('#loginEmail', 'ken@example.com');
  await page.type('#loginPassword', 'password');
  await page.click('#loginSubmitBtn');
  await sleep(2500);

  // Set alert dialog handler
  let dialogMessage = '';
  page.on('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log(`[ALERT DETECTED] message: "${dialogMessage}"`);
    await dialog.accept();
  });

  // Test 1: Upload a 1.5MB file in mock mode (should trigger alert)
  console.log("Uploading a 1.5MB file to trigger mock limit alert...");
  const fileInput = await page.$('#photoInput');
  await fileInput.uploadFile(dummyFilePath);
  await sleep(1500);

  // Take screenshot of warning state (after alert dismissed, input is cleared)
  await page.screenshot({ path: `${ARTIFACT_DIR}/19_large_image_alert_triggered.png` });
  console.log("Screenshot 19 saved.");

  if (!dialogMessage.includes('1MB以下')) {
    throw new Error(`Expected alert for 1MB limit. Actual message was: "${dialogMessage}"`);
  }
  console.log("Mock size limit alert correctly triggered!");

  // Verify that preview container is empty and input is cleared
  const previewHtml = await page.$eval('#imagePreviewContainer', el => el.innerHTML);
  if (previewHtml !== '') {
    throw new Error('Image preview was not cleared after size limit alert.');
  }

  // Test 2: Post text and verify button state and posting success
  console.log("Posting text message to verify standard posting & button restoration...");
  await page.type('#hobbyCategory', '卓球');
  await page.type('#comment', 'エラーハンドリングテスト完了。');
  
  // Submit
  await page.click('#boardSubmitBtn');
  
  // Wait for submission text
  console.log("Waiting for posting response message...");
  await sleep(2000);

  // Take screenshot of successful post
  await page.screenshot({ path: `${ARTIFACT_DIR}/20_error_handling_post_success.png` });
  console.log("Screenshot 20 saved.");

  // Check if response box has "投稿が完了しました！"
  const responseBoxText = await page.$eval('#boardResponseMessage', el => el.textContent);
  if (!responseBoxText.includes('投稿が完了しました')) {
    throw new Error(`Expected success message. Actual: "${responseBoxText}"`);
  }

  // Verify button is enabled and spinner is hidden
  const btnDisabled = await page.$eval('#boardSubmitBtn', el => el.disabled);
  const spinnerVisible = await page.$eval('#boardSpinner', el => el.style.display !== 'none');
  
  if (btnDisabled || spinnerVisible) {
    throw new Error('Submit button remained disabled or spinner stayed visible after successful post.');
  }
  console.log("Submit button correctly re-enabled and spinner hidden!");

  // Verify timeline updated
  const timelineText = await page.$eval('#messageTimeline', el => el.textContent);
  if (!timelineText.includes('エラーハンドリングテスト完了。')) {
    throw new Error('Posted comment was not found in the timeline.');
  }
  console.log("Timeline successfully updated!");

  // Clean up dummy file
  try {
    fs.unlinkSync(dummyFilePath);
    console.log("Dummy file cleaned up.");
  } catch (err) {
    console.error("Failed to delete dummy file:", err);
  }

  await browser.close();
  console.log("E2E error handling test run finished successfully!");
}

run().catch(err => {
  console.error("E2E error handling test run failed:", err);
  process.exit(1);
});
