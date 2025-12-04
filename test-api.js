// Test if RapidAPI is working
import { API_CONFIG } from './config.js';

const RAPIDAPI_KEY = API_CONFIG.rapidapi.key;
const RAPIDAPI_AMAZON_HOST = API_CONFIG.rapidapi.amazon.host;

async function testAmazonAPI() {
  console.log('🧪 Testing Amazon RapidAPI...');
  console.log('API Key:', RAPIDAPI_KEY ? '✓ Present' : '✗ Missing');
  console.log('Host:', RAPIDAPI_AMAZON_HOST);
  
  try {
    const response = await fetch(
      `https://${RAPIDAPI_AMAZON_HOST}/search?query=wireless mouse&page=1&country=IN`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': RAPIDAPI_AMAZON_HOST,
          'X-RapidAPI-Key': RAPIDAPI_KEY
        }
      }
    );

    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    
    if (data.data && data.data.products) {
      console.log(`\n✓ Found ${data.data.products.length} products`);
      data.data.products.slice(0, 3).forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.product_title}`);
        console.log(`   Price: ${p.product_price}`);
        console.log(`   Rating: ${p.product_star_rating}`);
      });
    }
  } catch (err) {
    console.error('❌ API Test Failed:', err.message);
  }
}

testAmazonAPI();
