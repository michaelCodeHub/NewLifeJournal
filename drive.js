const { chromium } = require('playwright');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errors = [];
  page.on('console', m => { if(m.type()==='error' && !m.text().includes('403')) errors.push('[console] '+m.text().slice(0,180)); });
  page.on('pageerror', e => errors.push('[pageerror] '+e.message.split('\n')[0]));
  page.on('dialog', async d => { errors.push('[DIALOG] '+d.message()); await d.dismiss(); });
  const shot = async (name) => { await sleep(2500); await page.screenshot({ path:`/tmp/screen_${name}.png` });
    const txt=(await page.innerText('body').catch(()=>'')).replace(/\s+/g,' ').slice(0,110);
    console.log(`### ${name} | ${txt}`); };
  await page.goto('http://localhost:8081', { waitUntil:'networkidle', timeout:60000 }); await sleep(3000);
  await page.getByTestId('dev-login').click(); await sleep(2500);
  await page.getByText('Track Pregnancy').click(); await sleep(2000);
  await page.getByPlaceholder('Enter your name').fill('Test Mom');
  await page.locator('input[type="date"]').fill('2026-12-25');
  await page.getByText('Create Profile').click(); await sleep(3500);
  await shot('home');
  for (const tab of ['Timeline','Community','Chat','Home']) {
    const before=errors.length;
    try { await page.getByText(tab,{exact:true}).first().click({timeout:8000}); }
    catch(e){ errors.push('[click '+tab+'] '+e.message.split('\n')[0]); }
    await shot('tab_'+tab+(errors.length>before?'_ERR':''));
  }
  console.log('\n=== ERRORS ('+errors.length+') ===\n'+(errors.join('\n')||'(none)'));
  await browser.close();
})();
