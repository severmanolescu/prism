#!/usr/bin/env python3
"""
Database Viewer for Steam Time Tracker
View your tracked apps, sessions, and statistics in nice formatted tables
"""

import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

def find_database():
    """Find the database file"""
    possible_paths = [
        'time-tracker.db',
        'data/tracker.db',
        'user-data/time-tracker.db',
        'storage/time-tracker.db'
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    # Search recursively
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith('.db'):
                return os.path.join(root, file)
    
    return None

def calculate_today_time(db_path):
    """Calculate total time tracked today"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get start and end of today
    now = datetime.now()
    start_of_today = datetime(now.year, now.month, now.day)
    start_of_today_ms = int(start_of_today.timestamp() * 1000)
    end_of_today_ms = start_of_today_ms + (24 * 60 * 60 * 1000)
    
    print(f"Calculating time for: {start_of_today.strftime('%Y-%m-%d')}")
    print(f"Time range: {start_of_today.strftime('%H:%M:%S')} to {now.strftime('%H:%M:%S')}\n")
    
    # Get today's stats
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT app_id) as app_count,
            COUNT(*) as session_count,
            SUM(duration) as total_duration
        FROM sessions
        WHERE start_time >= ? 
            AND start_time < ?
            AND end_time IS NOT NULL
            AND duration > 0
    """, (start_of_today_ms, end_of_today_ms))
    
    stats = cursor.fetchone()
    app_count, session_count, total_duration = stats
    
    total_duration = total_duration or 0
    
    # Convert to human readable
    total_seconds = total_duration / 1000
    hours = int(total_seconds / 3600)
    minutes = int((total_seconds % 3600) / 60)
    seconds = int(total_seconds % 60)
    
    print("=" * 50)
    print("TODAY'S STATISTICS")
    print("=" * 50)
    print(f"Apps used:        {app_count}")
    print(f"Sessions:         {session_count}")
    print(f"Total time:       {hours}h {minutes}m {seconds}s")
    print(f"Total (ms):       {total_duration}")
    print("=" * 50)
    
    # Show top apps today
    print("\nTop apps today:\n")
    cursor.execute("""
        SELECT 
            a.name,
            SUM(s.duration) as total_time,
            COUNT(s.id) as sessions
        FROM sessions s
        JOIN apps a ON s.app_id = a.id
        WHERE s.start_time >= ? 
            AND s.start_time < ?
            AND s.end_time IS NOT NULL
        GROUP BY a.id
        ORDER BY total_time DESC
        LIMIT 10
    """, (start_of_today_ms, end_of_today_ms))
    
    for row in cursor.fetchall():
        name, duration, sess_count = row
        hrs = int(duration / 1000 / 3600)
        mins = int((duration / 1000 % 3600) / 60)
        print(f"  {name[:30]:<30} {hrs}h {mins}m ({sess_count} sessions)")
    
    conn.close()
    
    return total_duration

def format_duration(milliseconds):
    """Format milliseconds to readable time"""
    if not milliseconds:
        return "0s"
    
    seconds = milliseconds / 1000
    
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"

def format_date(timestamp):
    """Format timestamp to readable date"""
    if not timestamp:
        return "Never"
    try:
        dt = datetime.fromtimestamp(timestamp / 1000)
        now = datetime.now()
        
        if dt.date() == now.date():
            return f"Today {dt.strftime('%H:%M')}"
        elif dt.date() == (now - timedelta(days=1)).date():
            return f"Yesterday {dt.strftime('%H:%M')}"
        elif (now - dt).days < 7:
            return dt.strftime('%A %H:%M')
        else:
            return dt.strftime('%Y-%m-%d %H:%M')
    except:
        return "Unknown"

def print_table(headers, rows, widths=None):
    """Print a nice formatted table"""
    if not rows:
        print("  (No data)")
        return
    
    # Calculate column widths if not provided
    if not widths:
        widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                widths[i] = max(widths[i], len(str(cell)))
    
    # Add some padding
    widths = [w + 2 for w in widths]
    
    # Print header
    header_row = "  " + "".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    print(header_row)
    print("  " + "-" * (sum(widths)))
    
    # Print rows
    for row in rows:
        print("  " + "".join(str(cell).ljust(widths[i]) for i, cell in enumerate(row)))

