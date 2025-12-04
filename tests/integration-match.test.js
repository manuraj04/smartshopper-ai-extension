/**
 * tests/integration-match.test.js - Integration Tests for Product Matching
 * 
 * Tests the matcher.js findBestMatch function with realistic product data
 * 
 * RUN: npm test
 */

const { findBestMatch, scoreCandidate } = require('../server/matcher');

describe('Product Matcher Integration', () => {
  
  test('should find exact model match with score 1.0', () => {
    const source = {
      title: 'Apple iPhone 14 Pro 256GB Deep Purple MLPF3HN/A',
      model: 'MLPF3HN/A',
      brand: 'Apple'
    };
    
    const candidates = [
      {
        site: 'flipkart',
        title: 'Apple iPhone 14 Pro (256 GB) - Deep Purple MLPF3HN/A',
        model: 'MLPF3HN/A',
        price_cents: 12990000
      },
      {
        site: 'myntra',
        title: 'Samsung Galaxy S23 Ultra',
        model: 'SM-S918B',
        price_cents: 11990000
      }
    ];
    
    const result = findBestMatch(source, candidates);
    
    expect(result.best).not.toBeNull();
    expect(result.score).toBe(1.0);
    expect(result.best.site).toBe('flipkart');
    expect(result.reason.model_match).toBe(true);
  });
  
  test('should match by title similarity when no model number', () => {
    const source = {
      title: 'Boat Airdopes 131 Wireless Earbuds',
      brand: 'Boat'
    };
    
    const candidates = [
      {
        site: 'flipkart',
        title: 'boAt Airdopes 131 Truly Wireless Earbuds - Black',
        price_cents: 129900
      },
      {
        site: 'myntra',
        title: 'Noise ColorFit Pro 3 Smart Watch',
        price_cents: 249900
      }
    ];
    
    const result = findBestMatch(source, candidates);
    
    expect(result.best).not.toBeNull();
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.best.site).toBe('flipkart');
  });
  
  test('should prefer cheaper exact match over expensive wrong match', () => {
    const source = {
      title: 'Samsung Galaxy S23 5G 128GB',
      model: 'SM-S911B'
    };
    
    const candidates = [
      {
        site: 'amazon',
        title: 'Samsung Galaxy S23 5G (128GB) - Phantom Black',
        model: 'SM-S911B',
        price_cents: 7499900
      },
      {
        site: 'flipkart',
        title: 'iPhone 14 Pro Max 512GB',
        model: 'MQ9T3HN/A',
        price_cents: 5999900  // Cheaper but wrong product
      }
    ];
    
    const result = findBestMatch(source, candidates);
    
    expect(result.best.site).toBe('amazon');
    expect(result.score).toBe(1.0);
  });
  
  test('should handle Myntra products with styleId', () => {
    const source = {
      title: 'Roadster Men Navy Blue Printed Round Neck T-shirt',
      site: 'myntra',
      site_id: '12345678'
    };
    
    const candidates = [
      {
        site: 'flipkart',
        title: 'Roadster Mens Navy Printed T-Shirt Round Neck',
        price_cents: 49900
      },
      {
        site: 'amazon',
        title: 'Roadster Men Navy Blue Printed Tshirt',
        price_cents: 52900
      }
    ];
    
    const result = findBestMatch(source, candidates);
    
    expect(result.best).not.toBeNull();
    expect(result.score).toBeGreaterThan(0.7);
  });
  
  test('should handle no candidates gracefully', () => {
    const source = {
      title: 'Test Product'
    };
    
    const result = findBestMatch(source, []);
    
    expect(result.best).toBeNull();
    expect(result.score).toBe(0);
    expect(result.reason.error).toBeTruthy();
  });
  
  test('should return all candidate scores sorted', () => {
    const source = {
      title: 'Apple iPhone 14 128GB'
    };
    
    const candidates = [
      {
        site: 'flipkart',
        title: 'Apple iPhone 14 (128 GB) - Midnight',
        price_cents: 6990000
      },
      {
        site: 'myntra',
        title: 'Samsung Galaxy A54',
        price_cents: 3599900
      },
      {
        site: 'meesho',
        title: 'Apple iPhone 14 128GB Blue',
        price_cents: 7190000
      }
    ];
    
    const result = findBestMatch(source, candidates);
    
    expect(result.allScores).toHaveLength(3);
    expect(result.allScores[0].score).toBeGreaterThanOrEqual(result.allScores[1].score);
    expect(result.allScores[1].score).toBeGreaterThanOrEqual(result.allScores[2].score);
  });
  
  test('should detect keyword matches (pro, max, plus)', () => {
    const source = {
      title: 'iPhone 14 Pro Max 256GB'
    };
    
    const candidateWithKeywords = {
      site: 'flipkart',
      title: 'Apple iPhone 14 Pro Max (256 GB)'
    };
    
    const candidateWithoutKeywords = {
      site: 'amazon',
      title: 'Apple iPhone 14 (256 GB)'
    };
    
    const score1 = scoreCandidate(source, candidateWithKeywords);
    const score2 = scoreCandidate(source, candidateWithoutKeywords);
    
    expect(score1.score).toBeGreaterThan(score2.score);
  });
});

describe('Matcher Edge Cases', () => {
  
  test('should handle missing title gracefully', () => {
    const source = {
      title: ''
    };
    
    expect(() => findBestMatch(source, [])).toThrow();
  });
  
  test('should handle special characters in title', () => {
    const source = {
      title: 'Men\'s T-Shirt (Pack of 2) - Size: L/XL'
    };
    
    const candidate = {
      site: 'flipkart',
      title: 'Mens T Shirt Pack of 2 Size L XL'
    };
    
    const result = scoreCandidate(source, candidate);
    
    expect(result.score).toBeGreaterThan(0.6);
  });
  
  test('should ignore common stopwords', () => {
    const source = {
      title: 'The Apple iPhone is the best phone in the market'
    };
    
    const candidate = {
      site: 'flipkart',
      title: 'Apple iPhone best phone market'
    };
    
    const result = scoreCandidate(source, candidate);
    
    // Should have high score despite different word count
    expect(result.score).toBeGreaterThan(0.8);
  });
});
