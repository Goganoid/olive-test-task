# File Upload Service

A robust file upload service that supports both single and multipart uploads to S3-compatible storage. The service provides presigned URLs for secure direct-to-S3 uploads and handles file metadata in a PostgreSQL database.

## Features

- Single file upload support
- Multipart upload support for large files
- PostgreSQL database for file metadata
- Docker support for easy deployment
- TypeScript implementation
- RESTful API endpoints

## Prerequisites

- Docker and Docker Compose
- S3-compatible storage credentials

## Environment Setup

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Fill in the environment variables in `.env`:
```
DB_HOST=meta_db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=meta_db

S3_BUCKET_NAME=your-bucket-name
S3_REGION=your-region
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

## Running with Docker Compose

1. Build and start the services:
```bash
docker-compose up --build
```

The service will be available at `http://localhost:3000`.

## API Endpoints

### File Management

#### Initialize Upload
```http
POST /api/media/new
Content-Type: application/json

{
  "type": "jpg" // Supported types: jpg, png, gif, mp4, mov, avi, mkv, webm
}
```
Response:
```json
{
  "id": "uuid",
  "key": "media/uuid.jpg"
}
```

#### Finalize file
After the file is uploaded using either multipart upload or single url upload it then has to be finalized. 
```http
POST /api/media/:id/finalize
```
Response:
```json
{
  "id": "uuid"
}
```

#### Get File
```http
GET /api/media/:id
```
Response:
```json
{
  "url": "presigned-url", // null if it has not been finalized
  "key": "media/uuid.jpg",
  "type": "jpg",
  "size": 1234567,
  "createdAt": "2024-04-05T12:00:00Z",
  "updatedAt": "2024-04-05T12:00:00Z"
}
```

#### Delete File
```http
DELETE /api/media/:id
```
Response:
```json
{
  "message": "File deleted"
}
```


### Upload Endpoints

#### Single Upload (for small uploads)
The file can be uploaded with a single url that the service provides. Suitable for small files
```http
PUT /api/upload/single
Content-Type: application/json

{
  "key": "media/uuid.jpg"
}
```
Response:
```json
{
  "url": "presigned-url"
}
```

#### Multipart Upload (for large files)
The endpoint expects a key from `/api/media/new` request. It return multipart upload id that will be used for uploading.
1. Initialize Multipart Upload:
```http
POST /api/upload/multipart/new
Content-Type: application/json

{
  "key": "media/uuid.jpg"
}
```
Response:
```json
{
  "key": "media/uuid.jpg",
  "uploadId": "upload-id"
}
```

2. Get Presigned URLs for Parts:
  
This endpoint accepts a request for a specified number of upload parts and return a list of presigned urls, which can be used to upload a file
```http
PUT /api/upload/multipart/parts
Content-Type: application/json

{
  "uploadId": "upload-id",
  "parts": 10,
  "key": "media/uuid.jpg"
}
```
Response:
```json
{
  "parts": [
    {
      "signedUrl": "presigned-url-1",
      "partNumber": 1
    },
    // ... more parts
  ]
}
```

3. Complete Multipart Upload:
  
This endpoint accepts a list of uploaded parts, their ETags, and uploadId. These parameters are used to finalize the upload
```http
POST /api/upload/multipart/complete
Content-Type: application/json

{
  "key": "media/uuid.jpg",
  "uploadId": "upload-id",
  "parts": [
    {
      "partNumber": 1,
      "eTag": "etag-1"
    },
    // ... more parts
  ]
}
```
Response:
```json
{
  "key": "media/uuid.jpg",
  "location": "file-url",
  "bucket": "bucket-name",
  "eTag": "final-etag"
}
```

## Using the Upload Script

The project includes a Node.js script for easy file uploads. To use it:

1. Make sure the API server is running
2. Run the script with a file path:
```bash
npm i
npm run upload path/to/your/file.jpg
```

The script will:
1. Initialize the upload and get a file key
2. Automatically choose between single or multipart upload based on file size. By default files above 5MB use multipart upload
3. Upload the file using presigned URLs
4. Finalize the upload
5. Return the file ID upon success

## How Uploading Works

1. **Initialization**: When a file upload is initiated, the system:
   - Generates a unique key for the file
   - Creates a record in the database with the file metadata
   - Returns the key and ID to the client

2. **Upload Process**: The client uploads directly to S3 using the presigned URLs. It can choose to:
   - upload with a single url
   - upload using multipart upload

3. **Finalization**:
   - After successful upload, the client calls the finalize endpoint
   - The system verifies the file exists in S3
   - Updates the database record with file size and marks it as created

4. **Access**:
   - Files can be accessed using their ID
   - The system generates presigned URLs for file access
   - File metadata is stored in the database for quick access
