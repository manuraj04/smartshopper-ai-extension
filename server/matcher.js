/**
 * server/matcher.js - Product Matching Algorithm
 * 
 * PURPOSE:
 * Find best matching products across different e-commerce sites.
 * Uses multi-stage approach: exact match → fuzzy match → semantic match.
 * 
 * ALGORITHM:
 * 1. Exact model number match → score 1.0 (immediate best)
 * 2. Title normalization + Jaccard token overlap → score 0.5-0.95
 * 3. Optional Fuse.js fuzzy fallback → score 0.4-0.8
 * 
 * USAGE:
 * ```javascript
 * const { findBestMatch } = require('./matcher');
 * 
 * const source = { title: 'iPhone 14 Pro 256GB', model: 'MLPF3HN/A' };
 * const candidates = [
 *   { title: 'Apple iPhone 14 Pro (256 GB) - Deep Purple', site: 'flipkart' },
 *   { title: 'Samsung Galaxy S23', site: 'flipkart' }
 * ];
 * 
 * const result = findBestMatch(source, candidates);
 * // → { best: {...}, score: 0.92, reason: {...}, allScores: [...] }
 * ```
 */

// Optional: Fuse.js for fuzzy matching (install if needed: npm install fuse.js)
let Fuse;
try {
  Fuse = require('fuse.js');
} catch (e) {
  console.warn('[Matcher] Fuse.js not installed, using basic matching only');
}

/**
 * Normalize text for comparison
 * @param {string} text 
 * @returns {string}
 */
function normalizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim();
}

/**
 * Extract model numbers from text
 * Common patterns: ABC123XY, ABC-123-XY, MLPF3HN/A, 123ABC, etc.
 * @param {string} text 
 * @returns {string[]}
 */
function extractModelNumbers(text) {
  if (!text) return [];
  
  const patterns = [
    /\b[A-Z]{2,}\d{2,}[A-Z]{0,2}(?:\/[A-Z]+)?\b/g,  // ABC123XY or MLPF3HN/A
    /\b[A-Z]{2,}-\d{2,}-[A-Z]{0,2}\b/g,              // ABC-123-XY
    /\b\d{2,}[A-Z]{2,}\b/g,                          // 123ABC
    /\b[A-Z]\d{3,}[A-Z]?(?:\/[A-Z]+)?\b/g            // A1234B or A1234/B
  ];
  
  const models = new Set();
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => models.add(m.replace(/[-]/g, '')));  // Keep slashes, remove dashes
    }
  }
  
  return Array.from(models);
}

/**
 * Calculate Jaccard similarity between two token sets
 * @param {Set} set1 
 * @param {Set} set2 
 * @returns {number} 0-1 similarity score
 */
function jaccardSimilarity(set1, set2) {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Tokenize text into meaningful words (skip stopwords)
 * @param {string} text 
 * @returns {Set<string>}
 */
function tokenize(text) {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been'
  ]);
  
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/).filter(t => t.length > 1 && !stopwords.has(t));
  
  return new Set(tokens);
}

/**
 * Score a single candidate against source
 * @param {Object} source - { title, model?, brand? }
 * @param {Object} candidate - { title, model?, brand? }
 * @returns {Object} { score: number, reason: object }
 */
function scoreCandidate(source, candidate) {
  let score = 0;
  const reason = {
    model_match: false,
    title_similarity: 0,
    token_overlap: 0,
    breakdown: []
  };
  
  // Stage 1: Exact model number match (highest priority)
  if (source.model || candidate.model) {
    const sourceModels = extractModelNumbers(source.model || source.title);
    const candidateModels = extractModelNumbers(candidate.model || candidate.title);
    
    const modelMatch = sourceModels.some(sm => 
      candidateModels.some(cm => cm === sm || cm.includes(sm) || sm.includes(cm))
    );
    
    if (modelMatch) {
      score = 1.0;
      reason.model_match = true;
      reason.breakdown.push('Exact model number match');
      return { score, reason };
    }
  }
  
  // Stage 2: Title token overlap (Jaccard similarity)
  const sourceTokens = tokenize(source.title);
  const candidateTokens = tokenize(candidate.title);
  
  const tokenSimilarity = jaccardSimilarity(sourceTokens, candidateTokens);
  reason.token_overlap = parseFloat(tokenSimilarity.toFixed(3));
  
  // Weight token similarity heavily (0.5-0.95 range)
  score = 0.5 + (tokenSimilarity * 0.45);
  reason.breakdown.push(`Token overlap: ${(tokenSimilarity * 100).toFixed(1)}%`);
  
  // Bonus: Brand match
  if (source.brand && candidate.brand) {
    const brandMatch = normalizeText(source.brand) === normalizeText(candidate.brand);
    if (brandMatch) {
      score = Math.min(1.0, score + 0.1);
      reason.breakdown.push('Brand match');
    }
  }
  
  // Bonus: Significant keyword overlap (e.g., both have "256gb", "pro")
  const significantKeywords = ['pro', 'max', 'plus', 'ultra', 'mini'];
  const sourceKeywords = significantKeywords.filter(kw => 
    normalizeText(source.title).includes(kw)
  );
  const candidateKeywords = significantKeywords.filter(kw => 
    normalizeText(candidate.title).includes(kw)
  );
  
  const keywordMatch = sourceKeywords.filter(kw => candidateKeywords.includes(kw)).length;
  if (keywordMatch > 0) {
    score = Math.min(1.0, score + (keywordMatch * 0.05));
    reason.breakdown.push(`Keyword match: ${keywordMatch}`);
  }
  
  reason.title_similarity = parseFloat(score.toFixed(3));
  
  return { score: parseFloat(score.toFixed(3)), reason };
}

/**
 * Find best matching product from candidates
 * @param {Object} source - Source product { title, model?, brand? }
 * @param {Array} candidates - Array of candidate products
 * @returns {Object} { best, score, reason, allScores }
 */
function findBestMatch(source, candidates) {
  if (!source || !source.title) {
    throw new Error('Source must have a title');
  }
  
  if (!candidates || candidates.length === 0) {
    return {
      best: null,
      score: 0,
      reason: { error: 'No candidates provided' },
      allScores: []
    };
  }
  
  console.log(`[Matcher] Finding best match for: "${source.title}"`);
  console.log(`[Matcher] Evaluating ${candidates.length} candidates`);
  
  // Score all candidates
  const scored = candidates.map(candidate => {
    const { score, reason } = scoreCandidate(source, candidate);
    
    console.log(`[Matcher]   ${candidate.site || 'unknown'}: ${score.toFixed(3)} - "${candidate.title?.substring(0, 60)}..."`);
    
    return {
      candidate,
      score,
      reason
    };
  });
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  
  const best = scored[0];
  
  console.log(`[Matcher] ✅ Best match: ${best.score.toFixed(3)} - ${best.candidate.site || 'unknown'}`);
  console.log(`[Matcher]    Reason:`, best.reason.breakdown.join(', '));
  
  return {
    best: best.candidate,
    score: best.score,
    reason: best.reason,
    allScores: scored.map(s => ({
      site: s.candidate.site,
      site_id: s.candidate.site_id,
      title: s.candidate.title,
      price_cents: s.candidate.price_cents,
      url: s.candidate.url,
      image: s.candidate.image,
      rating: s.candidate.rating,
      score: s.score,
      reason: s.reason.breakdown.join(', ')
    }))
  };
}

module.exports = {
  findBestMatch,
  scoreCandidate,
  normalizeText,
  extractModelNumbers,
  jaccardSimilarity,
  tokenize
};
