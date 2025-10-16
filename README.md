# Prism

<div align="center">
  <img src="./assets/banner.svg" alt="Prism Banner" width="99%">
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-Latest-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

A modern desktop application for tracking application usage time, built with Electron and inspired by Steam's UI design.

## Why "Prism"?

Just like a prism breaks white light into a beautiful spectrum of colors, **Prism** breaks down your raw application usage data into colorful, actionable insights. The name reflects the app's core purpose: transforming simple time tracking into detailed analytics, trends, and productivity metrics—making the invisible visible.

## Features

### 📚 Library (Main Page)
- **Automatic Time Tracking** - Tracks all running applications automatically in the background
- **Steam-Inspired UI** - Clean, modern interface with familiar navigation patterns
- **Collections/Categories** - Organize apps into custom collections with colors and icons
- **Favorites System** - Quick access to your most-used applications
- **Daily Statistics** - View today's total usage time and app count at a glance
- **Search & Filter** - Find apps quickly with built-in search
- **Context Menus** - Right-click any app for quick actions (launch, favorite, hide, manage collections)
- **Hidden Apps** - Hide apps from your library while still tracking them
- **Real-time Updates** - Live updates as you use applications
- **Multiple Views** - Home, Collections, and Hidden apps views

### 📊 Analytics
- **Daily Usage Charts** - Visualize your app usage over time with interactive charts
- **Top Applications** - See your most-used apps ranked by time spent
- **All Apps Overview** - Complete list with usage time, sessions, and last used info
- **Category Breakdown** - Time distribution across different app categories
- **AI-Powered Insights** - Smart suggestions based on your usage patterns
- **Hourly Activity Heatmap** - Hour-by-hour breakdown of which apps you use when
- **Custom Date Ranges** - View data for today, week, month, year, or custom periods
- **Export Functionality** - Export analytics data to CSV, JSON or PDF

### 🎯 Productivity
- **Productivity Score** - Overall score (0-100) based on productive, neutral, and unproductive time
- **Time Breakdown** - Visual breakdown of productive vs neutral vs unproductive time
- **Key Metrics Dashboard**:
  - Focus Time tracking
  - Distraction Time monitoring
  - Context Switches counter
  - Deep Work Sessions (25+ min sessions)
  - Peak Productivity hours
  - Most Productive Day
- **Productivity Trend Chart** - Track your score over time
- **Category Distribution** - See how productive time is distributed across categories
- **Top Apps Lists** - Most productive and most distracting apps
- **Session Analytics**:
  - Session length distribution
  - App switching frequency
  - Productivity by time of day
- **Productivity Heatmap** - Hour-by-hour productivity breakdown
- **Custom Productivity Levels** - Mark apps as productive, neutral, or unproductive
- **Export Functionality** - Export productivity data to CSV, JSON or PDF

### 🎯 Goals
- **5 Goal Types**:
  - **Productivity Score** - Target overall productivity score
  - **Focus Time** - Track productive/neutral/unproductive time
  - **Work Sessions** - Count deep work sessions (customizable duration)
  - **App-Specific** - Track time on specific applications
  - **Category Goals** - Track time spent on app categories
- **Flexible Frequencies** - Daily, weekly, or monthly goals
- **Real-Time Progress** - Live updates as you work towards goals
- **Goal Status Tracking** - Pending, in progress, achieved, or failed
- **Streak System** - Track consecutive days of goal achievement
- **Success Rate Analytics** - 7-day success rate chart and 30-day activity calendar
- **Goal Templates** - Pre-made templates for common productivity goals
- **Historical Data** - View goal progress for past dates
- **Auto-Save & Backfill** - Automatic progress tracking even when app was closed
- **Export Functionality** - Export goals data to CSV, JSON or PDF
- **Quick Stats** - Active goals, achieved today, current streak, and success rate

### 📱 App Details
- **Comprehensive Statistics**:
  - Total time spent
  - Session count
  - Average session length
  - Last used timestamp
  - First tracked date
- **Usage Trends** - Visual chart showing usage over time
- **Calendar Heatmap** - 30-day activity visualization
- **Productivity Settings** - Override productivity level per app
- **Recent Sessions** - Detailed list of recent usage sessions with duration
- **Milestones** - Celebrate usage achievements (10h, 50h, 100h, etc.)
- **Insights & Recommendations** - Smart analysis of your usage patterns
- **Quick Actions** - Launch app, manage favorites, change productivity level

### Usage
- **Keyboard Shortcuts** 
  – Press ? anytime in the app to view all available shortcuts

