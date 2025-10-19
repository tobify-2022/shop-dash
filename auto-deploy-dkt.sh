#!/bin/bash
# Auto-deploy script for MSM Dashboard
# Usage: ./auto-deploy-dkt.sh "deployment message"

DEPLOY_MESSAGE=${1:-"Dashboard update"}
SUBDOMAIN="god-mode"

echo "🚀 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    echo "📦 Deploying to ${SUBDOMAIN}.quick.shopify.io..."
    echo "📝 Deploy message: ${DEPLOY_MESSAGE}"
    
    echo "y" | quick deploy dist/public ${SUBDOMAIN}
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo "🌐 Visit: https://${SUBDOMAIN}.quick.shopify.io"
    else
        echo "❌ Deployment failed"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi

