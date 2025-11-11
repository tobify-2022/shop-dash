# Shop Pay Dashboards

**Shop Pay Installments & Shop Pay Performance Analytics Dashboard**

## 🎯 Overview

This repository contains the Shop Pay Installments (SPI) and Shop Pay performance dashboards built with Quick.js. The dashboards provide CSMs (Customer Success Managers) with comprehensive analytics and insights into merchant Shop Pay performance.

## 📊 Dashboards

### Shop Pay Installments Dashboard
- **Route:** `/shop-pay-installments`
- **Purpose:** Analytics for Shop Pay Installments (SPI) transactions
- **Features:** SPI-specific metrics, penetration analysis, business impact summaries

### Shop Pay Dashboard  
- **Route:** `/shop-pay`
- **Purpose:** Analytics for general Shop Pay (non-SPI) transactions
- **Features:** Shop Pay adoption, payment method comparisons, activation tracking

## 🚀 Deployment

**Deployment URL:** https://spi-analysis.quick.shopify.io

### Deploy Script
```bash
./auto-deploy-dkt.sh "Deployment message"
```

**⚠️ Important:** The deployment script will ALWAYS prompt for Y/N confirmation before overwriting the Quick site.

## 🏗️ Tech Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Platform:** Quick.js (Shopify's internal platform)
- **Data Warehouse:** BigQuery (shopify-dw)
- **Routing:** Wouter
- **Styling:** Tailwind CSS

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── spi/              # SPI-specific components
│   │   ├── shop-pay/         # Shop Pay-specific components
│   │   └── layout/           # Shared layout components
│   ├── pages/                # Dashboard pages
│   ├── lib/                  # Data services
│   └── contexts/             # React contexts
├── public/
│   └── manifest.json         # Quick.js manifest
└── dist/                     # Build output
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy (with confirmation prompt)
./auto-deploy-dkt.sh "Your deployment message"
```

## 📚 Documentation

- [SPI Dashboard Handover](./SPI_DASHBOARD_HANDOVER.md) - Complete project documentation
- [SPI/Shop Pay Separation Review](./SPI_SHOP_PAY_SEPARATION_REVIEW.md) - Architecture separation details

## 🔗 Links

- **Live Dashboard:** https://spi-analysis.quick.shopify.io
- **GitHub Repository:** https://github.com/tobify-2022/shop-dash

## 📝 Notes

- This project was separated from the main CMS-Dash repository to provide dedicated focus on Shop Pay analytics
- Deployment target: `spi-analysis.quick.shopify.io`
- Manifest name: `spi-analysis` (configured in `client/public/manifest.json` and `quick.config.js`)

