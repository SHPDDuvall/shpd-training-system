const fs = require('fs');
const path = require('path');
const https = require('https');

const VERCEL_TOKEN = '6t22Z9gib7swUMKI8ZOwsUY4';
const PROJECT_ID = 'prj_zQPWlKqHXe3DlhbNyEEWgJFfFOmV';
const TEAM_ID = 'team_qHFNa0TtWbMdW4CqLqQYRmqO';

// Read all files from dist directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

const distPath = path.join(__dirname, 'dist');
const files = getAllFiles(distPath);

const fileMap = {};
files.forEach(filePath => {
  const relativePath = path.relative(distPath, filePath);
  const content = fs.readFileSync(filePath);
  fileMap[relativePath] = {
    file: content.toString('base64'),
    encoding: 'base64'
  };
});

const deploymentData = JSON.stringify({
  name: 'training-system-shaker',
  files: fileMap,
  projectSettings: {
    framework: null,
    buildCommand: null,
    outputDirectory: null
  },
  target: 'production'
});

const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: `/v13/deployments?teamId=${TEAM_ID}`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(deploymentData)
  }
};

console.log('Starting deployment...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const response = JSON.parse(data);
      if (response.url) {
        console.log(`\nDeployment successful!`);
        console.log(`URL: https://${response.url}`);
      } else if (response.error) {
        console.error('Deployment failed:', response.error);
      }
    } catch (e) {
      console.error('Failed to parse response');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(deploymentData);
req.end();
