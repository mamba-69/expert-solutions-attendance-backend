const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload base64 image to ImgBB
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} name - Image name (optional)
 * @returns {Promise<string>} - Returns the image URL
 */
async function uploadToImgBB(base64Image, name = 'face_photo') {
  try {
    // ImgBB API Key (Get from: https://api.imgbb.com/)
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '69a13199c795ac16a0d03a3e08a033bc';
    
    // Remove data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', cleanBase64);
    formData.append('name', name);
    
    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 seconds
    });

    if (response.data && response.data.success) {
      return {
        success: true,
        url: response.data.data.url,
        display_url: response.data.data.display_url,
        delete_url: response.data.data.delete_url,
      };
    } else {
      throw new Error('Failed to upload image to ImgBB');
    }
  } catch (error) {
    console.error('ImgBB upload error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Upload image with retry logic
 * @param {string} base64Image - Base64 encoded image
 * @param {string} name - Image name
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<string>} - Returns the image URL
 */
async function uploadWithRetry(base64Image, name = 'face_photo', retries = 3) {
  for (let i = 0; i < retries; i++) {
    const result = await uploadToImgBB(base64Image, name);
    if (result.success) {
      return result;
    }
    
    // Wait before retry (exponential backoff)
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return {
    success: false,
    error: 'Failed to upload after multiple attempts',
  };
}

module.exports = {
  uploadToImgBB,
  uploadWithRetry,
};
