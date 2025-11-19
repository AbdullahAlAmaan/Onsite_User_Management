#!/usr/bin/env python3
"""Direct test of email sending functionality."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.services.email_service import EmailService
from datetime import datetime, timedelta

print("=" * 60)
print("EMAIL CONFIGURATION TEST")
print("=" * 60)

print(f"\n1. Checking configuration...")
print(f"   SMTP_ENABLED: {settings.SMTP_ENABLED}")
print(f"   SMTP_HOST: {settings.SMTP_HOST}")
print(f"   SMTP_PORT: {settings.SMTP_PORT}")
print(f"   SMTP_USER: {settings.SMTP_USER}")
print(f"   SMTP_PASSWORD: {'*' * len(settings.SMTP_PASSWORD) if settings.SMTP_PASSWORD else 'NOT SET'}")
print(f"   SMTP_FROM_EMAIL: {settings.SMTP_FROM_EMAIL}")
print(f"   ADMIN_EMAIL: {settings.ADMIN_EMAIL}")
print(f"   REMINDER_MINUTES_BEFORE: {settings.REMINDER_MINUTES_BEFORE}")

print(f"\n2. Checking if email service is enabled...")
is_enabled = EmailService.is_enabled()
print(f"   EmailService.is_enabled(): {is_enabled}")

if not is_enabled:
    print("\n❌ Email service is NOT enabled!")
    print("   Please check your .env file configuration.")
    sys.exit(1)

print("\n3. Testing email send...")
test_time = datetime.now() + timedelta(minutes=2)
success = EmailService.send_class_reminder(
    admin_email=settings.ADMIN_EMAIL,
    course_name="Test Course",
    batch_code="TEST-001",
    class_time=test_time,
    start_time="15:30",
    end_time="17:30",
    day="Wednesday"
)

if success:
    print("✅ Email sent successfully!")
    print(f"   Check your inbox: {settings.ADMIN_EMAIL}")
else:
    print("❌ Failed to send email")
    print("   Check the logs for error details")

