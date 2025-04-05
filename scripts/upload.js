const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3000'; // Adjust this to your API base URL
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for multipart upload

async function uploadFile(filePath) {
  try {
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;
    const fileExtension = path.extname(filePath).slice(1).toLowerCase();

    // Step 1: Initialize upload and get key
    console.log('Initializing upload...');
    const initResponse = await axios.post(`${API_BASE_URL}/api/media/new`, {
      type: fileExtension,
    });
    const { key, id } = initResponse.data;
    // Step 2: Upload file
    console.log('Uploading...');
    if (fileSize <= 5 * 1024 * 1024) {
      // Single upload for files <= 5MB
      await handleSingleUpload(key, filePath);
    } else {
      // Multipart upload for files > 5MB
      await handleMultipartUpload(key, filePath, fileSize);
    }

    // Step 3: Finalize upload
    console.log('Finalizing upload...');
    await axios.post(`${API_BASE_URL}/api/media/${id}/finalize`);

    console.log('File uploaded successfully!');
    return id;
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}

async function handleSingleUpload(key, filePath) {
  // Get presigned URL
  const presignedUrlResponse = await axios.put(`${API_BASE_URL}/api/upload/single`, {
    key,
  });
  const { url } = presignedUrlResponse.data;

  // Upload file to presigned URL
  const file = fs.readFileSync(filePath);
  await axios.put(url, file, {
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

async function handleMultipartUpload(key, filePath, fileSize) {
  // Initialize multipart upload
  const initMultipartResponse = await axios.post(`${API_BASE_URL}/api/upload/multipart/new`, {
    key,
  });
  const { uploadId } = initMultipartResponse.data;

  // Calculate number of parts
  const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
  const finishedParts = [];

  // Get presigned URLs for all parts
  const presignedUrlsResponse = await axios.put(`${API_BASE_URL}/api/upload/multipart/parts`, {
    uploadId,
    parts: totalParts,
    key,
  });
  const { parts } = presignedUrlsResponse.data;

  // Upload each part
  for (let i = 0; i < totalParts; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const partNumber = i + 1;

    const fileChunk = fs.readFileSync(filePath, { start, end });
    const response = await axios.put(parts[i].signedUrl, fileChunk);

    finishedParts.push({
      partNumber,
      eTag: response.headers.etag,
    });
  }

  await axios.post(`${API_BASE_URL}/api/upload/multipart/complete`, {
    key,
    uploadId,
    parts: finishedParts,
  });
}

// Check if file path is provided as argument
if (process.argv.length < 3) {
  console.error('Please provide a file path as an argument');
  process.exit(1);
}

const filePath = process.argv[2];
uploadFile(filePath)
  .then((id) => console.log('Upload completed. File id:', id))
  .catch((error) => {
    if (axios.isAxiosError(error)) {
      console.error('Upload failed:', JSON.stringify(error?.response?.data, null, 2));
    } else {
      console.error('Upload failed:', error);
    }
    process.exit(1);
  });
