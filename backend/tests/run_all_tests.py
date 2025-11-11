#!/usr/bin/env python3
"""Run all test files in the tests directory."""

import sys
import os
import subprocess
from pathlib import Path

def run_test_file(test_file):
    """Run a single test file and return success status."""
    print(f"\n{'=' * 80}")
    print(f"Running: {test_file}")
    print('=' * 80)
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            capture_output=False,
            text=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Error running {test_file}: {e}")
        return False

def main():
    """Run all test files."""
    tests_dir = Path(__file__).parent
    test_files = sorted(tests_dir.glob("test_*.py"))
    
    # Exclude this file
    test_files = [f for f in test_files if f.name != "run_all_tests.py"]
    
    print("=" * 80)
    print("RUNNING ALL TESTS")
    print("=" * 80)
    print(f"Found {len(test_files)} test file(s):")
    for test_file in test_files:
        print(f"  - {test_file.name}")
    
    results = {}
    for test_file in test_files:
        success = run_test_file(str(test_file))
        results[test_file.name] = success
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for success in results.values() if success)
    total = len(results)
    
    for test_file, success in results.items():
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"  {status}: {test_file}")
    
    print("\n" + "=" * 80)
    print(f"Total: {passed}/{total} test files passed")
    if passed == total:
        print("✓ ALL TESTS PASSED!")
        return True
    else:
        print("✗ SOME TESTS FAILED")
        return False
    print("=" * 80)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