## Installation
### Prerequisites
- Node.js 16 or higher
- npm or yarn
### Setup
1. Clone the repository

```bash
git clone https://github.com/severmanolescu/prism.git
cd prism
```
2. Install dependencies
```bash
npm install
```
3. Run the application
```bash
npm start
```
### Build
To create a distributable package:
```bash
npm run build
```
## Project Structure
```bash
prism/
├── scripts/                    # Useful scripts
├── src/
│   ├── main/                      # Main process (Electron/Node.js)
│   │   ├── ipc/                   # IPC handlers organized by domain
│   │   │   └── exporters/         # IPC handlers for exporting PDF files
│   │   ├── services/              # Business logic (tracking, database, storage)
│   │   │   └── data_access/       # Database access handlers
│   │   └── utils/                 # Helper functions
│   ├── preload/                   # Preload script for IPC bridge
│   └── renderer/                  # Renderer process (UI)
│       ├── styles/                # Modular CSS files
│       │   ├── analytics/         # Analytics page styles
│       │   ├── app-details/       # App details page styles
│       │   ├── category-insights/ # Category Insights page styles
│       │   ├── global/            # Global page styles
│       │   ├── goals/             # Goals page styles
│       │   ├── index-page/        # Main page styles
│       │   ├── productivity/      # Productivity page styles
│       │   └── shared/            # Shared page styles
│       └── js/                    # Frontend JavaScript modules
│           ├── analytics/         # Analytics page logic
│           ├── app-details/       # App details page logic
│           ├── category-insights/ # Category Insights page logic
│           ├── goals/             # Goals page logic
│           ├── index-page/        # Main page logic
│           ├── productivity/      # Productivity page Logic
│           └── shared/            # Shared src 
├── assets/                        # Images and icons
└── main.js                        # Main Electron entry point
```

## Usage
### Basic Operations
- **Launch apps** - Click any app card or right-click and select "Launch Application"
- **View details** - Click an app to see detailed usage statistics
- **Organize apps** - Create collections and drag apps into them
- **Search** - Use the search bar to filter applications
- **Today's stats** - View in the top-right corner of the window

### Collections
1.  Click the grid icon in the sidebar to view collections
2. Click "Create New Collection" to add a new category
3.  Right-click any app and select "Add to" to move it to a collection

### Hidden Apps
Apps can be hidden from the main view while still being tracked:
-   Right-click an app → More → Hide from Library
-   Access hidden apps via Library → Hidden in the top menu

### Goals System
Set and track productivity goals with different frequencies (daily, weekly, monthly):
- **5 Goal Types**: Productivity score, focus time, work sessions, app-specific, category goals
- **Smart Tracking**: Real-time progress for current periods, historical data for past periods
- **Streak System**: Track consecutive days of goal achievement
- **Auto-Save**: Automatic backfill for missed days when app was closed

📚 **[View Complete Goals System Documentation](src/main/services/GOALS_SYSTEM_README.md)**

### Data Storage
The application uses SQLite database for efficient data management
SQLite database provides better performance for queries and analytics while maintaining data integrity.

## Development
### Tech Stack
-   **Electron** - Desktop app framework
-   **Node.js** - Backend runtime
-   **Vanilla JavaScript** - No framework dependencies
-   **CSS3** - Custom styling with modular architecture

### Key Dependencies
-   `electron` - Desktop application framework
-   `active-win` - Get active window information (Windows/macOS/Linux)
-   `better-sqlite3` - Better SQLite database for data persistence
-   `auto-launch` - Auto-start on system boot

## Roadmap
- ✅ ~~Weekly/Monthly statistics view~~ - Implemented
- ✅ ~~Export data to CSV/JSON~~ - Implemented for Analytics, Productivity, and Goals
- ✅ ~~Application goals and limits~~ - Implemented with comprehensive Goals system
- ✅ ~~Productivity insights and analytics~~ - Implemented with dedicated Productivity page
- 🚧 Settings page - In progress
- 📋 Custom themes
- 📋 Notifications for goal achievements
- 📋 Desktop widgets for quick stats
- 📋 Multi-language support

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/TestBranch`)
3.  Commit your changes (`git commit -m 'Add some TestBranch'`)
4.  Push to the branch (`git push origin feature/TestBranch`)
5.  Open a Pull Request

## Acknowledgments
-   UI design inspired by Steam's client interface
-   Built with Electron for cross-platform compatibility

## Support
If you encounter any issues or have questions, please open an issue on GitHub.
