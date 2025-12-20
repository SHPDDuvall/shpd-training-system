#!/bin/bash
# Quick Start Deployment Script
# Run this script after extracting the training-system folder

echo "========================================="
echo "Training System - Quick Deployment"
echo "========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first:"
    echo "   https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git is installed"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) is not installed."
    echo "   You can install it from: https://cli.github.com/"
    echo "   Or create the repository manually via GitHub website."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    MANUAL_REPO=true
else
    echo "✅ GitHub CLI is installed"
    MANUAL_REPO=false
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo ""
    echo "📦 Initializing Git repository..."
    git init
    git config user.email "admin@shakerpd.com"
    git config user.name "Shaker PD Admin"
    
    # Create .gitignore
    cat > .gitignore << EOF
node_modules/
dist/
.vercel/
.env
.env.local
*.log
.DS_Store
EOF
    
    echo "✅ Git initialized"
fi

# Add and commit files
echo ""
echo "📝 Committing files..."
git add -A
git commit -m "Initial commit with Chain of Command enhancements and Schedule Training fix" 2>/dev/null || echo "✅ Files already committed"

# Create GitHub repository
if [ "$MANUAL_REPO" = false ]; then
    echo ""
    echo "🔐 Checking GitHub authentication..."
    
    if ! gh auth status &> /dev/null; then
        echo "⚠️  Not logged into GitHub. Starting authentication..."
        gh auth login
    fi
    
    echo ""
    echo "📤 Creating GitHub repository..."
    read -p "Enter repository name (default: training-system-shaker): " REPO_NAME
    REPO_NAME=${REPO_NAME:-training-system-shaker}
    
    read -p "Make repository private? (y/n, default: y): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        VISIBILITY="--public"
    else
        VISIBILITY="--private"
    fi
    
    gh repo create "$REPO_NAME" $VISIBILITY --source=. --remote=origin --push
    
    if [ $? -eq 0 ]; then
        echo "✅ Repository created and code pushed!"
    else
        echo "❌ Failed to create repository. Please create it manually."
        MANUAL_REPO=true
    fi
fi

if [ "$MANUAL_REPO" = true ]; then
    echo ""
    echo "========================================="
    echo "Manual GitHub Setup Required"
    echo "========================================="
    echo ""
    echo "1. Go to: https://github.com/new"
    echo "2. Repository name: training-system-shaker"
    echo "3. Make it Private (recommended)"
    echo "4. DO NOT initialize with README"
    echo "5. Click 'Create repository'"
    echo ""
    echo "Then run these commands:"
    echo ""
    echo "  git remote add origin https://github.com/YOUR-USERNAME/training-system-shaker.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
    echo ""
fi

# Vercel deployment
echo ""
echo "========================================="
echo "Vercel Deployment"
echo "========================================="
echo ""

if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI is installed"
    echo ""
    read -p "Deploy to Vercel now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to Vercel..."
        vercel --prod
    else
        echo "Skipped Vercel deployment."
        echo "To deploy later, run: vercel --prod"
    fi
else
    echo "⚠️  Vercel CLI is not installed."
    echo ""
    echo "To deploy via Vercel CLI:"
    echo "1. Install: npm install -g vercel"
    echo "2. Run: vercel --prod"
    echo ""
    echo "Or deploy via Vercel Dashboard:"
    echo "1. Go to: https://vercel.com/shaker-heights-police-depts-projects/training-system"
    echo "2. Settings → Git → Connect Git Repository"
    echo "3. Select your GitHub repository"
    echo "4. Vercel will auto-deploy"
fi

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Connect GitHub to Vercel (if not done)"
echo "2. Wait for deployment to complete (~2 minutes)"
echo "3. Visit: https://train.shakerpd.com"
echo "4. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo ""
echo "See COMPLETE_DEPLOYMENT_GUIDE.md for detailed instructions."
echo ""
