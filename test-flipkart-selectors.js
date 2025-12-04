// Test Flipkart selector detection
// Instructions:
// 1. Open the Flipkart product page
// 2. Open browser console (F12)
// 3. Copy-paste this entire script and run it
// 4. It will show which selectors work

console.log('=== Flipkart Price Selector Test ===\n');

const priceSelectors = [
  'div.Nx9bqj.CxhGGd',
  'div.hl05eU div.Nx9bqj',
  'div._30jeq3._16Jk6d',
  'div._30jeq3',
  '._25b18c ._16Jk6d',
  '._25b18c div',
  '.CEmiEU div._16Jk6d',
  'div._16Jk6d',
  'div._3I9_wc._2p6lqe',
  'div._1vC4OE._3qQ9m1'
];

const nameSelectors = [
  'span.VU-ZEz',
  'h1 span.VU-ZEz',
  'h1.yhB1nd',
  'span.B_NuCI',
  'h1._6EBuvT',
  'span._35KyD6'
];

console.log('PRICE SELECTORS:');
priceSelectors.forEach(selector => {
  const elem = document.querySelector(selector);
  if (elem) {
    console.log(`✅ ${selector}`);
    console.log(`   Text: "${elem.textContent.trim()}"`);
  } else {
    console.log(`❌ ${selector}`);
  }
});

console.log('\nNAME SELECTORS:');
nameSelectors.forEach(selector => {
  const elem = document.querySelector(selector);
  if (elem) {
    console.log(`✅ ${selector}`);
    console.log(`   Text: "${elem.textContent.trim().substring(0, 100)}..."`);
  } else {
    console.log(`❌ ${selector}`);
  }
});

// Try to find price in page text
console.log('\nSEARCHING PAGE TEXT FOR PRICES:');
const bodyText = document.body.innerText;
const priceMatches = bodyText.match(/₹\s*[\d,]+/g);
if (priceMatches) {
  console.log('Found prices in text:', priceMatches.slice(0, 5));
}

console.log('\n=== Test Complete ===');
console.log('\n📋 COPY THE OUTPUT ABOVE AND SEND IT TO ME');
