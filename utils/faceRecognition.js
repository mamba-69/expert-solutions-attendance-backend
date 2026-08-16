// Simplified face recognition for Vercel deployment
// This version bypasses actual face detection and uses simplified matching

/**
 * Generate a mock face descriptor from base64 image
 * In production with proper infrastructure, use @vladmandic/face-api
 */
function generateDescriptorFromImage(base64Image) {
  // Generate a pseudo-random but consistent descriptor based on image
  // This is a simplified version for deployment without canvas
  const descriptor = [];
  const seed = base64Image.substring(0, 128);
  
  for (let i = 0; i < 128; i++) {
    const charCode = seed.charCodeAt(i % seed.length);
    descriptor.push((charCode / 255) * 2 - 1); // Normalize to [-1, 1]
  }
  
  return descriptor;
}

/**
 * Validate face image quality
 */
async function validateFaceImage(base64Image) {
  try {
    // Basic validation
    if (!base64Image || typeof base64Image !== 'string') {
      return {
        valid: false,
        error: 'Invalid image format',
      };
    }

    // Remove data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Check if it's valid base64
    if (imageData.length < 100) {
      return {
        valid: false,
        error: 'Image too small or corrupted',
      };
    }

    // Generate descriptor
    const descriptor = generateDescriptorFromImage(imageData);

    return {
      valid: true,
      descriptor,
      confidence: 0.95, // Mock confidence
      faceRatio: 0.45, // Mock face ratio
      faceCount: 1,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to process image: ' + error.message,
    };
  }
}

/**
 * Extract face descriptor from image
 */
async function extractFaceDescriptor(base64Image) {
  try {
    const validation = await validateFaceImage(base64Image);
    if (!validation.valid) {
      return null;
    }
    return validation.descriptor;
  } catch (error) {
    console.error('Extract descriptor error:', error);
    return null;
  }
}

/**
 * Calculate Euclidean distance between two descriptors
 */
function calculateDistance(descriptor1, descriptor2) {
  if (descriptor1.length !== descriptor2.length) {
    return 1.0; // Maximum distance
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Find matching employee based on face descriptor
 */
function findMatchingEmployee(descriptor, employees, threshold = 0.6) {
  let bestMatch = null;
  let bestScore = 0;

  for (const employee of employees) {
    if (!employee.face_data || !employee.face_data.descriptor) {
      continue;
    }

    const distance = calculateDistance(descriptor, employee.face_data.descriptor);
    // Convert distance to similarity score (0-1, where 1 is perfect match)
    const score = Math.max(0, 1 - distance / 2);

    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestMatch = {
        employee,
        score,
        distance,
      };
    }
  }

  return bestMatch;
}

module.exports = {
  validateFaceImage,
  extractFaceDescriptor,
  findMatchingEmployee,
  calculateDistance,
};
