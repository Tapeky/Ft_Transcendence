// Script simple pour tester les erreurs JavaScript
// Usage: node test-errors.js

const puppeteer = require('puppeteer');

async function testSite() {
  try {
    const browser = await puppeteer.launch({ 
      headless: false,
      args: ['--ignore-certificate-errors', '--ignore-ssl-errors']
    });
    
    const page = await browser.newPage();
    
    // Capturer les erreurs console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ CONSOLE ERROR:', msg.text());
      } else if (msg.type() === 'warning') {
        console.log('⚠️ CONSOLE WARNING:', msg.text());
      }
    });
    
    // Capturer les erreurs JavaScript
    page.on('pageerror', error => {
      console.log('🔥 PAGE ERROR:', error.message);
    });
    
    // Capturer les erreurs de requêtes
    page.on('requestfailed', request => {
      console.log('🌐 REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    console.log('🚀 Testing https://localhost:3000...');
    
    // Test page d'accueil
    console.log('📄 Testing homepage...');
    await page.goto('https://localhost:3000', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    // Test login automatique (si tu as un compte de test)
    console.log('🔐 Testing login...');
    try {
      // Cherche le champ email et tape automatiquement
      await page.waitForSelector('input[name="email"]', { timeout: 3000 });
      await page.type('input[name="email"]', 'test@example.com');
      await page.type('input[name="password"]', 'password123');
      
      // Clique sur le bouton de login
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      console.log('✅ Login test completed');
    } catch (e) {
      console.log('ℹ️ No login form found or login failed');
    }
    
    await page.waitForTimeout(2000);
    
    console.log('✅ Test completed');
    await browser.close();
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

testSite();