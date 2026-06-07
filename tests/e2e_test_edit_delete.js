module.paths.push('C:\\Users\\user\\\.antigravity-ide\\node_modules');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/user/.gemini/antigravity-ide/brain/de807c06-95e8-4c75-aae9-baaae3adf029';

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
    localStorage.removeItem('mock_posts');
    localStorage.removeItem('mock_events');
  });

  console.log("Navigating to target page...");
  await page.goto('http://localhost:8000/index.html?mock=true&v=fix_verified_2', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Login
  console.log("Logging in with demo credentials...");
  await page.waitForSelector('#loginEmail', { visible: true });
  await page.type('#loginEmail', 'ken@example.com');
  await page.type('#loginPassword', 'password');
  await sleep(500);
  await page.click('#loginSubmitBtn');
  await sleep(2500);

  // 1. Comment Edit/Delete E2E Test
  console.log("Creating a new post...");
  await page.type('#hobbyCategory', '卓球');
  await page.type('#comment', 'テストコメントです。後で編集と削除を行います。');
  await page.click('#boardSubmitBtn');
  await sleep(2000);

  // Check if post is created
  console.log("Verifying post creation...");
  const timelineText = await page.evaluate(() => {
    const timeline = document.getElementById('messageTimeline');
    return timeline ? timeline.textContent : '';
  });
  if (!timelineText.includes('テストコメントです')) {
    throw new Error('Post creation failed.');
  }

  // Take screenshot of board with post
  await page.screenshot({ path: `${ARTIFACT_DIR}/13_post_created_timeline.png` });
  console.log("Screenshot 13 saved.");

  // Locate edit/delete buttons
  console.log("Checking edit and delete buttons on the post...");
  const editBtnExists = await page.evaluate(() => {
    const card = document.querySelector('.parent-message');
    if (!card) return false;
    const editBtn = card.querySelector('.edit-msg-btn');
    const deleteBtn = card.querySelector('.delete-msg-btn');
    return !!editBtn && !!deleteBtn;
  });
  if (!editBtnExists) {
    throw new Error('Edit/Delete buttons not found on the post card.');
  }

  // Click edit button
  console.log("Clicking edit button...");
  await page.evaluate(() => {
    const editBtn = document.querySelector('.parent-message .edit-msg-btn');
    if (editBtn) editBtn.click();
  });
  await sleep(1000);

  // Check if textarea appeared
  const textareaExists = await page.evaluate(() => {
    const card = document.querySelector('.parent-message');
    return !!card.querySelector('.edit-comment-textarea');
  });
  if (!textareaExists) {
    throw new Error('Inline edit textarea did not appear.');
  }

  // Type new comment and save
  console.log("Updating post content...");
  await page.evaluate(() => {
    const textarea = document.querySelector('.parent-message .edit-comment-textarea');
    if (textarea) {
      textarea.value = '編集されたテストコメントです。';
      // Click save button inside edit container
      const saveBtn = document.querySelector('.parent-message .edit-textarea-container .submit-btn');
      if (saveBtn) saveBtn.click();
    }
  });
  await sleep(1500);

  // Verify post content updated
  const updatedText = await page.evaluate(() => {
    const body = document.querySelector('.parent-message .message-body');
    return body ? body.textContent : '';
  });
  if (!updatedText.includes('編集されたテストコメントです。')) {
    throw new Error(`Comment update failed. Current text: ${updatedText}`);
  }
  console.log("Post content successfully updated!");

  // Take screenshot of updated comment
  await page.screenshot({ path: `${ARTIFACT_DIR}/14_post_updated_timeline.png` });
  console.log("Screenshot 14 saved.");

  // Handle confirm dialog for delete
  console.log("Deleting the post...");
  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });

  // Click delete button
  await page.evaluate(() => {
    const deleteBtn = document.querySelector('.parent-message .delete-msg-btn');
    if (deleteBtn) deleteBtn.click();
  });
  await sleep(1500);

  // Verify post removed
  const finalTimelineText = await page.evaluate(() => {
    const timeline = document.getElementById('messageTimeline');
    return timeline ? timeline.textContent : '';
  });
  if (finalTimelineText.includes('編集されたテストコメントです。')) {
    throw new Error('Comment deletion failed.');
  }
  console.log("Post successfully deleted!");

  // Take screenshot after comment deletion
  await page.screenshot({ path: `${ARTIFACT_DIR}/15_post_deleted_timeline.png` });
  console.log("Screenshot 15 saved.");


  // 2. Event Edit/Delete E2E Test
  console.log("Switching to Events Tab...");
  await page.click('#tabBtnEvents');
  await sleep(1500);

  // Create an Event
  console.log("Creating a new event...");
  await page.type('#eventName', '第2回 編集テスト卓球大会');
  await page.evaluate(() => {
    const start = document.getElementById('eventStartDateTime');
    const end = document.getElementById('eventEndDateTime');
    start.value = '2026-06-20T14:00';
    end.value = '2026-06-20T16:00';
    start.dispatchEvent(new Event('change'));
    end.dispatchEvent(new Event('change'));
  });
  await page.type('#eventLocation', 'サブ体育館');
  await page.type('#eventDescription', 'イベント編集と削除のテスト用。');
  await page.click('#eventSubmitBtn');
  await sleep(2500);

  // Verify event creation
  const eventTimelineText = await page.evaluate(() => {
    const timeline = document.getElementById('eventTimeline');
    return timeline ? timeline.textContent : '';
  });
  if (!eventTimelineText.includes('第2回 編集テスト卓球大会')) {
    throw new Error('Event creation failed.');
  }

  // Take screenshot of event list
  await page.screenshot({ path: `${ARTIFACT_DIR}/16_event_created_timeline.png` });
  console.log("Screenshot 16 saved.");

  // Locate edit/delete buttons on event
  const eventEditBtnExists = await page.evaluate(() => {
    const card = document.querySelector('.event-card');
    if (!card) return false;
    const editBtn = card.querySelector('.edit-msg-btn');
    const deleteBtn = card.querySelector('.delete-msg-btn');
    return !!editBtn && !!deleteBtn;
  });
  if (!eventEditBtnExists) {
    throw new Error('Edit/Delete buttons not found on the event card.');
  }

  // Click event edit button
  console.log("Clicking event edit button...");
  await page.evaluate(() => {
    const editBtn = document.querySelector('.event-card .edit-msg-btn');
    if (editBtn) editBtn.click();
  });
  await sleep(1500);

  // Check if form is prefilled
  const formPrefilledName = await page.$eval('#eventName', el => el.value);
  if (formPrefilledName !== '第2回 編集テスト卓球大会') {
    throw new Error(`Event form was not correctly prefilled. Current: ${formPrefilledName}`);
  }

  // Check if submit button text changed
  const submitText = await page.$eval('#eventBtnText', el => el.textContent);
  if (!submitText.includes('更新')) {
    throw new Error(`Submit button text did not change to update mode. Text: ${submitText}`);
  }

  // Change title and update
  console.log("Updating event name...");
  await page.click('#eventName', { clickCount: 3 }); // select all
  await page.type('#eventName', '【更新】第2回 編集テスト卓球大会');
  await page.click('#eventSubmitBtn');
  await sleep(2500);

  // Verify update in timeline
  const updatedEventTimelineText = await page.evaluate(() => {
    const timeline = document.getElementById('eventTimeline');
    return timeline ? timeline.textContent : '';
  });
  if (!updatedEventTimelineText.includes('【更新】第2回 編集テスト卓球大会')) {
    throw new Error('Event update failed.');
  }
  console.log("Event successfully updated!");

  // Take screenshot of updated event
  await page.screenshot({ path: `${ARTIFACT_DIR}/17_event_updated_timeline.png` });
  console.log("Screenshot 17 saved.");

  // Delete event
  console.log("Deleting the event...");
  await page.evaluate(() => {
    const deleteBtn = document.querySelector('.event-card .delete-msg-btn');
    if (deleteBtn) deleteBtn.click();
  });
  await sleep(2000);

  // Verify deletion
  const finalEventTimelineText = await page.evaluate(() => {
    const timeline = document.getElementById('eventTimeline');
    return timeline ? timeline.textContent : '';
  });
  if (finalEventTimelineText.includes('【更新】第2回 編集テスト卓球大会')) {
    throw new Error('Event deletion failed.');
  }
  console.log("Event successfully deleted!");

  // Take screenshot after event deletion
  await page.screenshot({ path: `${ARTIFACT_DIR}/18_event_deleted_timeline.png` });
  console.log("Screenshot 18 saved.");

  await browser.close();
  console.log("E2E edit/delete test run finished successfully!");
}

run().catch(err => {
  console.error("E2E test run failed:", err);
  process.exit(1);
});
