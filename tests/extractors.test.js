/**
 * tests/extractors.test.js - Unit Tests for Product Extractors
 * 
 * Tests the extractProductKey function with various fixtures
 * using jsdom to simulate browser environment
 * 
 * RUN: npm test
 */

// Polyfill for Node.js <20
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

const { JSDOM } = require('jsdom');

// Mock fixtures
const FIXTURES = {
  amazon: {
    url: 'https://www.amazon.in/dp/B0BN94DM8Z/ref=abc',
    html: `
      <html>
        <head>
          <meta property="og:title" content="Apple iPhone 14 Pro Max 256GB">
          <meta property="og:image" content="https://m.media-amazon.com/images/I/test.jpg">
        </head>
        <body>
          <div data-asin="B0BN94DM8Z"></div>
        </body>
      </html>
    `,
    expected: {
      site: 'amazon',
      id: 'B0BN94DM8Z',
      canonical_key: 'amazon:B0BN94DM8Z'
    }
  },
  
  flipkart: {
    url: 'https://www.flipkart.com/apple-iphone-14-pro/p/itmghc89gxvkzyxr?pid=MOBGHC89GXVKZYXR',
    html: `
      <html>
        <head>
          <meta property="og:title" content="Apple iPhone 14 Pro">
          <meta property="og:url" content="https://www.flipkart.com/product/p/itmghc89gxvkzyxr?pid=MOBGHC89GXVKZYXR">
          <meta property="og:image" content="https://rukminim1.flixcart.com/image/test.jpg">
        </head>
        <body></body>
      </html>
    `,
    expected: {
      site: 'flipkart',
      id: 'MOBGHC89GXVKZYXR',
      canonical_key: 'flipkart:MOBGHC89GXVKZYXR'
    }
  },
  
  myntra_jsonld: {
    url: 'https://www.myntra.com/tshirts/roadster/roadster-men-navy-blue-printed-round-neck-t-shirt/12345678/buy',
    html: `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Roadster Men Navy Blue T-Shirt",
            "sku": "12345678",
            "image": "https://assets.myntassets.com/test.jpg",
            "model": "RDSTR-12345"
          }
          </script>
        </head>
        <body></body>
      </html>
    `,
    expected: {
      site: 'myntra',
      id: '12345678',
      canonical_key: 'myntra:12345678'
    }
  },
  
  meesho_jsonld: {
    url: 'https://www.meesho.com/product/mens-tshirt/87654321',
    html: `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Mens Cotton T-Shirt",
            "productID": "87654321",
            "image": "https://images.meesho.com/test.jpg"
          }
          </script>
        </head>
        <body></body>
      </html>
    `,
    expected: {
      site: 'meesho',
      id: '87654321',
      canonical_key: 'meesho:87654321'
    }
  },
  
  non_product: {
    url: 'https://www.amazon.in/gp/help/customer/display.html',
    html: '<html><body><h1>Help Page</h1></body></html>',
    expected: null
  }
};

/**
 * Setup JSDOM environment for a fixture
 */
function setupFixture(fixture) {
  const dom = new JSDOM(fixture.html, {
    url: fixture.url,
    runScripts: 'dangerously',
    resources: 'usable'
  });
  
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  
  return dom;
}

/**
 * Cleanup JSDOM environment
 */
function cleanupFixture() {
  delete global.window;
  delete global.document;
  delete global.navigator;
}

describe('Product Extractors', () => {
  // Load the extractor module
  let extractProductKey;
  
  beforeAll(() => {
    // Import after setting up globals
    setupFixture(FIXTURES.amazon);
    const extractors = require('../extension/content/extractors');
    extractProductKey = extractors.extractProductKey;
    cleanupFixture();
  });
  
  afterEach(() => {
    cleanupFixture();
  });
  
  test('should extract Amazon ASIN from URL', async () => {
    setupFixture(FIXTURES.amazon);
    
    const result = await extractProductKey();
    
    expect(result).not.toBeNull();
    expect(result.site).toBe(FIXTURES.amazon.expected.site);
    expect(result.id).toBe(FIXTURES.amazon.expected.id);
    expect(result.canonical_key).toBe(FIXTURES.amazon.expected.canonical_key);
    expect(result.title).toBeTruthy();
  });
  
  test('should extract Flipkart PID from URL', async () => {
    setupFixture(FIXTURES.flipkart);
    
    const result = await extractProductKey();
    
    expect(result).not.toBeNull();
    expect(result.site).toBe(FIXTURES.flipkart.expected.site);
    expect(result.id).toBe(FIXTURES.flipkart.expected.id);
    expect(result.canonical_key).toBe(FIXTURES.flipkart.expected.canonical_key);
  });
  
  test('should extract Myntra styleId from JSON-LD', async () => {
    setupFixture(FIXTURES.myntra_jsonld);
    
    const result = await extractProductKey();
    
    expect(result).not.toBeNull();
    expect(result.site).toBe(FIXTURES.myntra_jsonld.expected.site);
    expect(result.id).toBe(FIXTURES.myntra_jsonld.expected.id);
    expect(result.canonical_key).toBe(FIXTURES.myntra_jsonld.expected.canonical_key);
    expect(result.title).toBeTruthy();
    expect(result.model).toBe('RDSTR-12345');
  });
  
  test('should extract Meesho productId from JSON-LD', async () => {
    setupFixture(FIXTURES.meesho_jsonld);
    
    const result = await extractProductKey();
    
    expect(result).not.toBeNull();
    expect(result.site).toBe(FIXTURES.meesho_jsonld.expected.site);
    expect(result.id).toBe(FIXTURES.meesho_jsonld.expected.id);
    expect(result.canonical_key).toBe(FIXTURES.meesho_jsonld.expected.canonical_key);
  });
  
  test('should return null for non-product pages', async () => {
    setupFixture(FIXTURES.non_product);
    
    const result = await extractProductKey();
    
    expect(result).toBeNull();
  });
  
  test('should extract title from og:title meta tag', async () => {
    setupFixture(FIXTURES.amazon);
    
    const result = await extractProductKey();
    
    expect(result.title).toContain('iPhone 14 Pro');
  });
  
  test('should extract image from og:image meta tag', async () => {
    setupFixture(FIXTURES.amazon);
    
    const result = await extractProductKey();
    
    expect(result.image).toBeTruthy();
    expect(result.image).toContain('m.media-amazon.com');
  });
});

describe('Canonical Key Format', () => {
  test('should always return format {site}:{id}', async () => {
    const testCases = [
      FIXTURES.amazon,
      FIXTURES.flipkart,
      FIXTURES.myntra_jsonld,
      FIXTURES.meesho_jsonld
    ];
    
    for (const fixture of testCases) {
      setupFixture(fixture);
      const { extractProductKey } = require('../extension/content/extractors');
      const result = await extractProductKey();
      cleanupFixture();
      
      if (result) {
        expect(result.canonical_key).toMatch(/^[a-z]+:[A-Z0-9]+$/i);
        expect(result.canonical_key).toBe(`${result.site}:${result.id}`);
      }
    }
  });
});
