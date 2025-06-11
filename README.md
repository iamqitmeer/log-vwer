# **log-vwer ⚡**

### Stop logging into a black hole. Give your logs a beautiful, powerful, and interactive home.

`log-vwer` is the ultimate plug-and-play toolkit for Node.js developers who are tired of messy `console.log` statements. It instantly gives you a professional-grade dashboard to view, search, and filter your application logs in real-time.

<br>

<p align="center">
  <a href="https://github.com/iamqitmeer/log-vwer">
    <img src="https://beeimg.com/images/u17697764994.png" alt="log-vwer Dashboard Preview" />
---
---
    <img src="https://beeimg.com/images/y96901749943.png" alt="log-vwer Dashboard Preview" />
  </a>
  <br>
  <i>Your application logs, beautifully organized & instantly accessible.</i>
</p>

---

## **Why You'll Love `log-vwer` (The Simple Explanation)**

Imagine you're building an app. Things go wrong. Users sign up, payments fail, servers crash. How do you see what's happening? You probably use `console.log("something happened")` everywhere. It’s messy, hard to read, and gets lost in your server terminal.

**`log-vwer` fixes this.**

It takes all your logs and puts them into a beautiful, web-based dashboard that you can open in your browser. It's like having a dedicated TV screen just for your app's internal story.

-   **✨ It Just Works, Instantly:** You add it to your project, write two lines of code, and it's running. No complicated setup, no long tutorials.
-   **💾 You Choose Where to Save Logs:**
    -   **MongoDB:** Perfect for your live, production app. All logs are saved permanently and can handle millions of entries.
    -   **File:** Great for smaller projects or when you want logs saved in a simple text file on your server.
    -   **Memory:** Amazing for testing. Logs appear instantly but are deleted when you restart your app. No cleanup needed.
-   **🔐 It's Secure:** Your logs can have private user information. `log-vwer` is built to be secure. You can easily put your own login system in front of it, so only you and your team can see the logs.
-   **❤️ Built for Developers:** This tool was created by a developer who was tired of the same old problems. It’s designed to be simple, powerful, and a joy to use.

---

## **🚀 Getting Started: Your First Log Dashboard in 2 Minutes**

Follow these three simple steps to get up and running.

### **Step 1: Install it**

Open your project's terminal and run this command:

```bash
npm install log-vwer
```

This downloads and adds `log-vwer` to your project.

### **Step 2: Add it to Your Code**

Go to your main server file (usually `app.js` or `server.js`) and add the following code.

```javascript
// Import the necessary tools
const express = require('express');
const { setupLogger, viewerMiddleware } = require('log-vwer');

// Create your Express app
const app = express();
const PORT = process.env.PORT || 3000;

// This is an async function to make sure we connect to the database *before* starting the server.
async function startServer() {
  try {
    // === Part 1: Set up the logger ===
    // This tells log-vwer how to work.
    // We're choosing MongoDB here, but you can also choose 'file' or 'memory'.
    const logger = await setupLogger({
      serviceName: 'My Awesome E-Commerce App',
      store: 'mongodb',
      mongoUrl: 'mongodb://localhost:27017/my_app_logs',
    });

    // === Part 2: Activate the dashboard ===
    // This tells your app: "When someone goes to /_logs, first check the password, then show the log dashboard."
    app.use('/_logs', myAuthMiddleware, viewerMiddleware(logger));

    // === Part 3: Start using your new logger! ===
    // Now, instead of console.log, use logger.info, logger.error, etc.
    app.get('/', (req, res) => {
      logger.info('A user visited the homepage!', { 
        ipAddress: req.ip,
        browser: req.get('User-Agent'),
      });
      res.send('Welcome! Your visit has been logged. Check it at /_logs');
    });

    app.get('/error-test', (req, res) => {
      try {
        // Let's pretend something broke
        throw new Error('The payment gateway is offline!');
      } catch (error) {
        logger.error('CRITICAL: Payment gateway failed!', { 
          errorMessage: error.message,
          errorCode: 'PG-503',
        });
        res.status(500).send('Oh no! Something broke. The error has been logged.');
      }
    });

    // Start your server only after everything is ready
    app.listen(PORT, () => {
      logger.warn(`Server is alive on port ${PORT}. Ready to rock!`);
      console.log(`Log dashboard is live at: http://localhost:${PORT}/_logs`);
    });

  } catch (error) {
    // If the database connection fails, the server won't start.
    console.error("🔴 FATAL ERROR: Could not start server. Is your database running?", error);
    process.exit(1);
  }
}