def view_apps(conn, category=None, limit=None):
    """View all apps or apps by category"""
    cursor = conn.cursor()
    
    if category:
        print(f"\n📦 Apps in '{category}' category:\n")
        query = """
            SELECT name, executable, category, total_time, launch_count, last_used
            FROM apps 
            WHERE category = ? AND hidden = 0
            ORDER BY total_time DESC
        """
        cursor.execute(query, (category,))
    else:
        print("\n📱 All Tracked Apps:\n")
        query = """
            SELECT name, executable, category, total_time, launch_count, last_used
            FROM apps 
            WHERE hidden = 0
            ORDER BY total_time DESC
        """
        if limit:
            query += f" LIMIT {limit}"
        cursor.execute(query)
    
    apps = cursor.fetchall()
    
    if not apps:
        print("  No apps found")
        return
    
    rows = []
    for app in apps:
        rows.append([
            app[0][:30],  # name (truncated)
            app[1][:20],  # executable
            app[2][:15],  # category
            format_duration(app[3]),  # total_time
            str(app[4]),  # launch_count
            format_date(app[5])  # last_used
        ])
    
    headers = ["Name", "Executable", "Category", "Time", "Launches", "Last Used"]
    print_table(headers, rows)
    print(f"\n  Total: {len(apps)} apps")

def view_categories(conn):
    """View all categories"""
    cursor = conn.cursor()
    
    print("\n📁 Categories:\n")
    
    cursor.execute("""
        SELECT c.name, c.color, c.icon, COUNT(a.id) as app_count, SUM(a.total_time) as total_time
        FROM categories c
        LEFT JOIN apps a ON c.id = a.category AND a.hidden = 0
        GROUP BY c.id
        ORDER BY c.is_default DESC, c.name
    """)
    
    categories = cursor.fetchall()
    
    rows = []
    for cat in categories:
        rows.append([
            cat[2] if cat[2] else "📁",  # icon
            cat[0],  # name
            cat[1],  # color
            str(cat[3]),  # app_count
            format_duration(cat[4]) if cat[4] else "0s"  # total_time
        ])
    
    headers = ["", "Category", "Color", "Apps", "Total Time"]
    print_table(headers, rows)

def view_recent_sessions(conn, limit=20):
    """View recent sessions"""
    cursor = conn.cursor()
    
    print(f"\n⏱️  Recent Sessions (last {limit}):\n")
    
    cursor.execute("""
        SELECT a.name, s.start_time, s.end_time, s.duration
        FROM sessions s
        JOIN apps a ON s.app_id = a.id
        WHERE s.end_time IS NOT NULL
        ORDER BY s.start_time DESC
        LIMIT ?
    """, (limit,))
    
    sessions = cursor.fetchall()
    
    rows = []
    for session in sessions:
        rows.append([
            session[0][:35],  # app name
            format_date(session[1]),  # start_time
            format_date(session[2]),  # end_time
            format_duration(session[3])  # duration
        ])
    
    headers = ["App", "Started", "Ended", "Duration"]
    print_table(headers, rows)

def view_stats(conn):
    """View overall statistics"""
    cursor = conn.cursor()
    
    print("\n📊 Overall Statistics:\n")
    
    # Total apps
    cursor.execute("SELECT COUNT(*) FROM apps WHERE hidden = 0")
    total_apps = cursor.fetchone()[0]
    
    # Total time
    cursor.execute("SELECT SUM(total_time) FROM apps WHERE hidden = 0")
    total_time = cursor.fetchone()[0] or 0
    
    # Total sessions
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE end_time IS NOT NULL")
    total_sessions = cursor.fetchone()[0]
    
    # Active sessions
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE end_time IS NULL")
    active_sessions = cursor.fetchone()[0]
    
    # Most used app
    cursor.execute("""
        SELECT name, total_time 
        FROM apps 
        WHERE hidden = 0
        ORDER BY total_time DESC 
        LIMIT 1
    """)
    top_app = cursor.fetchone()
    
    print(f"  Total Apps Tracked: {total_apps}")
    print(f"  Total Time Tracked: {format_duration(total_time)}")
    print(f"  Completed Sessions: {total_sessions}")
    print(f"  Active Sessions: {active_sessions}")
    
    if top_app:
        print(f"  Most Used App: {top_app[0]} ({format_duration(top_app[1])})")
    
    # Last 7 days stats
    seven_days_ago = (datetime.now() - timedelta(days=7)).timestamp() * 1000
    cursor.execute("""
        SELECT SUM(duration) 
        FROM sessions 
        WHERE start_time >= ? AND end_time IS NOT NULL
    """, (seven_days_ago,))
    last_7_days = cursor.fetchone()[0] or 0
    
    print(f"\n  Last 7 Days: {format_duration(last_7_days)}")
    
    # Top 5 apps this week
    print("\n  Top 5 Apps This Week:\n")
    cursor.execute("""
        SELECT a.name, SUM(s.duration) as total
        FROM sessions s
        JOIN apps a ON s.app_id = a.id
        WHERE s.start_time >= ? AND s.end_time IS NOT NULL
        GROUP BY a.id
        ORDER BY total DESC
        LIMIT 5
    """, (seven_days_ago,))
    
    top_apps = cursor.fetchall()
    for i, app in enumerate(top_apps, 1):
        print(f"    {i}. {app[0]}: {format_duration(app[1])}")

