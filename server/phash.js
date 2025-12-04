/**
 * server/phash.js - Perceptual Hash (pHash) for Image Similarity
 * 
 * PURPOSE:
 * Compute perceptual hashes for product images to find visually similar products
 * across different e-commerce sites.
 * 
 * ALGORITHM:
 * 1. Fetch image from URL
 * 2. Resize to 32x32 pixels (normalize size)
 * 3. Convert to greyscale (remove color variation)
 * 4. Apply Discrete Cosine Transform (DCT)
 * 5. Extract top-left 8x8 DCT coefficients
 * 6. Compare to median to generate 64-bit hash
 * 
 * DEPENDENCIES:
 * npm install sharp
 * 
 * USAGE:
 * ```javascript
 * const { computePHash, phashHammingDistance } = require('./phash');
 * 
 * const hash1 = await computePHash('https://example.com/image1.jpg');
 * const hash2 = await computePHash('https://example.com/image2.jpg');
 * const similarity = phashHammingDistance(hash1, hash2);
 * 
 * if (similarity < 10) {
 *   console.log('Images are very similar');
 * }
 * ```
 * 
 * NOTE: This should run server-side due to CORS and CPU cost.
 * For production, cache hashes in database to avoid recomputing.
 */

// Optional dependency - install with: npm install sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[pHash] sharp not installed. Install with: npm install sharp');
}

const https = require('https');
const http = require('http');

/**
 * Fetch image buffer from URL
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Simplified 2D DCT (Discrete Cosine Transform)
 * @param {number[][]} matrix - 2D array of pixel values
 * @returns {number[][]} DCT coefficients
 */
function dct2D(matrix) {
  const N = matrix.length;
  const M = matrix[0].length;
  const dct = Array(N).fill(0).map(() => Array(M).fill(0));
  
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < M; v++) {
      let sum = 0;
      
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < M; j++) {
          const cu = u === 0 ? Math.sqrt(1/N) : Math.sqrt(2/N);
          const cv = v === 0 ? Math.sqrt(1/M) : Math.sqrt(2/M);
          
          sum += matrix[i][j] * 
                 Math.cos((2*i + 1) * u * Math.PI / (2*N)) *
                 Math.cos((2*j + 1) * v * Math.PI / (2*M)) *
                 cu * cv;
        }
      }
      
      dct[u][v] = sum;
    }
  }
  
  return dct;
}

/**
 * Compute perceptual hash for an image
 * @param {string} imageUrl - URL or local path to image
 * @returns {Promise<string>} 64-bit hash as hex string
 */
async function computePHash(imageUrl) {
  if (!sharp) {
    throw new Error('sharp not installed. Install with: npm install sharp');
  }
  
  console.log(`[pHash] Computing hash for: ${imageUrl}`);
  
  try {
    // Step 1: Fetch image
    const imageBuffer = imageUrl.startsWith('http') 
      ? await fetchImage(imageUrl)
      : require('fs').readFileSync(imageUrl);
    
    // Step 2 & 3: Resize to 32x32 and convert to greyscale
    const { data, info } = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Convert 1D array to 2D matrix
    const matrix = [];
    for (let i = 0; i < 32; i++) {
      matrix[i] = [];
      for (let j = 0; j < 32; j++) {
        matrix[i][j] = data[i * 32 + j];
      }
    }
    
    // Step 4: Apply DCT
    const dct = dct2D(matrix);
    
    // Step 5: Extract top-left 8x8 DCT coefficients (low frequencies)
    const dctLowFreq = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        dctLowFreq.push(dct[i][j]);
      }
    }
    
    // Step 6: Compute median
    const sorted = [...dctLowFreq].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Step 7: Generate hash (1 if > median, 0 if <= median)
    let hash = '';
    for (let i = 0; i < dctLowFreq.length; i++) {
      hash += dctLowFreq[i] > median ? '1' : '0';
    }
    
    // Convert binary to hex
    const hexHash = parseInt(hash, 2).toString(16).padStart(16, '0');
    
    console.log(`[pHash] Hash computed: ${hexHash}`);
    return hexHash;
    
  } catch (error) {
    console.error('[pHash] Error computing hash:', error.message);
    throw error;
  }
}

/**
 * Calculate Hamming distance between two pHashes
 * Lower distance = more similar images (0 = identical)
 * 
 * @param {string} hash1 - Hex hash string
 * @param {string} hash2 - Hex hash string
 * @returns {number} Hamming distance (0-64)
 */
function phashHammingDistance(hash1, hash2) {
  if (!hash1 || !hash2) {
    throw new Error('Both hashes required');
  }
  
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be same length');
  }
  
  // Convert hex to binary
  const bin1 = parseInt(hash1, 16).toString(2).padStart(64, '0');
  const bin2 = parseInt(hash2, 16).toString(2).padStart(64, '0');
  
  // Count differing bits
  let distance = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) distance++;
  }
  
  return distance;
}

/**
 * Determine if two images are similar based on pHash
 * @param {string} hash1 
 * @param {string} hash2 
 * @param {number} threshold - Max Hamming distance (default 10)
 * @returns {boolean}
 */
function areSimilar(hash1, hash2, threshold = 10) {
  const distance = phashHammingDistance(hash1, hash2);
  return distance <= threshold;
}

module.exports = {
  computePHash,
  phashHammingDistance,
  areSimilar
};

/**
 * CLI usage example:
 * 
 * node server/phash.js <image_url1> <image_url2>
 */
if (require.main === module) {
  const [,, url1, url2] = process.argv;
  
  if (!url1 || !url2) {
    console.error('Usage: node server/phash.js <image_url1> <image_url2>');
    process.exit(1);
  }
  
  (async () => {
    try {
      const hash1 = await computePHash(url1);
      const hash2 = await computePHash(url2);
      const distance = phashHammingDistance(hash1, hash2);
      
      console.log('\nResults:');
      console.log(`Hash 1: ${hash1}`);
      console.log(`Hash 2: ${hash2}`);
      console.log(`Hamming Distance: ${distance}/64`);
      console.log(`Similar: ${areSimilar(hash1, hash2) ? 'YES' : 'NO'}`);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}