// Run the function to start the server!
startServer();
```

### **Step 3: See the Magic!**

1.  Start your app: `node server.js`
2.  Open your browser and go to `http://localhost:3000`. This will create your first "info" log.
3.  Now go to `http://localhost:3000/error-test`. This will create your first "error" log.
4.  Finally, open **`http://localhost:3000/_logs`**. You'll see your beautiful new dashboard with the logs you just created!

---

## **⚙️ The Details: How to Configure `log-vwer`**

You can customize `log-vwer` to fit your needs perfectly.

### **`setupLogger(options)`**

This is the main function you use to create your logger. It returns a `Promise` that gives you the `logger` object.

| Option | What it does | Choices | Example |
|---|---|---|---|
| `serviceName` | **(Required)** A name for your app. This helps if you have multiple apps logging to the same place. | Any `string` | `'My API'`, `'User Authentication Service'` |
| `store` | Where you want to save your logs. Defaults to `'memory'`. | `'mongodb'`, `'file'`, `'memory'` | `store: 'file'` |
| `mongoUrl` | **(Required for MongoDB)** The full connection address for your MongoDB database. | A MongoDB connection string | `'mongodb+srv://user:pass@cluster.mongodb.net/logs'` |
| `filePath` | **(Required for File)** The path to the file where you want to save logs. | A file path | `'./logs/app.log'` |

### **The `logger` Object**

Once you create a `logger`, it gives you these simple methods to use:

-   `logger.info("User signed up.", { userId: 123 })` - For general information.
-   `logger.warn("Cache is getting full.")` - For things that aren't errors yet, but might become a problem.
-   `logger.error("Database connection failed!", { error: err.message })` - For when things break.
-   `logger.debug("Calculating user scores...", { step: 1 })` - For detailed developer-only messages.

Each method takes two arguments:
1.  **`message` (string):** The main thing you want to say.
2.  **`metadata` (object, optional):** Any extra data you want to save with the log. This is super useful for debugging.

---

## **💾 A Closer Look at Storage Options**

Choosing the right storage is important. Here's a simple guide:

| Storage | Best For... | Why? | Downsides? |
|---|---|---|---|
| **`mongodb`** | **Your live, public website.** | It's powerful, can store millions of logs, and never forgets them. You can search it very quickly. | You need to have a MongoDB database running somewhere. |
| **`file`** | **Small projects or servers.** | It's very simple. It just creates a text file with all your logs. Easy to read and backup. | Can get slow if you have too many logs. You have to manage the file yourself. |
| **`memory`** | **Developing and testing on your own computer.** | It's incredibly fast and requires zero setup. When you stop your app, all logs disappear. | Logs are not saved permanently. They are lost on every restart. |

---

## **🔐 How to Properly Secure Your Log Dashboard**

**This is extremely important.** Your logs might contain user emails, IP addresses, or other private data. You should **never** make your log dashboard public.

`log-vwer` is designed to be a "plugin" for your existing security. Just add your security check (middleware) right before you add `viewerMiddleware`.

**Example with Passport.js (A popular login library):**

```javascript
const passport = require('passport'); // Let's assume you've already set up Passport.js

// This tells the app: "For the /_logs page, first make sure the user is logged in with a valid token.
// If they are, then show them the log dashboard."
app.use(
  '/_logs',
  passport.authenticate('jwt', { session: false }),
  viewerMiddleware(logger)
);
```

---

## **👑 About the Author**

This tool was built with love and lots of coffee by **Qitmeer Raza**, a passionate developer dedicated to creating tools that make other developers' lives easier.

Find him, connect with him, or see his other projects:

-   **GitHub**: [@iamqitmeer](https://github.com/iamqitmeer)
-   **LinkedIn**: [/in/iamqitmeer](https://www.linkedin.com/in/iamqitmeer)
-   **X (Twitter)**: [@iamqitmeer](https://twitter.com/iamqitmeer)
-   **Instagram**: [@iamqitmeer](https://www.instagram.com/iamqitmeer)
-   **Facebook**: [/iamqitmeer](https://www.facebook.com/iamqitmeer)

---

## **🤝 Want to Help?**

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

-   Found a bug? [Open an issue.](https://github.com/iamqitmeer/log-vwer/issues)
-   Have an idea for a new feature? [Start a discussion.](https://github.com/iamqitmeer/log-vwer/discussions)
-   Want to write some code?
    1.  Fork the Project
    2.  Create your Feature Branch (`git checkout -b feature/AmazingNewFeature`)
    3.  Commit your Changes (`git commit -m 'Add some AmazingNewFeature'`)
    4.  Push to the Branch (`git push origin feature/AmazingNewFeature`)
    5.  Open a Pull Request

---

## **📄 License**

This project is licensed under the MIT License. See the `LICENSE` file for more details.
