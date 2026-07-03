# Quick Fix Mobile Kitchen

A simple online ordering website for a potato chips business.

## Included features
- Admin can add or update spices, sizes, and prices.
- Customers can place orders with spice preferences.
- Admin order board supports chat-style updates.
- Customer portal lets users check order updates using their phone number.

## Local preview
Open [index.html](index.html) in your browser, or serve the folder with any static host.

## Cloud deployment options
You can publish this site for free on:
- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages

### Simple deployment steps
1. Upload this folder to your chosen host.
2. Set the published folder to the root of this project.
3. Publish and open the live URL.
4. In the deployed site, open the config.js file and replace the empty cloudApiUrl with your Google Apps Script web app URL.

## Cloud backend setup
A starter Google Apps Script backend is included in the cloud-backend folder.
1. Create a new Google Apps Script project.
2. Paste the contents of cloud-backend/Code.gs into the script.
3. Deploy it as a web app.
4. Copy the web app URL into config.js as cloudApiUrl.

## Next upgrade for true cloud sync
The current version now supports an optional cloud endpoint for shared order data. If you want, I can next help you turn this into a full Firebase or Supabase version.
