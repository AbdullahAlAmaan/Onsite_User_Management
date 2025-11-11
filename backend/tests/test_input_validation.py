#!/usr/bin/env python3
"""Test input validation features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.validation import validate_sbu
from app.models.enrollment import EligibilityStatus, ApprovalStatus, CompletionStatus

def test_sbu_validation():
    """Test SBU validation."""
    print("\n" + "=" * 60)
    print("TEST: SBU Validation")
    print("=" * 60)
    
    valid_sbus = ["IT", "HR", "Finance", "Operations", "Sales", "Marketing"]
    # Note: "HR " and "  Finance" will be stripped to "HR" and "Finance" which are valid
    invalid_sbus = ["Invalid", "IT Department", "it", ""]
    
    all_passed = True
    
    # Test valid SBUs
    for sbu in valid_sbus:
        try:
            result = validate_sbu(sbu)
            print(f"  ✓ '{sbu}' - Valid (as expected)")
            if result != sbu:
                print(f"    ✗ FAIL: Returned value '{result}' doesn't match input '{sbu}'")
                all_passed = False
        except ValueError as e:
            print(f"  ✗ '{sbu}' - Rejected (unexpected): {e}")
            all_passed = False
    
    # Test invalid SBUs
    for sbu in invalid_sbus:
        try:
            validate_sbu(sbu)
            print(f"  ✗ '{sbu}' - Accepted (unexpected - should be rejected)")
            all_passed = False
        except ValueError as e:
            print(f"  ✓ '{sbu}' - Rejected (as expected): {e}")
    
    # Test whitespace handling (should strip and validate)
    whitespace_cases = [("HR ", "HR"), ("  Finance", "Finance"), ("  IT  ", "IT")]
    for original, expected in whitespace_cases:
        try:
            result = validate_sbu(original)
            if result == expected:
                print(f"  ✓ '{original}' -> '{result}' (whitespace stripped correctly)")
            else:
                print(f"  ✗ '{original}' -> '{result}' (expected '{expected}')")
                all_passed = False
        except ValueError as e:
            print(f"  ✗ '{original}' - Rejected (unexpected): {e}")
            all_passed = False
    
    if all_passed:
        print("\n✓ PASS: SBU validation works correctly")
        return True
    else:
        print("\n✗ FAIL: SBU validation has issues")
        return False

def test_eligibility_status_enum():
    """Test EligibilityStatus enum values."""
    print("\n" + "=" * 60)
    print("TEST: EligibilityStatus Enum")
    print("=" * 60)
    
    expected_values = {
        "PENDING": "Pending",
        "ELIGIBLE": "Eligible",
        "INELIGIBLE_PREREQUISITE": "Ineligible (Missing Prerequisite)",
        "INELIGIBLE_DUPLICATE": "Ineligible (Already Taken)",
        "INELIGIBLE_ANNUAL_LIMIT": "Ineligible (Annual Limit)"
    }
    
    all_passed = True
    for enum_name, expected_value in expected_values.items():
        enum_value = getattr(EligibilityStatus, enum_name, None)
        if enum_value is None:
            print(f"  ✗ FAIL: {enum_name} not found in EligibilityStatus")
            all_passed = False
        elif enum_value.value != expected_value:
            print(f"  ✗ FAIL: {enum_name} has value '{enum_value.value}', expected '{expected_value}'")
            all_passed = False
        else:
            print(f"  ✓ {enum_name} = '{enum_value.value}'")
    
    if all_passed:
        print("\n✓ PASS: EligibilityStatus enum is correct")
        return True
    else:
        print("\n✗ FAIL: EligibilityStatus enum has issues")
        return False

def test_approval_status_enum():
    """Test ApprovalStatus enum values."""
    print("\n" + "=" * 60)
    print("TEST: ApprovalStatus Enum")
    print("=" * 60)
    
    expected_values = {
        "PENDING": "Pending",
        "APPROVED": "Approved",
        "REJECTED": "Rejected",
        "WITHDRAWN": "Withdrawn"
    }
    
    all_passed = True
    for enum_name, expected_value in expected_values.items():
        enum_value = getattr(ApprovalStatus, enum_name, None)
        if enum_value is None:
            print(f"  ✗ FAIL: {enum_name} not found in ApprovalStatus")
            all_passed = False
        elif enum_value.value != expected_value:
            print(f"  ✗ FAIL: {enum_name} has value '{enum_value.value}', expected '{expected_value}'")
            all_passed = False
        else:
            print(f"  ✓ {enum_name} = '{enum_value.value}'")
    
    if all_passed:
        print("\n✓ PASS: ApprovalStatus enum is correct")
        return True
    else:
        print("\n✗ FAIL: ApprovalStatus enum has issues")
        return False

def test_completion_status_enum():
    """Test CompletionStatus enum values."""
    print("\n" + "=" * 60)
    print("TEST: CompletionStatus Enum")
    print("=" * 60)
    
    expected_values = {
        "NOT_STARTED": "Not Started",
        "IN_PROGRESS": "In Progress",
        "COMPLETED": "Completed",
        "FAILED": "Failed"
    }
    
    all_passed = True
    for enum_name, expected_value in expected_values.items():
        enum_value = getattr(CompletionStatus, enum_name, None)
        if enum_value is None:
            print(f"  ✗ FAIL: {enum_name} not found in CompletionStatus")
            all_passed = False
        elif enum_value.value != expected_value:
            print(f"  ✗ FAIL: {enum_name} has value '{enum_value.value}', expected '{expected_value}'")
            all_passed = False
        else:
            print(f"  ✓ {enum_name} = '{enum_value.value}'")
    
    if all_passed:
        print("\n✓ PASS: CompletionStatus enum is correct")
        return True
    else:
        print("\n✗ FAIL: CompletionStatus enum has issues")
        return False

def test_enum_string_comparison():
    """Test that enum values can be compared with strings."""
    print("\n" + "=" * 60)
    print("TEST: Enum String Comparison")
    print("=" * 60)
    
    all_passed = True
    
    # Test EligibilityStatus
    if EligibilityStatus.ELIGIBLE.value == "Eligible":
        print("  ✓ EligibilityStatus.ELIGIBLE.value == 'Eligible'")
    else:
        print("  ✗ FAIL: EligibilityStatus.ELIGIBLE.value != 'Eligible'")
        all_passed = False
    
    # Test ApprovalStatus
    if ApprovalStatus.APPROVED.value == "Approved":
        print("  ✓ ApprovalStatus.APPROVED.value == 'Approved'")
    else:
        print("  ✗ FAIL: ApprovalStatus.APPROVED.value != 'Approved'")
        all_passed = False
    
    # Test CompletionStatus
    if CompletionStatus.COMPLETED.value == "Completed":
        print("  ✓ CompletionStatus.COMPLETED.value == 'Completed'")
    else:
        print("  ✗ FAIL: CompletionStatus.COMPLETED.value != 'Completed'")
        all_passed = False
    
    if all_passed:
        print("\n✓ PASS: Enum string comparison works correctly")
        return True
    else:
        print("\n✗ FAIL: Enum string comparison has issues")
        return False

def main():
    """Run all input validation tests."""
    print("=" * 60)
    print("INPUT VALIDATION TESTS")
    print("=" * 60)
    
    results = []
    results.append(test_sbu_validation())
    results.append(test_eligibility_status_enum())
    results.append(test_approval_status_enum())
    results.append(test_completion_status_enum())
    results.append(test_enum_string_comparison())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL INPUT VALIDATION TESTS PASSED")
        return True
    else:
        print("✗ SOME INPUT VALIDATION TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

