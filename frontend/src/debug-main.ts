// Debug version of main.ts
console.log('🔍 Debug main.ts loading...');

// Test 1: Basic DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 DOM loaded');
  
  const root = document.getElementById('root');
  if (!root) {
    console.error('❌ Root element not found');
    return;
  }
  
  console.log('✅ Root element found');
  
  // Test 2: Simple content
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
      <div style="text-align: center; padding: 40px;">
        <h1 style="font-size: 3rem; margin-bottom: 20px;">🔍 Debug Mode</h1>
        <p style="font-size: 1.2rem; margin-bottom: 30px;">Basic HTML/CSS working</p>
        <button id="test-btn" style="padding: 10px 20px; font-size: 1rem; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Test Click
        </button>
        <div id="test-result" style="margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;"></div>
      </div>
    </div>
  `;
  
  console.log('✅ HTML content loaded');
  
  // Test 3: Event listeners
  const button = document.getElementById('test-btn');
  const result = document.getElementById('test-result');
  
  if (button && result) {
    button.addEventListener('click', () => {
      console.log('✅ Button clicked');
      result.innerHTML = '✅ Event listeners working!<br>Ready to test router...';
    });
    console.log('✅ Event listener attached');
  }
  
  // Test 4: Try router import (delayed)
  setTimeout(() => {
    console.log('🔍 Testing router import...');
    import('./router').then(module => {
      console.log('✅ Router imported successfully', module);
      if (result) {
        result.innerHTML += '<br>✅ Router import successful';
      }
    }).catch(error => {
      console.error('❌ Router import failed:', error);
      if (result) {
        result.innerHTML += '<br>❌ Router error: ' + error.message;
      }
    });
  }, 1000);
});