def view_daily_breakdown(conn, days=7):
    """View daily breakdown"""
    cursor = conn.cursor()
    
    print(f"\n📅 Daily Breakdown (Last {days} days):\n")
    
    rows = []
    for i in range(days):
        day = datetime.now() - timedelta(days=i)
        start_of_day = datetime(day.year, day.month, day.day).timestamp() * 1000
        end_of_day = start_of_day + (24 * 60 * 60 * 1000)
        
        cursor.execute("""
            SELECT SUM(duration), COUNT(*)
            FROM sessions
            WHERE start_time >= ? AND start_time < ? AND end_time IS NOT NULL
        """, (start_of_day, end_of_day))
        
        result = cursor.fetchone()
        total_time = result[0] or 0
        session_count = result[1] or 0
        
        day_name = "Today" if i == 0 else "Yesterday" if i == 1 else day.strftime("%A")
        rows.append([
            day.strftime("%Y-%m-%d"),
            day_name,
            format_duration(total_time),
            str(session_count)
        ])
    
    headers = ["Date", "Day", "Time", "Sessions"]
    print_table(headers, rows)

def main_menu():
    """Display main menu"""
    print("\n" + "="*60)
    print("  STEAM TIME TRACKER - DATABASE VIEWER")
    print("="*60)
    print("\n  Options:")
    print("    1. View all apps")
    print("    2. View top 10 apps")
    print("    3. View apps by category")
    print("    4. View categories")
    print("    5. View recent sessions")
    print("    6. View statistics")
    print("    7. View daily breakdown")
    print("    8. Search app by name")
    print("    q. Quit")
    print()

def search_apps(conn, search_term):
    """Search for apps"""
    cursor = conn.cursor()
    
    print(f"\n🔍 Search results for '{search_term}':\n")
    
    cursor.execute("""
        SELECT name, executable, category, total_time, launch_count, last_used
        FROM apps 
        WHERE (name LIKE ? OR executable LIKE ?) AND hidden = 0
        ORDER BY total_time DESC
    """, (f"%{search_term}%", f"%{search_term}%"))
    
    apps = cursor.fetchall()
    
    if not apps:
        print("  No apps found")
        return
    
    rows = []
    for app in apps:
        rows.append([
            app[0][:30],
            app[1][:20],
            app[2][:15],
            format_duration(app[3]),
            str(app[4]),
            format_date(app[5])
        ])
    
    headers = ["Name", "Executable", "Category", "Time", "Launches", "Last Used"]
    print_table(headers, rows)

def main():
    # Find database
    db_path = find_database()
    
    if not db_path:
        print("❌ Could not find database file!")
        print("\nSearched for: time-tracker.db")
        print("Please make sure the database exists in your project directory.")
        return
    
    print(f"\n✓ Found database: {db_path}\n")
    
    # Check if we should just calculate today's time
    if len(sys.argv) > 1 and sys.argv[1] == '--today':
        calculate_today_time(db_path)
        return
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    try:
        while True:
            main_menu()
            choice = input("  Choose an option: ").strip()
            
            if choice == '1':
                view_apps(conn)
            elif choice == '2':
                view_apps(conn, limit=10)
            elif choice == '3':
                view_categories(conn)
                category = input("\n  Enter category name: ").strip()
                if category:
                    view_apps(conn, category=category)
            elif choice == '4':
                view_categories(conn)
            elif choice == '5':
                try:
                    limit = int(input("  How many sessions? (default 20): ") or "20")
                except:
                    limit = 20
                view_recent_sessions(conn, limit)
            elif choice == '6':
                view_stats(conn)
            elif choice == '7':
                try:
                    days = int(input("  How many days? (default 7): ") or "7")
                except:
                    days = 7
                view_daily_breakdown(conn, days)
            elif choice == '8':
                search_term = input("  Enter search term: ").strip()
                if search_term:
                    search_apps(conn, search_term)
            elif choice.lower() == 'q':
                print("\n  Goodbye! 👋\n")
                break
            else:
                print("\n  Invalid option!")
            
            input("\n  Press Enter to continue...")
    
    finally:
        conn.close()

if __name__ == "__main__":
    main()