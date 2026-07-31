# Visual AI Activity Agent

This project has two parts that work together:

1. **A Chrome Extension** – small program that runs inside your browser
   and watches what you do (which tabs you open, which pages you visit,
   where you click, how long you stay on a page).
2. **A Backend Server** – a program that runs on your computer, receives
   that activity data from the extension, and saves it into a database
   (SQLite file) you can look at.


```

## Before you start

You need **Node.js** installed on your computer (version 18 or newer).
Check by running this in a terminal:

```bash
node -v
```

If that gives an error or shows a version older than 18, download
Node.js from [nodejs.org](https://nodejs.org) first.

You also need **Google Chrome** (or any Chromium-based browser like
Edge or Brave).

---

## Step 1: Start the backend server

The server needs to be running first, because the extension sends data
to it.

1. Open a terminal.
2. Go into the `backend` folder:
   ```bash
   cd browser-agent/backend
   ```
3. Install the tools it needs (only required the first time):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. You should see this message:
   ```
   Activity Agent backend listening on http://localhost:4000
   ```
   **Leave this terminal window open** — closing it stops the server.

6. To check it's working, open this link in your browser:
   [http://localhost:4000](http://localhost:4000)
   You'll see a simple dashboard (it will be empty until Step 2 is done).

---

## Step 2: Install the extension in Chrome

1. Open Chrome and go to this address: `chrome://extensions`
2. In the top-right corner, turn on **Developer mode**.
3. Click the **Load unpacked** button (top-left).
4. In the file picker, select the `extension` folder (the one inside
   `browser-agent`).
5. The extension should now appear in your list, with a blue circular
   icon.
6. Click the puzzle-piece icon in Chrome's toolbar, then click the pin
   icon next to "Visual AI Activity Agent" so it's always visible.

---

## Step 3: Try it out

1. Make sure the backend server is still running (Step 1).
2. Browse normally for a minute — open a few tabs, click some links,
   scroll a page.
3. Wait about 15 seconds (the extension sends data in small batches,
   not instantly).
4. Go back to [http://localhost:4000](http://localhost:4000) and
   refresh — you should now see event counts and a table of recent
   activity.

That's it — it's working!

---


