#!/bin/bash

echo "🚀 Deploying Sentimental AI..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy Frontend
echo "📱 Deploying Frontend..."
cd sentiment-dashboard-ui
vercel --prod --yes

# Get the frontend URL
FRONTEND_URL=$(vercel ls | grep "sentiment-dashboard-ui" | head -1 | awk '{print $2}')
echo "Frontend deployed at: $FRONTEND_URL"

# Deploy Backend
echo "🔧 Deploying Backend..."
cd ..
vercel --prod --yes

# Get the backend URL
BACKEND_URL=$(vercel ls | grep "twitter-sentiment-dashboard" | head -1 | awk '{print $2}')
echo "Backend deployed at: $BACKEND_URL"

# Update frontend environment variable
echo "🔗 Updating frontend API URL..."
cd sentiment-dashboard-ui
vercel env add NEXT_PUBLIC_API_BASE_URL $BACKEND_URL

echo "✅ Deployment complete!"
echo "🌐 Frontend: $FRONTEND_URL"
echo "🔧 Backend: $BACKEND_URL"
echo "📝 Don't forget to set your OPENAI_API_KEY in Vercel dashboard!" 