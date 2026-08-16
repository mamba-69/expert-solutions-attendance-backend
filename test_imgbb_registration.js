const axios = require('axios');
const fs = require('fs');

// Create a simple test image (1x1 red pixel PNG in base64)
const testBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testRegistration() {
  try {
    console.log('🧪 Testing ImgBB Profile Picture System...\n');
    
    // Test registration data
    const registrationData = {
      employee_name: 'Test Employee ImgBB',
      mobile_no: '9999999999',
      address: '123 Test Street, Test City',
      email: 'test.imgbb@example.com',
      face_data: {
        descriptor: Array(128).fill(0).map(() => Math.random()),
        base64Image: testBase64Image, // This should trigger ImgBB upload
      }
    };

    console.log('📤 Sending registration request...');
    console.log('Employee Name:', registrationData.employee_name);
    console.log('Mobile:', registrationData.mobile_no);
    console.log('Base64 Image Length:', testBase64Image.length, 'chars');
    console.log('');

    const response = await axios.post('http://192.168.29.117:3000/api/auth/register', registrationData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds for image upload
    });

    console.log('✅ Response received!\n');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    
    if (response.data.data) {
      console.log('\n📋 Employee Data:');
      console.log('- ID:', response.data.data.id);
      console.log('- Name:', response.data.data.employee_name);
      console.log('- Mobile:', response.data.data.mobile_no);
      console.log('- Status:', response.data.data.status);
      
      if (response.data.data.image_url) {
        console.log('\n🖼️  Profile Picture URL:');
        console.log(response.data.data.image_url);
        console.log('\n✅ ImgBB upload SUCCESS!');
        console.log('👉 Open the URL above in browser to verify image');
      } else {
        console.log('\n⚠️  No image_url in response');
        console.log('ImgBB upload may have failed');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRegistration();
