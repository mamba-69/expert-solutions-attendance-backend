# Face Recognition Models Setup

This application uses `@vladmandic/face-api` for face recognition. You need to download the pre-trained models before the face recognition features will work.

## Download Models

1. Create the models directory:
```bash
mkdir -p backend/models/face-models
```

2. Download the following model files from the official repository:
   https://github.com/vladmandic/face-api/tree/master/model

3. Download these specific files and place them in `backend/models/face-models/`:

   **SSD Mobilenet V1 (Face Detection):**
   - `ssd_mobilenetv1_model-weights_manifest.json`
   - `ssd_mobilenetv1_model-shard1`

   **Face Landmark 68 (Landmark Detection):**
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`

   **Face Recognition (Face Descriptor):**
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

## Quick Download Script

Run this from the project root:

```bash
cd backend/models
mkdir -p face-models
cd face-models

# Download SSD Mobilenet V1
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://github.com/vladmandic/face-api/raw/master/model/ssd_mobilenetv1_model-shard1

# Download Face Landmark 68
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json
curl -O https://github.com/vladmandic/face-api/raw/master/model/face_landmark_68_model-shard1

# Download Face Recognition
curl -O https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json
curl -O https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard1
curl -O https://github.com/vladmandic/face-api/raw/master/model/face_recognition_model-shard2

cd ../../..
```

## Verify Installation

After downloading, your directory structure should look like:

```
backend/
  models/
    face-models/
      ssd_mobilenetv1_model-weights_manifest.json
      ssd_mobilenetv1_model-shard1
      face_landmark_68_model-weights_manifest.json
      face_landmark_68_model-shard1
      face_recognition_model-weights_manifest.json
      face_recognition_model-shard1
      face_recognition_model-shard2
```

## Testing

Start the server and it will automatically load the models:

```bash
cd backend
npm install
npm run dev
```

You should see: "Face recognition models loaded successfully"

If you see an error, make sure all model files are in the correct directory.
