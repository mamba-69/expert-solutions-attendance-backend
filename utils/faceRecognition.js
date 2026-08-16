const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const fs = require('fs').promises;
const path = require('path');

// Patch nodejs environment for face-api
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Model path
const MODEL_PATH = path.join(__dirname, '../models/face-models');

let modelsLoaded = false;

/**
 * Load face-api models
 */
async function loadModels() {
  if (modelsLoaded) {
    return;
  }

  try {
    console.log('Loading face recognition models...');
    
    // Create models directory if it doesn't exist
    await fs.mkdir(MODEL_PATH, { recursive: true });

    // Load models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Error loading face recognition models:', error.message);
    console.log('Note: Download models from: https://github.com/vladmandic/face-api/tree/master/model');
    throw new Error('Failed to load face recognition models. Please download and place them in backend/models/face-models/');
  }
}

/**
 * Detect face and extract descriptor from base64 image
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Array<number>|null>} Face descriptor (128-dimensional array) or null
 */
async function extractFaceDescriptor(base64Image) {
  try {
    await loadModels();

    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Load image
    const img = await canvas.loadImage(buffer);
    
    console.log(`Image loaded: ${img.width}x${img.height}px`);

    // Detect face with landmarks and compute descriptor
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.log('No face detected in image');
      return null; // Return null instead of mock descriptor
    }

    console.log(`Face detected with confidence: ${detection.detection.score}`);
    
    // Return the 128-dimensional descriptor as array
    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    throw error; // Throw error instead of returning mock
  }
}

/**
 * Compare two face descriptors and return similarity score
 * @param {Array<number>} descriptor1 - First face descriptor
 * @param {Array<number>} descriptor2 - Second face descriptor
 * @returns {number} Similarity score (0-1, higher is more similar)
 */
function compareFaceDescriptors(descriptor1, descriptor2) {
  try {
    // Convert arrays to Float32Array for face-api
    const desc1 = new Float32Array(descriptor1);
    const desc2 = new Float32Array(descriptor2);

    // Calculate Euclidean distance
    const distance = faceapi.euclideanDistance(desc1, desc2);

    // Convert distance to similarity score (0-1 scale)
    // Distance of 0.6 or less is considered a match
    // We invert it so higher score means better match
    const similarity = Math.max(0, 1 - distance);

    return similarity;
  } catch (error) {
    console.error('Error comparing face descriptors:', error);
    throw error;
  }
}

/**
 * Validate face image quality
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} Validation result with quality metrics
 */
async function validateFaceImage(base64Image) {
  try {
    await loadModels();

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const img = await canvas.loadImage(buffer);

    // Detect all faces in the image
    const detections = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return {
        valid: false,
        error: 'No face detected',
        faceCount: 0,
      };
    }

    if (detections.length > 1) {
      return {
        valid: false,
        error: 'Multiple faces detected. Please ensure only one face is visible.',
        faceCount: detections.length,
      };
    }

    const detection = detections[0];

    // Check face size
    const faceArea = detection.detection.box.width * detection.detection.box.height;
    const imageArea = img.width * img.height;
    const faceRatio = faceArea / imageArea;

    if (faceRatio < 0.05) {
      return {
        valid: false,
        error: 'Face is too small. Please move closer to the camera.',
        faceRatio,
      };
    }

    if (faceRatio > 0.9) {
      return {
        valid: false,
        error: 'Face is too close. Please move back from the camera.',
        faceRatio,
      };
    }

    // Check detection confidence - STRICT
    const confidence = detection.detection.score;

    if (confidence < 0.8) {  // Increased from 0.5 to 0.8 for stricter detection
      return {
        valid: false,
        error: 'Face detection confidence is too low. Please ensure good lighting and face the camera directly.',
        confidence,
      };
    }

    return {
      valid: true,
      confidence,
      faceRatio,
      descriptor: Array.from(detection.descriptor),
    };
  } catch (error) {
    console.error('Error validating face image:', error);
    return {
      valid: false,
      error: 'Failed to process image: ' + error.message,
    };
  }
}

/**
 * Find matching employee by face descriptor
 * @param {Array<number>} descriptor - Face descriptor to match
 * @param {Array<Object>} employees - Array of employee objects with face_data
 * @param {number} threshold - Minimum similarity score (default: 0.6)
 * @returns {Object|null} Matched employee with score, or null
 */
function findMatchingEmployee(descriptor, employees, threshold = 0.6) {  // Back to 0.6
  try {
    let bestMatch = null;
    let bestScore = 0;

    for (const employee of employees) {
      if (!employee.face_data || !employee.face_data.descriptor) {
        continue;
      }

      const score = compareFaceDescriptors(descriptor, employee.face_data.descriptor);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = {
          employee,
          score,
        };
      }
    }

    return bestMatch;
  } catch (error) {
    console.error('Error finding matching employee:', error);
    throw error;
  }
}

module.exports = {
  loadModels,
  extractFaceDescriptor,
  compareFaceDescriptors,
  validateFaceImage,
  findMatchingEmployee,
};
