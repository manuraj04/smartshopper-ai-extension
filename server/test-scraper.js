// Test script for scraper functionality
const scraper = require('./utils/scraper');

async function testScraper() {
  console.log('🧪 Testing scraper with real products...\n');
  
  // Test 1: Direct product URL scraping
  console.log('📝 Test 1: Scraping direct Amazon product URL');
  try {
    const amazonProduct = await scraper.scrapeProductUrl(
      'https://www.amazon.in/dp/B0BPX3F3Q4'
    );
    console.log('Amazon Result:', JSON.stringify(amazonProduct, null, 2));
  } catch (err) {
    console.error('Amazon test failed:', err.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Search for product
  console.log('📝 Test 2: Searching for "wireless mouse" on Flipkart');
  try {
    const searchResults = await scraper.scrapeSearchResults('flipkart', 'wireless mouse', 3);
    console.log(`Found ${searchResults.length} results:`);
    searchResults.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.productName}`);
      console.log(`   Price: ${result.price}`);
      console.log(`   URL: ${result.url?.substring(0, 60)}...`);
    });
  } catch (err) {
    console.error('Flipkart search test failed:', err.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Compare prices across sites
  console.log('📝 Test 3: Comparing "laptop bag" across all sites');
  const sites = ['amazon', 'flipkart', 'myntra'];
  const results = [];
  
  for (const site of sites) {
    try {
      console.log(`\nSearching ${site}...`);
      const result = await scraper.scrapeSite(site, 'laptop bag');
      if (result) {
        console.log(`✓ ${site}: ${result.price} - ${result.productName?.substring(0, 50)}...`);
        results.push(result);
      } else {
        console.log(`✗ ${site}: No results found`);
      }
    } catch (err) {
      console.error(`✗ ${site} failed:`, err.message);
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📊 Price Comparison Summary:');
  if (results.length > 0) {
    results.sort((a, b) => a.numericPrice - b.numericPrice);
    results.forEach((r, i) => {
      const badge = i === 0 ? '🏆 BEST' : '';
      console.log(`${r.site.padEnd(10)} | ${r.price.padEnd(12)} ${badge}`);
    });
  } else {
    console.log('No results to compare');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Extract price utility
  console.log('📝 Test 4: Testing price extraction');
  const testPrices = [
    '₹1,499.00',
    'Rs. 2,999',
    'Price: ₹599',
    '₹ 12,999.00',
    '999'
  ];
  
  testPrices.forEach(text => {
    const extracted = scraper.extractPrice(text);
    console.log(`"${text}" → ${extracted ? extracted.formatted : 'null'}`);
  });
  
  console.log('\n✅ All tests completed!');
  
  // Cleanup
  await scraper.cleanup();
  process.exit(0);
}

// Run tests
testScraper().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
