# Retail Sales Dashboard – Internship Project Website

A 7-page website that presents my Retail Sales Dashboard. All numbers are calculated from `server/data/clean_data.csv` (60,000 orders, Jan–Dec 2025).

## 1. Install Node.js (once)
1. Go to https://nodejs.org and download the **LTS** version for Windows. Install it with the default options.
2. Open a new terminal and type `node -v`. You should see a version number.
No `npm install` is needed. This project uses only built-in Node.js.

## 2. Run it in VS Code (Windows)
1. Unzip the file. In VS Code choose **File > Open Folder** and pick the unzipped folder.
2. Open the terminal (**Terminal > New Terminal**) and type: `npm start`
3. Open http://localhost:3000 in your browser. Press **Ctrl+C** in the terminal to stop.

## 3. Open on your phone (same Wi-Fi)
1. On the laptop, open a terminal and type `ipconfig`. Find the **IPv4 Address** (like 192.168.1.5).
2. On your phone browser go to `http://THAT-ADDRESS:3000` (example: http://192.168.1.5:3000).
3. If it does not open, allow Node.js through Windows Firewall when Windows asks.

## 4. What each folder does
- `public/` – the website: `.html` pages, `css/style.css`, `js/app.js`, `img/` (favicon).
- `server/server.js` – the backend. Serves the website and these APIs:
  - `GET /api/summary` – totals for the whole dataset
  - `GET /api/data?store=Store 10&category=Electronics&membership=Platinum&month=5` – numbers for the filters (all filters optional)
  - `POST /api/contact` – checks and saves contact messages
- `server/data/clean_data.csv` – your data.
- `server/messages.json` – contact messages are **saved here**. They are **not emailed**.

## 5. Edit the text
Page text is in the `.html` files in `public/` (name and footer are already set to Varnika Samkaria). Insight and recommendation sentences are written in `public/js/app.js` and are calculated from the data. Colours are at the top of `public/css/style.css`. The email address is in `public/contact.html`.

## 6. Replace the data
Put a new CSV in `server/data/` named `clean_data.csv` with the **same column names** (Store_Name, Category, Membership, Month, Calc_Revenue, Calc_Profit, Product_Name, Customer_ID, Sale_Date, Discount_Percent, Sale_ID). Commas inside values are not supported. Restart the server. Charts, insights and numbers update by themselves.

## 7. Put it online
- **Full version (recommended): Render.com.** Upload the folder to GitHub, then on Render create a **Web Service** from the repo. Build command: leave empty. Start command: `npm start`. Note: on free hosting, saved contact messages can be lost when the service restarts.
- **GitHub Pages** only hosts static files, so the charts, filters and contact form will NOT work there, because they need the server. Use Render for the full site.

## 8. Testing notes (honest)
Tested: all pages load, links and files exist, no console errors, API numbers match the CSV, filters, contact form (bad and good input), no sideways scrolling at 1280px and 390px, all menu links.
Not tested: real Chart.js drawing (loads from the internet; the test machine had none, so chart values were checked through a stand-in), and phone access over your Wi-Fi.
Note: the data has no stock-level columns, so there is no stock analysis.
