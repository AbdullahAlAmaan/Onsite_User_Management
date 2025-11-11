#!/usr/bin/env python3
"""Test file upload security features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.file_utils import sanitize_filename, validate_file_extension, validate_file_size, get_safe_file_path
from app.core.config import settings
from fastapi import HTTPException

def test_filename_sanitization():
    """Test filename sanitization to prevent path traversal."""
    print("\n" + "=" * 60)
    print("TEST: Filename Sanitization")
    print("=" * 60)
    
    test_cases = [
        ("../../../etc/passwd", "etc_passwd"),
        ("file.xlsx", "file.xlsx"),
        ("file with spaces.xlsx", "file_with_spaces.xlsx"),
        ("file<script>.xlsx", "file_script_.xlsx"),
        ("file/with/slashes.xlsx", "file_with_slashes.xlsx"),
        ("file\\with\\backslashes.xlsx", "file_with_backslashes.xlsx"),
        ("file" + "\x00" + "null.xlsx", "file_null.xlsx"),  # Null byte
        ("a" * 200 + ".xlsx", "a" * 90 + ".xlsx"),  # Long filename
    ]
    
    all_passed = True
    for original, expected_pattern in test_cases:
        sanitized = sanitize_filename(original)
        print(f"  '{original}' -> '{sanitized}'")
        
        # Check that no directory separators remain
        if "/" in sanitized or "\\" in sanitized:
            print(f"    ✗ FAIL: Directory separator found in sanitized name")
            all_passed = False
        # Check that filename is reasonable length
        if len(sanitized) > 100:
            print(f"    ✗ FAIL: Filename too long ({len(sanitized)} chars)")
            all_passed = False
    
    if all_passed:
        print("\n✓ PASS: Filename sanitization works correctly")
        return True
    else:
        print("\n✗ FAIL: Filename sanitization has issues")
        return False

def test_file_extension_validation():
    """Test file extension validation."""
    print("\n" + "=" * 60)
    print("TEST: File Extension Validation")
    print("=" * 60)
    
    valid_files = ["test.xlsx", "test.XLSX", "test.xls", "test.csv", "TEST.CSV"]
    invalid_files = ["test.exe", "test.php", "test.sh", "test", "test.xlsx.exe"]
    
    all_passed = True
    
    # Test valid files
    for filename in valid_files:
        try:
            validate_file_extension(filename)
            print(f"  ✓ '{filename}' - Valid (as expected)")
        except HTTPException as e:
            print(f"  ✗ '{filename}' - Rejected (unexpected): {e.detail}")
            all_passed = False
    
    # Test invalid files
    for filename in invalid_files:
        try:
            validate_file_extension(filename)
            print(f"  ✗ '{filename}' - Accepted (unexpected - should be rejected)")
            all_passed = False
        except HTTPException as e:
            print(f"  ✓ '{filename}' - Rejected (as expected): {e.detail}")
    
    if all_passed:
        print("\n✓ PASS: File extension validation works correctly")
        return True
    else:
        print("\n✗ FAIL: File extension validation has issues")
        return False

def test_file_size_validation():
    """Test file size validation."""
    print("\n" + "=" * 60)
    print("TEST: File Size Validation")
    print("=" * 60)
    
    max_size = settings.MAX_UPLOAD_SIZE
    print(f"  Max upload size: {max_size / (1024 * 1024):.0f}MB")
    
    # Test valid sizes
    valid_sizes = [0, 1, max_size - 1, max_size]
    # Test invalid sizes
    invalid_sizes = [max_size + 1, max_size * 2, 100 * 1024 * 1024]  # 100MB
    
    all_passed = True
    
    for size in valid_sizes:
        try:
            validate_file_size(size)
            print(f"  ✓ {size / (1024 * 1024):.2f}MB - Valid (as expected)")
        except HTTPException as e:
            print(f"  ✗ {size / (1024 * 1024):.2f}MB - Rejected (unexpected): {e.detail}")
            all_passed = False
    
    for size in invalid_sizes:
        try:
            validate_file_size(size)
            print(f"  ✗ {size / (1024 * 1024):.2f}MB - Accepted (unexpected - should be rejected)")
            all_passed = False
        except HTTPException as e:
            print(f"  ✓ {size / (1024 * 1024):.2f}MB - Rejected (as expected)")
    
    if all_passed:
        print("\n✓ PASS: File size validation works correctly")
        return True
    else:
        print("\n✗ FAIL: File size validation has issues")
        return False

def test_safe_file_path():
    """Test safe file path generation."""
    print("\n" + "=" * 60)
    print("TEST: Safe File Path Generation")
    print("=" * 60)
    
    test_filenames = ["test.xlsx", "test file.xlsx", "../../etc/passwd"]
    
    all_passed = True
    for filename in test_filenames:
        try:
            safe_path = get_safe_file_path(filename)
            print(f"  '{filename}' -> '{safe_path}'")
            
            # Check that path is within UPLOAD_DIR
            upload_dir = os.path.abspath(settings.UPLOAD_DIR)
            safe_path_abs = os.path.abspath(safe_path)
            
            if not safe_path_abs.startswith(upload_dir):
                print(f"    ✗ FAIL: Path outside UPLOAD_DIR")
                all_passed = False
            
            # Check that directory exists
            if not os.path.exists(os.path.dirname(safe_path)):
                print(f"    ✗ FAIL: Directory not created")
                all_passed = False
        except Exception as e:
            print(f"  ✗ '{filename}' - Error: {e}")
            all_passed = False
    
    if all_passed:
        print("\n✓ PASS: Safe file path generation works correctly")
        return True
    else:
        print("\n✗ FAIL: Safe file path generation has issues")
        return False

def main():
    """Run all file upload security tests."""
    print("=" * 60)
    print("FILE UPLOAD SECURITY TESTS")
    print("=" * 60)
    
    results = []
    results.append(test_filename_sanitization())
    results.append(test_file_extension_validation())
    results.append(test_file_size_validation())
    results.append(test_safe_file_path())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL FILE UPLOAD SECURITY TESTS PASSED")
        return True
    else:
        print("✗ SOME FILE UPLOAD SECURITY TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

