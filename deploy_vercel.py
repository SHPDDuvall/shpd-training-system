#!/usr/bin/env python3
import os
import json
import base64
import requests
from pathlib import Path

# Configuration
VERCEL_TOKEN = "6t22Z9gib7swUMKI8ZOwsUY4"
TEAM_ID = "team_qHFNa0TtWbMdW4CqLqQYRmqO"
PROJECT_NAME = "training-system-shaker"

print("🚀 Starting Vercel deployment...")
print(f"Project: {PROJECT_NAME}")
print(f"Team: {TEAM_ID}")

# Get all files from dist directory
dist_path = Path(__file__).parent / "dist"
if not dist_path.exists():
    print("❌ Error: dist directory not found. Run 'npm run build' first.")
    exit(1)

print(f"\n📦 Reading files from {dist_path}...")

files = {}
file_count = 0

for file_path in dist_path.rglob("*"):
    if file_path.is_file():
        relative_path = str(file_path.relative_to(dist_path))
        with open(file_path, "rb") as f:
            content = f.read()
            files[relative_path] = {
                "data": base64.b64encode(content).decode('utf-8'),
                "encoding": "base64"
            }
            file_count += 1
            print(f"  ✓ {relative_path} ({len(content)} bytes)")

print(f"\n📊 Total files: {file_count}")

# Create deployment payload
deployment_payload = {
    "name": PROJECT_NAME,
    "files": files,
    "projectSettings": {
        "framework": None
    },
    "target": "production",
    "gitSource": None
}

print(f"\n🌐 Sending deployment request to Vercel API...")

# Make API request
headers = {
    "Authorization": f"Bearer {VERCEL_TOKEN}",
    "Content-Type": "application/json"
}

url = f"https://api.vercel.com/v13/deployments?teamId={TEAM_ID}&forceNew=1"

try:
    response = requests.post(url, headers=headers, json=deployment_payload, timeout=300)
    
    print(f"\n📡 Response Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        deployment_url = result.get("url", "")
        
        print(f"\n✅ Deployment successful!")
        print(f"🔗 URL: https://{deployment_url}")
        print(f"📋 Deployment ID: {result.get('id', 'N/A')}")
        print(f"⏱️  Status: {result.get('readyState', 'N/A')}")
        
        if deployment_url:
            print(f"\n🎉 Your site is deploying to: https://{deployment_url}")
            print(f"🏠 Custom domain: https://train.shakerpd.com")
            print(f"\n⚠️  Remember to do a hard refresh (Ctrl+Shift+R) to see the changes!")
    else:
        print(f"\n❌ Deployment failed!")
        print(f"Response: {response.text}")
        
        try:
            error_data = response.json()
            if "error" in error_data:
                print(f"Error: {error_data['error']}")
        except:
            pass
            
except requests.exceptions.Timeout:
    print("\n⏱️  Request timed out. The deployment may still be processing.")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
