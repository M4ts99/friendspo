# Friendspo 💩

A cross-platform toilet tracking app where you can track your bathroom sessions, compare stats with friends, and see who's the champion!

### Features
- ⏱️ **Session Tracking**: Start/stop timer for bathroom sessions
- 🔥 **Streak Tracking**: Keep track of your daily consistency
- 📊 **Comprehensive Stats**: Average duration, frequency, most active time, and more
- 📅 **Calendar View**: Visual calendar showing your activity (green/red days)
- 👥 **Friends Feed**: See when your friends are active
- 🏆 **Leaderboards**: Compare stats with friends
- 🔒 **Secure Account**: Optional email/password protection for your data

---

## 🛠️ Prerequisites

Before you start, make sure you have the following installed on your computer:

1.  **Node.js**: The runtime environment for running JavaScript.
    *   Download and install the **LTS version** from [nodejs.org](https://nodejs.org/).
2.  **Git**: For version control.
    *   Download from [git-scm.com](https://git-scm.com/).
3.  **VS Code (Visual Studio Code)**: The recommended code editor.
    *   Download from [code.visualstudio.com](https://code.visualstudio.com/).
4.  **Expo Go App** (Optional but recommended):
    *   Download on your phone from the App Store (iOS) or Google Play (Android) to test the app on a real device.

---

## 🚀 Installation & Setup (VS Code)

Follow these steps to set up the project locally:

### 1. Clone the Repository
Open VS Code. Open the terminal (Terminal -> New Terminal) and run:
```bash
git clone https://github.com/M4ts99/friendspo.git
```
Then navigate into the folder:
```bash
cd friendspo
```

### 2. Install Dependencies
Run the following command to install all necessary libraries:
```bash
npm install
```

### 3. Environment Setup
You need a `.env` file for your secret keys.
1. Create a new file named `.env` in the root folder.
2. Add your Supabase credentials (ask the project owner or check your Supabase dashboard):
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Run the App
To start the development server, run:
```bash
npx expo start
```

*   **For Web:** Press `w` in the terminal to open in your browser.
*   **For Mobile:** Scan the QR code with the **Expo Go** app on your phone (Android) or Camera app (iOS).

---

## 🌐 Deployment Pipeline

This repository is configured for **Continuous Deployment**.

### How it works:
1.  **Push to Main**: Whenever you push changes to the `main` branch, the deployment process triggers automatically.
2.  **Cloudflare Pages**: The web version of the app is hosted on Cloudflare Pages. It automatically detects the new commit, builds the project, and deploys it live.

### How to trigger a deploy:
Simply commit your changes and push them:
```bash
git add .
git commit -m "Description of your changes"
git push origin main
```
Once pushed, the website will update automatically within a few minutes.

---

## 📂 Project Structure

```
friendspo/
├── screens/           # Main app screens (Home, Feed, Stats, etc.)
├── components/        # Reusable UI components (Buttons, Modals, Graphs)
├── services/          # Logic for Database (Supabase) & Calculations
├── styles/            # Global theme (Colors, Fonts)
├── assets/            # Images and icons
└── App.tsx            # Main entry point
```

## 📜 License
MIT

---
Made with 💩 and ❤️
