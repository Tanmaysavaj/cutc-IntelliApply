#!/usr/bin/env python3
"""Integration test for the complete AI Career Insights flow."""

import sys
import os
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

def test_backend_imports():
    """Test that all backend components import successfully."""
    print("Testing backend imports...")
    
    try:
        # Change to backend directory for imports
        import os
        original_cwd = os.getcwd()
        os.chdir("backend")
        
        # Add parent directory to path
        import sys
        sys.path.insert(0, "..")
        
        try:
            # Test main app
            from app.main import app
            print("✓ Main app import successful")
            
            # Test analysis API
            from app.api.analysis import router
            print("✓ Analysis API import successful")
            
            # Test AI insights service
            from app.services.ai_insights_service import AIInsightsService
            print("✓ AI Insights Service import successful")
            
            # Test schemas
            from app.schemas.ai_insights import AnalysisResponse, AIInsights, SkillGap, ApplicationRecommendation
            print("✓ AI Insights schemas import successful")
            
            # Test matching service
            from app.services.matching_service import MatchingService
            print("✓ Matching Service import successful")
            
            return True
        finally:
            # Restore original directory
            os.chdir(original_cwd)
            # Remove the path we added
            if ".." in sys.path:
                sys.path.remove("..")
                
    except Exception as e:
        print(f"✗ Import error: {e}")
        return False

def test_frontend_types():
    """Test that frontend TypeScript types can be validated."""
    print("\nTesting frontend types structure...")
    
    # Check if frontend types file exists
    types_path = Path(__file__).resolve().parent / "frontend" / "app" / "types" / "analysis.ts"
    if types_path.exists():
        print(f"✓ Frontend types file exists at: {types_path}")
        
        # Read and check structure
        content = types_path.read_text()
        required_interfaces = [
            "AnalysisResponse",
            "MatchResult", 
            "AIInsights",
            "SkillGap",
            "ApplicationRecommendation"
        ]
        
        missing = []
        for interface in required_interfaces:
            if f"interface {interface}" in content or f"export interface {interface}" in content:
                print(f"✓ Interface {interface} found")
            else:
                missing.append(interface)
        
        if missing:
            print(f"✗ Missing interfaces: {missing}")
            return False
        else:
            print("✓ All required interfaces found")
            return True
    else:
        print(f"✗ Frontend types file not found at: {types_path}")
        return False

def test_api_structure():
    """Test that the API response structure is correct."""
    print("\nTesting API response structure...")
    
    try:
        # Change to backend directory for imports
        import os
        original_cwd = os.getcwd()
        os.chdir("backend")
        
        # Add parent directory to path
        import sys
        sys.path.insert(0, "..")
        
        try:
            from app.schemas.ai_insights import AnalysisResponse
            
            # Create a minimal valid response
            from app.schemas.matching import MatchResult, ScoreBreakdown, RequiredSkillsScore, PreferredSkillsScore, ExperienceScore, EducationScore, ResponsibilitiesScore
            
            match_result = MatchResult(
                overall_score=75,
                score_breakdown=ScoreBreakdown(
                    required_skills=RequiredSkillsScore(
                        score=80,
                        matched_skills=["Python", "SQL"],
                        missing_skills=["Kubernetes"]
                    ),
                    preferred_skills=PreferredSkillsScore(
                        score=60,
                        matched_skills=["Docker"],
                        missing_skills=["Terraform"]
                    ),
                    experience=ExperienceScore(
                        score=100,
                        matched=True,
                        unknown=False,
                        job_requirement="3+ years",
                        candidate_experience="5 years"
                    ),
                    education=EducationScore(
                        score=100,
                        matched=True,
                        unknown=False,
                        job_requirement="Bachelor's",
                        candidate_education="Bachelor of Science"
                    ),
                    responsibilities=ResponsibilitiesScore(
                        score=70,
                        keyword_count=3,
                        keyword_matches=["design", "develop", "test"]
                    )
                ),
                matched_required_skills=["Python", "SQL"],
                missing_required_skills=["Kubernetes"],
                matched_preferred_skills=["Docker"],
                missing_preferred_skills=["Terraform"],
                strengths=["Strong Python skills", "Relevant experience"],
                gaps=["Missing Kubernetes", "Limited Terraform experience"],
                status="complete"
            )
            
            from app.schemas.ai_insights import AIInsights, SkillGap, ApplicationRecommendation
            
            ai_insights = AIInsights(
                status="completed",
                summary="Good match with some skill gaps",
                why_you_match=["Python experience matches requirements", "Relevant work experience"],
                skill_gaps=[
                    SkillGap(
                        skill="Kubernetes",
                        importance="required",
                        reason="Required for container orchestration",
                        recommendation="Take a Kubernetes fundamentals course"
                    )
                ],
                resume_improvements=["Highlight cloud experience more prominently"],
                application_recommendation=ApplicationRecommendation(
                    recommendation="apply",
                    reason="Strong match on core requirements with addressable gaps"
                ),
                interview_focus=["System design", "Cloud architecture"]
            )
            
            analysis_response = AnalysisResponse(
                success=True,
                analysis_id="test-uuid-123",
                status="completed",
                match=match_result,
                ai_insights=ai_insights
            )
            
            # Convert to dict to verify structure
            response_dict = analysis_response.model_dump()
            
            required_fields = ["success", "analysis_id", "status", "match", "ai_insights"]
            for field in required_fields:
                if field in response_dict:
                    print(f"✓ Field '{field}' present in response")
                else:
                    print(f"✗ Missing field: {field}")
                    return False
            
            # Check nested structure
            if "overall_score" in response_dict["match"]:
                print("✓ Match result contains overall_score")
            else:
                print("✗ Match result missing overall_score")
                return False
                
            if "summary" in response_dict["ai_insights"]:
                print("✓ AI insights contains summary")
            else:
                print("✗ AI insights missing summary")
                return False
            
            print("✓ API response structure is valid")
            return True
            
        finally:
            # Restore original directory
            os.chdir(original_cwd)
            # Remove the path we added
            if ".." in sys.path:
                sys.path.remove("..")
                
    except Exception as e:
        print(f"✗ API structure error: {e}")
        return False

def test_component_structure():
    """Test that frontend components exist."""
    print("\nTesting frontend component structure...")
    
    components = [
        "frontend/app/analysis/page.tsx",
        "frontend/components/analysis/AnalysisForm.tsx",
        "frontend/components/analysis/AnalysisResults.tsx",
        "frontend/components/analysis/ScoreCard.tsx",
        "frontend/components/analysis/SkillsAnalysis.tsx",
        "frontend/components/analysis/AIInsightsDisplay.tsx"
    ]
    
    all_exist = True
    for component in components:
        path = Path(__file__).resolve().parent / component
        if path.exists():
            print(f"✓ Component exists: {component}")
        else:
            print(f"✗ Missing component: {component}")
            all_exist = False
    
    return all_exist

def main():
    """Run all integration tests."""
    print("=" * 60)
    print("AI Career Insights - Integration Test")
    print("=" * 60)
    
    tests = [
        ("Backend Imports", test_backend_imports),
        ("Frontend Types", test_frontend_types),
        ("API Structure", test_api_structure),
        ("Component Structure", test_component_structure)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 40)
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    
    all_passed = True
    for test_name, success in results:
        status = "PASS" if success else "FAIL"
        print(f"{test_name:30} {status}")
        if not success:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ All integration tests passed!")
        print("The AI Career Insights feature is ready for use.")
    else:
        print("✗ Some integration tests failed.")
        print("Please fix the issues before deployment.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())