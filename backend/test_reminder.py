#!/usr/bin/env python3
"""Test script for email reminder system."""
import requests
import json
from datetime import datetime, timedelta
import time

# API base URL
BASE_URL = "http://localhost:8000/api/v1"

# Admin credentials
ADMIN_EMAIL = "amaanhreed028@gmail.com"
ADMIN_PASSWORD = "bs23@2025"

def login():
    """Login and get auth token."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def create_test_course(token, class_time):
    """Create a test course with class schedule."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Calculate dates
    today = datetime.now().date()
    end_date = today + timedelta(days=7)
    
    # Get day name
    day_name = class_time.strftime("%A")
    time_str = class_time.strftime("%H:%M")
    
    # Calculate end time (2 hours later)
    end_time = (class_time + timedelta(hours=2)).strftime("%H:%M")
    
    course_data = {
        "name": "Test Reminder Course",
        "batch_code": f"TEST-{int(time.time())}",
        "description": "Test course for email reminder system",
        "start_date": str(today),
        "end_date": str(end_date),
        "seat_limit": 10,
        "status": "ongoing",  # Must be ongoing for reminders
        "class_schedule": [
            {
                "day": day_name,
                "start_time": time_str,
                "end_time": end_time
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/courses/",
        json=course_data,
        headers=headers
    )
    
    if response.status_code == 201:
        course = response.json()
        print(f"✓ Test course created: {course['name']} (ID: {course['id']})")
        print(f"  Batch: {course['batch_code']}")
        print(f"  Class schedule: {day_name} {time_str} - {end_time}")
        return course
    else:
        print(f"✗ Failed to create course: {response.status_code} - {response.text}")
        return None

def main():
    print("=" * 60)
    print("EMAIL REMINDER TEST")
    print("=" * 60)
    
    # Login
    print("\n1. Logging in...")
    token = login()
    if not token:
        return
    print("✓ Login successful")
    
    # Calculate test class time (2 minutes from now)
    now = datetime.now()
    test_class_time = now + timedelta(minutes=2)
    
    print(f"\n2. Current time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Test class time: {test_class_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Day: {test_class_time.strftime('%A')}")
    print(f"   Reminder should be sent at: {(test_class_time - timedelta(minutes=1)).strftime('%H:%M:%S')}")
    
    # Create test course
    print("\n3. Creating test course...")
    course = create_test_course(token, test_class_time)
    if not course:
        return
    
    print("\n4. Test course created successfully!")
    print("\n" + "=" * 60)
    print("MONITORING REMINDER SYSTEM")
    print("=" * 60)
    print(f"\nThe reminder system will check every minute.")
    print(f"Reminder should be sent at: {(test_class_time - timedelta(minutes=1)).strftime('%H:%M:%S')}")
    print(f"Class starts at: {test_class_time.strftime('%H:%M:%S')}")
    print(f"\nPlease check:")
    print(f"  1. Backend logs for reminder messages")
    print(f"  2. Your email inbox: {ADMIN_EMAIL}")
    print(f"\nWaiting 3 minutes to see if reminder is sent...")
    print("(Press Ctrl+C to stop early)")
    
    # Wait and show countdown
    wait_until = test_class_time + timedelta(minutes=1)
    while datetime.now() < wait_until:
        remaining = (wait_until - datetime.now()).total_seconds()
        if remaining > 0:
            mins, secs = divmod(int(remaining), 60)
            print(f"\r⏳ Time remaining: {mins:02d}:{secs:02d}", end="", flush=True)
            time.sleep(1)
    
    print("\n\n✓ Test monitoring complete!")
    print("Check your email and backend logs for the reminder.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")

