// Script pour navigation manuelle avec capture d'erreurs
const puppeteer = require('puppeteer');

async function testManual() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--ignore-certificate-errors', '--ignore-ssl-errors']
  });
  
  const page = await browser.newPage();
  
  // Capturer les erreurs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ CONSOLE ERROR:', msg.text());
    } else if (msg.type() === 'warning') {
      console.log('⚠️ CONSOLE WARNING:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('🔥 PAGE ERROR:', error.message);
  });
  
  page.on('requestfailed', request => {
    console.log('🌐 REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  
  console.log('🚀 Navigateur ouvert - navigue manuellement !');
  console.log('📱 Toutes les erreurs seront affichées ici');
  console.log('🛑 Appuie sur Ctrl+C pour arrêter');
  
  await page.goto('http://localhost:3000');
  
  // Garde le navigateur ouvert indéfiniment
  await new Promise(() => {});
}

testManual();