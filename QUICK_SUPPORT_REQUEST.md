# Quick Backend API Support Request

**Date:** October 20, 2025  
**User:** Dugald Todd (@dugald.todd)  
**Issue:** Identity and DataWarehouse APIs returning 500 "NOT_FOUND" errors

---

## 🚨 Problem Description

Quick apps deployed to multiple subdomains are all failing with the same backend errors when trying to use the Identity and DataWarehouse APIs.

### Error Details:
```
GET /api/identity 500 (Internal Server Error)
{"error":"Internal server error","message":"NOT_FOUND"}

POST /api/dw/query/sync 500 (Internal Server Error)
```

---

## 🌐 Affected Deployments (All Tested)

1. https://god-mode.quick.shopify.io
2. https://msm-dashboard-fresh.quick.shopify.io  
3. https://cs-god-mode.quick.shopify.io

**All three show identical errors** - proving it's not subdomain-specific.

---

## ✅ Verified Configuration

### manifest.json (Deployed Correctly)
```json
{
  "name": "god-mode",
  "short_name": "MSM Dashboard",
  "description": "Merchant Success Manager Dashboard with BigQuery integration",
  "version": "1.0.0",
  "apis": {
    "identity": true,
    "dataWarehouse": true
  },
  "scopes": [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/bigquery"
  ],
  "bigquery": {
    "datasets": [
      "shopify-dw.sales",
      "shopify-dw.mart_revenue_data",
      "shopify-dw.base",
      "shopify-dw.support",
      "sdp-for-analysts-platform.rev_ops_prod"
    ]
  }
}
```

**Status:** ✅ File exists in deployment, structure correct

---

## 📸 Console Errors (Full Stack Trace)

```javascript
// Identity API Error
GET https://cs-god-mode.quick.shopify.io/api/identity 500 (Internal Server Error)

Identity API error: 500 {
  "error":"Internal server error",
  "message":"NOT_FOUND",
  "stack":"Error\n    at anonymous (builtin:///$bunfs/root/quick-api-x64:12:33)\n    at UU (node_modules/elysia/dist/bun/index.js:310:12)\n    at compile (node_modules/elysia/dist/bun/index.js:351:34773)\n    at <anonymous> (node_modules/elysia/dist/bun/index.js:350:241)\n    at listen (node_modules/elysia/dist/bun/index.js:351:35444)\n    at src/index.js:153:4\n    at asyncModuleEvaluation (unknown:2)\n    at processTicksAndRejections (unknown:7:39)"
}

// DataWarehouse API Error
POST https://cs-god-mode.quick.shopify.io/api/dw/query/sync 500 (Internal Server Error)
```

---

## 🔍 Root Cause Analysis

The error `"NOT_FOUND"` in the Quick backend suggests:

1. **Backend doesn't recognize the app registration**
2. **API endpoints aren't initialized for these subdomains**
3. **Service account/permissions not provisioned on backend**

The frontend correctly:
- Detects Quick environment ✓
- Reads manifest.json ✓
- Makes proper API calls ✓

But Quick's backend responds with 500 "NOT_FOUND" instead of executing the Identity or DataWarehouse operations.

---

## 🎯 What's Needed

The Quick team needs to:

1. **Register backend permissions** for these apps to use Identity API
2. **Provision DataWarehouse API access** with BigQuery service accounts
3. **Grant access to declared datasets**:
   - shopify-dw.sales
   - shopify-dw.mart_revenue_data
   - shopify-dw.base
   - shopify-dw.support
   - sdp-for-analysts-platform.rev_ops_prod

---

## 📋 Deployment Details

- **Deployed via:** `quick deploy dist/public <subdomain>`
- **Authentication:** ✅ Authenticated as dugald.todd
- **Manifest included:** ✅ Verified in deployment output
- **Build process:** Vite with `publicDir: 'public'` configuration

---

## ❓ Questions for Quick Team

1. **Is there a backend registration step** we're missing?
2. **Do apps need pre-approval** to use Identity/DataWarehouse APIs?
3. **Are there known issues** with these API endpoints?
4. **Should manifest.json be in a different location or format?**
5. **Is there a Quick admin panel** where we need to configure permissions?

---

## 🔗 Related Documentation

According to Vault documentation (page 50058: "Querying SDP Data from Applications"), applications need proper service account configuration. Is there a Quick-specific process for this?

---

## 📞 Contact

- **Shopifolk:** Dugald Todd
- **Email:** dugald.todd@shopify.com
- **Team:** CSM MMA (Commercial Customer Success)
- **GitHub:** dugald-todd

---

**Thank you for your help! Happy to provide any additional information or testing.** 🙏

