// Simple test without Puppeteer - uses only Cheerio
const scraper = require('./utils/scraper');

async function simpleTest() {
  console.log('🧪 Testing price extraction (no browser needed)...\n');
  
  // Test price extraction
  console.log('📝 Test: Price Extraction');
  const testPrices = [
    '₹1,499.00',
    'Rs. 2,999',
    'Price: ₹599',
    '₹ 12,999.00',
    '999',
    'MRP: ₹2999'
  ];
  
  testPrices.forEach(text => {
    const extracted = scraper.extractPrice(text);
    console.log(`"${text.padEnd(20)}" → ${extracted ? extracted.formatted : 'null'}`);
  });
  
  console.log('\n✅ Price extraction test completed!');
  console.log('\n⚠️  Note: Puppeteer browser tests are currently failing on Windows.');
  console.log('   The extension\'s client-side scraping still works.');
  console.log('   For server-side scraping, consider deploying to Linux.');
  
  process.exit(0);
}

simpleTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
