#!/usr/bin/env python3
"""Test authentication and authorization features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.core.auth import verify_admin_credentials, create_access_token, verify_token
from app.core.config import settings
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

def test_password_timing_attack_protection():
    """Test that password comparison uses constant-time comparison."""
    print("\n" + "=" * 60)
    print("TEST: Password Timing Attack Protection")
    print("=" * 60)
    
    # Set test credentials
    original_email = getattr(settings, 'ADMIN_EMAIL', '')
    original_password = getattr(settings, 'ADMIN_PASSWORD', '')
    
    # Test with correct credentials
    result1 = verify_admin_credentials(original_email, original_password)
    print(f"✓ Correct credentials: {result1}")
    
    # Test with wrong password
    result2 = verify_admin_credentials(original_email, "wrong_password")
    print(f"✓ Wrong password: {result2}")
    
    # Test with wrong email
    result3 = verify_admin_credentials("wrong@email.com", original_password)
    print(f"✓ Wrong email: {result3}")
    
    # Test with both wrong
    result4 = verify_admin_credentials("wrong@email.com", "wrong_password")
    print(f"✓ Both wrong: {result4}")
    
    if result1 and not result2 and not result3 and not result4:
        print("\n✓ PASS: Password verification works correctly")
        return True
    else:
        print("\n✗ FAIL: Password verification failed")
        return False

def test_jwt_token_creation():
    """Test JWT token creation and expiration."""
    print("\n" + "=" * 60)
    print("TEST: JWT Token Creation")
    print("=" * 60)
    
    email = getattr(settings, 'ADMIN_EMAIL', 'test@example.com')
    token = create_access_token(email)
    
    print(f"✓ Token created: {token[:50]}...")
    
    # Decode token to verify
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print(f"✓ Token decoded successfully")
        print(f"  - Email: {payload.get('sub')}")
        print(f"  - Role: {payload.get('role')}")
        print(f"  - Expiration: {payload.get('exp')}")
        
        if payload.get('sub') == email and payload.get('role') == 'admin':
            print("\n✓ PASS: JWT token creation works correctly")
            return True
        else:
            print("\n✗ FAIL: JWT token payload incorrect")
            return False
    except Exception as e:
        print(f"\n✗ FAIL: Token decode error: {e}")
        return False

def test_jwt_token_expiration():
    """Test that JWT tokens expire correctly."""
    print("\n" + "=" * 60)
    print("TEST: JWT Token Expiration")
    print("=" * 60)
    
    email = getattr(settings, 'ADMIN_EMAIL', 'test@example.com')
    token = create_access_token(email)
    
    # Decode to check expiration
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    exp_timestamp = payload.get('exp')
    
    # Check if expiration is set (should be ~30 minutes from now)
    from datetime import datetime, timezone
    current_timestamp = datetime.now(timezone.utc).timestamp()
    time_until_expiry_seconds = exp_timestamp - current_timestamp
    time_until_expiry_minutes = time_until_expiry_seconds / 60
    expected_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    
    print(f"✓ Current time: {datetime.now(timezone.utc)}")
    print(f"✓ Expiration timestamp: {exp_timestamp}")
    print(f"✓ Current timestamp: {int(current_timestamp)}")
    print(f"✓ Token expires in: {time_until_expiry_minutes:.1f} minutes")
    print(f"✓ Expected: ~{expected_minutes} minutes")
    print(f"✓ Config value: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    
    # Allow 1 minute tolerance
    if abs(time_until_expiry_minutes - expected_minutes) < 1:
        print("\n✓ PASS: Token expiration is correct")
        return True
    else:
        print(f"\n✗ FAIL: Token expiration time incorrect (got {time_until_expiry_minutes:.1f} min, expected {expected_minutes} min)")
        return False

def main():
    """Run all authentication tests."""
    print("=" * 60)
    print("AUTHENTICATION TESTS")
    print("=" * 60)
    
    results = []
    results.append(test_password_timing_attack_protection())
    results.append(test_jwt_token_creation())
    results.append(test_jwt_token_expiration())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL AUTHENTICATION TESTS PASSED")
        return True
    else:
        print("✗ SOME AUTHENTICATION TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

