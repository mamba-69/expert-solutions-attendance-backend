#!/bin/bash

echo "🚀 Expert Solutions Backend - GitHub Repository Setup"
echo "======================================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    echo "Run: git init"
    exit 1
fi

# Check if code is committed
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Committing now..."
    git add -A
    git commit -m "Prepare for deployment"
fi

echo "✅ Code is ready to push"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Create repository on GitHub:"
echo "   👉 Go to: https://github.com/new"
echo "   - Name: expert-solutions-attendance-backend"
echo "   - Visibility: Private"
echo "   - DO NOT initialize with README"
echo ""
echo "2. After creating, copy your repository URL"
echo "   It looks like: https://github.com/YOUR_USERNAME/expert-solutions-attendance-backend.git"
echo ""
echo "3. Run these commands:"
echo ""
read -p "Enter your GitHub username: " username
echo ""
echo "   git remote add origin https://github.com/$username/expert-solutions-attendance-backend.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Would you like me to run these commands now? (y/n)"
read -p "> " answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "🔗 Adding remote..."
    git remote add origin "https://github.com/$username/expert-solutions-attendance-backend.git"
    
    echo "📤 Pushing to GitHub..."
    git branch -M main
    git push -u origin main
    
    echo ""
    echo "✅ Code pushed to GitHub!"
    echo ""
    echo "🎉 Next: Deploy to Vercel"
    echo "👉 Go to: https://vercel.com/new"
    echo "👉 Import your repository: expert-solutions-attendance-backend"
    echo ""
else
    echo ""
    echo "👍 No problem! Run the commands manually when ready."
    echo ""
fi

echo "📖 Full instructions: cat DEPLOY_TO_GITHUB.md"
