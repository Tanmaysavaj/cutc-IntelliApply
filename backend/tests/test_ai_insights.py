"""Tests for the AI Insights Service."""

import sys
from pathlib import Path
import pytest
from unittest.mock import Mock, patch, AsyncMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ai_insights_service import AIInsightsService
from app.schemas.ai_insights import AIInsights, SkillGap, ApplicationRecommendation
from src.models.resume import Resume, WorkExperience, Education
from src.models.job import JobPosting
from app.schemas.matching import MatchResult, ScoreBreakdown, RequiredSkillsScore, PreferredSkillsScore, ExperienceScore, EducationScore, ResponsibilitiesScore


class TestAIInsightsService:
    """Tests for the AIInsightsService class."""
    
    def test_prepare_compact_input(self):
        """Test that compact input is prepared correctly."""
        # Create mock LLM service
        mock_llm_service = Mock()
        
        # Create service instance
        service = AIInsightsService(mock_llm_service)
        
        # Create test data
        resume = Resume(
            hard_skills=["Python", "SQL", "AWS"],
            soft_skills=["Communication", "Teamwork"],
            work_experience=[
                WorkExperience(
                    company="Company A",
                    role="Developer",
                    duration="3 years",
                    responsibilities=["Built features", "Deployed to AWS"],
                ),
                WorkExperience(
                    company="Company B",
                    role="Senior Developer",
                    duration="2 years",
                    responsibilities=["Led team", "Designed architecture"],
                ),
            ],
            education=[
                Education(
                    institution="University",
                    degree="Bachelor of Science",
                ),
            ],
            projects=["Project A", "Project B"],
            certifications=["AWS Certified"],
        )
        
        job = JobPosting(
            job_title="Senior Backend Engineer",
            company_name="Tech Corp",
            required_skills=["Python", "AWS", "Kubernetes"],
            preferred_skills=["Docker", "Terraform"],
            key_responsibilities=["Build scalable systems", "Design architecture"],
            experience_level="5+ years",
            education_requirements="Bachelor's degree",
        )
        
        match_result = MatchResult(
            overall_score=75,
            score_breakdown=ScoreBreakdown(
                required_skills=RequiredSkillsScore(
                    score=67,
                    matched_skills=["Python", "AWS"],
                    missing_skills=["Kubernetes"],
                ),
                preferred_skills=PreferredSkillsScore(
                    score=50,
                    matched_skills=["Docker"],
                    missing_skills=["Terraform"],
                ),
                experience=ExperienceScore(
                    score=100,
                    matched=True,
                    unknown=False,
                    job_requirement="5+ years",
                    candidate_experience="5 years",
                ),
                education=EducationScore(
                    score=100,
                    matched=True,
                    unknown=False,
                    job_requirement="Bachelor's degree",
                    candidate_education="Bachelor of Science",
                ),
                responsibilities=ResponsibilitiesScore(
                    score=80,
                    keyword_count=5,
                    keyword_matches=["scalable", "systems", "design", "architecture"],
                ),
            ),
            matched_required_skills=["Python", "AWS"],
            missing_required_skills=["Kubernetes"],
            matched_preferred_skills=["Docker"],
            missing_preferred_skills=["Terraform"],
            strengths=["Matched 2 required skills", "Experience matches requirement"],
            gaps=["Missing Kubernetes", "Missing Terraform"],
            status="complete",
        )
        
        # Prepare compact input
        compact_input = service.prepare_compact_input(resume, job, match_result)
        
        # Verify structure
        assert "job" in compact_input
        assert "resume" in compact_input
        assert "match" in compact_input
        
        # Verify job info
        assert compact_input["job"]["job_title"] == "Senior Backend Engineer"
        assert compact_input["job"]["required_skills"] == ["Python", "AWS", "Kubernetes"]
        assert compact_input["job"]["preferred_skills"] == ["Docker", "Terraform"]
        
        # Verify resume info is compact (limited items)
        assert len(compact_input["resume"]["experience"]) <= 3  # Limited to top 3
        assert len(compact_input["resume"]["projects"]) <= 3    # Limited to top 3
        
        # Verify match info
        assert compact_input["match"]["overall_score"] == 75
        assert compact_input["match"]["score_breakdown"]["required_skills"]["score"] == 67
        assert compact_input["match"]["score_breakdown"]["required_skills"]["missing_skills"] == ["Kubernetes"]
    
    def test_build_system_prompt(self):
        """Test that system prompt contains anti-hallucination rules."""
        mock_llm_service = Mock()
        service = AIInsightsService(mock_llm_service)
        
        prompt = service.build_system_prompt()
        
        # Verify critical rules are present
        assert "deterministic matching engine" in prompt.lower()
        assert "must not recalculate the score" in prompt.lower()
        assert "must not invent" in prompt.lower()
        assert "use only the information provided" in prompt.lower()
        assert "structured json response" in prompt.lower()
    
    def test_generate_insights_success(self):
        """Test successful AI insights generation."""
        # Create mock LLM service with successful response
        mock_llm_service = Mock()
        mock_response = Mock()
        mock_choice = Mock()
        mock_message = Mock()
        
        # Create mock AI insights response
        mock_ai_insights = AIInsights(
            status="completed",
            summary="Strong match with some gaps",
            why_you_match=["Python experience matches", "AWS experience aligns"],
            skill_gaps=[
                SkillGap(
                    skill="Kubernetes",
                    importance="required",
                    reason="Required for the role",
                    recommendation="Learn Kubernetes basics",
                ),
            ],
            resume_improvements=["Highlight AWS experience more"],
            application_recommendation=ApplicationRecommendation(
                recommendation="apply",
                reason="Strong technical match with minor gaps",
            ),
            interview_focus=["AWS experience", "System design"],
        )
        
        mock_message.parsed = mock_ai_insights
        mock_choice.message = mock_message
        mock_response.choices = [mock_choice]
        mock_llm_service.client.beta.chat.completions.parse.return_value = mock_response
        
        # Mock OPENROUTER_MODEL import
        with patch('app.services.ai_insights_service.OPENROUTER_MODEL', 'test-model'):
            # Create service instance
            service = AIInsightsService(mock_llm_service)
            
            # Create test data
            resume = Resume(
                hard_skills=["Python", "AWS"],
                soft_skills=[],
                work_experience=[],
                education=[],
            )
            
            job = JobPosting(
                job_title="Developer",
                company_name="Test Corp",
                required_skills=["Python", "AWS", "Kubernetes"],
                preferred_skills=[],
                key_responsibilities=[],
            )
            
            match_result = MatchResult(
                overall_score=67,
                score_breakdown=ScoreBreakdown(
                    required_skills=RequiredSkillsScore(
                        score=67,
                        matched_skills=["Python", "AWS"],
                        missing_skills=["Kubernetes"],
                    ),
                    preferred_skills=PreferredSkillsScore(score=100, matched_skills=[], missing_skills=[]),
                    experience=ExperienceScore(score=100, matched=True, unknown=True, job_requirement=None),
                    education=EducationScore(score=100, matched=True, unknown=True, job_requirement=None),
                    responsibilities=ResponsibilitiesScore(score=100, keyword_count=0, keyword_matches=[]),
                ),
                matched_required_skills=["Python", "AWS"],
                missing_required_skills=["Kubernetes"],
                matched_preferred_skills=[],
                missing_preferred_skills=[],
                strengths=["Matched Python and AWS"],
                gaps=["Missing Kubernetes"],
                status="complete",
            )
            
            # Generate insights
            insights = service.generate_insights(resume, job, match_result)
            
            # Verify success
            assert insights.status == "completed"
            assert insights.summary == "Strong match with some gaps"
            assert len(insights.why_you_match) == 2
            assert len(insights.skill_gaps) == 1
            assert insights.skill_gaps[0].skill == "Kubernetes"
            assert insights.application_recommendation.recommendation == "apply"
            
            # Verify LLM was called
            mock_llm_service.client.beta.chat.completions.parse.assert_called_once()
    
    def test_generate_insights_llm_failure(self):
        """Test AI insights generation when LLM fails."""
        # Create mock LLM service that raises exception
        mock_llm_service = Mock()
        mock_llm_service.client.beta.chat.completions.parse.side_effect = Exception("LLM API error")
        
        # Create service instance
        service = AIInsightsService(mock_llm_service)
        
        # Create test data
        resume = Resume(hard_skills=[], soft_skills=[])
        job = JobPosting(
            job_title="Developer",
            company_name="Test Corp",
            required_skills=[],
            preferred_skills=[],
            key_responsibilities=[],
        )
        
        match_result = MatchResult(
            overall_score=0,
            score_breakdown=ScoreBreakdown(
                required_skills=RequiredSkillsScore(score=0, matched_skills=[], missing_skills=[]),
                preferred_skills=PreferredSkillsScore(score=0, matched_skills=[], missing_skills=[]),
                experience=ExperienceScore(score=0, matched=False, unknown=True, job_requirement=None),
                education=EducationScore(score=0, matched=False, unknown=True, job_requirement=None),
                responsibilities=ResponsibilitiesScore(score=0, keyword_count=0, keyword_matches=[]),
            ),
            matched_required_skills=[],
            missing_required_skills=[],
            matched_preferred_skills=[],
            missing_preferred_skills=[],
            strengths=[],
            gaps=[],
            status="complete",
        )
        
        # Generate insights (should handle exception)
        insights = service.generate_insights(resume, job, match_result)
        
        # Verify fallback to unavailable status
        assert insights.status == "unavailable"
        assert "AI insights are temporarily unavailable" in insights.summary
        assert insights.application_recommendation.recommendation == "consider"
    
    def test_generate_insights_safe_never_raises(self):
        """Test that generate_insights_safe never raises exceptions."""
        # Create mock LLM service that raises exception
        mock_llm_service = Mock()
        mock_llm_service.client.beta.chat.completions.parse.side_effect = Exception("Critical error")
        
        # Create service instance
        service = AIInsightsService(mock_llm_service)
        
        # Create test data
        resume = Resume(hard_skills=[], soft_skills=[])
        job = JobPosting(
            job_title="Developer",
            company_name="Test Corp",
            required_skills=[],
            preferred_skills=[],
            key_responsibilities=[],
        )
        
        match_result = MatchResult(
            overall_score=0,
            score_breakdown=ScoreBreakdown(
                required_skills=RequiredSkillsScore(score=0, matched_skills=[], missing_skills=[]),
                preferred_skills=PreferredSkillsScore(score=0, matched_skills=[], missing_skills=[]),
                experience=ExperienceScore(score=0, matched=False, unknown=True, job_requirement=None),
                education=EducationScore(score=0, matched=False, unknown=True, job_requirement=None),
                responsibilities=ResponsibilitiesScore(score=0, keyword_count=0, keyword_matches=[]),
            ),
            matched_required_skills=[],
            missing_required_skills=[],
            matched_preferred_skills=[],
            missing_preferred_skills=[],
            strengths=[],
            gaps=[],
            status="complete",
        )
        
        # This should not raise any exception
        insights = service.generate_insights_safe(resume, job, match_result)
        
        # Verify fallback
        assert insights.status == "unavailable"
        assert "AI insights are temporarily unavailable" in insights.summary
    
    def test_validate_insights(self):
        """Test validation of AI insights against actual data."""
        mock_llm_service = Mock()
        service = AIInsightsService(mock_llm_service)
        
        # Create test data
        resume = Resume(
            hard_skills=["Python", "AWS"],
            soft_skills=["Communication"],
        )
        
        job = JobPosting(
            job_title="Developer",
            company_name="Test Corp",
            required_skills=["Python", "AWS", "Kubernetes"],
            preferred_skills=["Docker"],
            key_responsibilities=[],
        )
        
        match_result = MatchResult(
            overall_score=67,
            score_breakdown=ScoreBreakdown(
                required_skills=RequiredSkillsScore(
                    score=67,
                    matched_skills=["Python", "AWS"],
                    missing_skills=["Kubernetes"],
                ),
                preferred_skills=PreferredSkillsScore(
                    score=0,
                    matched_skills=[],
                    missing_skills=["Docker"],
                ),
                experience=ExperienceScore(score=100, matched=True, unknown=True, job_requirement=None),
                education=EducationScore(score=100, matched=True, unknown=True, job_requirement=None),
                responsibilities=ResponsibilitiesScore(score=100, keyword_count=0, keyword_matches=[]),
            ),
            matched_required_skills=["Python", "AWS"],
            missing_required_skills=["Kubernetes"],
            matched_preferred_skills=[],
            missing_preferred_skills=["Docker"],
            strengths=[],
            gaps=[],
            status="complete",
        )
        
        # Create valid AI insights
        valid_insights = AIInsights(
            status="completed",
            summary="Test summary",
            why_you_match=["Python experience"],
            skill_gaps=[
                SkillGap(
                    skill="Kubernetes",
                    importance="required",
                    reason="Required skill missing",
                    recommendation="Learn it",
                ),
                SkillGap(
                    skill="Docker",
                    importance="preferred",
                    reason="Preferred skill missing",
                    recommendation="Learn it",
                ),
            ],
            resume_improvements=[],
            application_recommendation=ApplicationRecommendation(
                recommendation="consider",
                reason="Some gaps",
            ),
            interview_focus=[],
        )
        
        # This should not raise any exception
        service._validate_insights(valid_insights, resume, job, match_result)
        
        # Create invalid AI insights (skill not in job requirements)
        invalid_insights = AIInsights(
            status="completed",
            summary="Test summary",
            why_you_match=[],
            skill_gaps=[
                SkillGap(
                    skill="React",  # Not in job requirements
                    importance="required",
                    reason="Made up skill",
                    recommendation="Learn it",
                ),
            ],
            resume_improvements=[],
            application_recommendation=ApplicationRecommendation(
                recommendation="apply",
                reason="Good match",
            ),
            interview_focus=[],
        )
        
        # This should log warnings but not raise
        with patch.object(service.__class__, '_validate_insights', wraps=service._validate_insights) as wrapped_validate:
            wrapped_validate(invalid_insights, resume, job, match_result)
            # The method should complete without raising
    
    def test_application_recommendation_alignment(self):
        """Test validation of application recommendation alignment with score."""
        mock_llm_service = Mock()
        service = AIInsightsService(mock_llm_service)
        
        # Test cases
        test_cases = [
            # (overall_score, recommendation, should_warn)
            (90, "apply", False),      # High score, apply - OK
            (90, "low_match", True),   # High score, low_match - warning
            (30, "apply", True),       # Low score, apply - warning
            (30, "low_match", False),  # Low score, low_match - OK
            (60, "consider", False),   # Medium score, consider - OK
        ]
        
        for overall_score, recommendation, should_warn in test_cases:
            resume = Resume(hard_skills=[], soft_skills=[])
            job = JobPosting(
                job_title="Developer",
                company_name="Test Corp",
                required_skills=[],
                preferred_skills=[],
                key_responsibilities=[],
            )
            
            match_result = MatchResult(
                overall_score=overall_score,
                score_breakdown=ScoreBreakdown(
                    required_skills=RequiredSkillsScore(score=overall_score, matched_skills=[], missing_skills=[]),
                    preferred_skills=PreferredSkillsScore(score=overall_score, matched_skills=[], missing_skills=[]),
                    experience=ExperienceScore(score=overall_score, matched=True, unknown=True, job_requirement=None),
                    education=EducationScore(score=overall_score, matched=True, unknown=True, job_requirement=None),
                    responsibilities=ResponsibilitiesScore(score=overall_score, keyword_count=0, keyword_matches=[]),
                ),
                matched_required_skills=[],
                missing_required_skills=[],
                matched_preferred_skills=[],
                missing_preferred_skills=[],
                strengths=[],
                gaps=[],
                status="complete",
            )
            
            insights = AIInsights(
                status="completed",
                summary="Test",
                why_you_match=[],
                skill_gaps=[],
                resume_improvements=[],
                application_recommendation=ApplicationRecommendation(
                    recommendation=recommendation,
                    reason="Test reason",
                ),
                interview_focus=[],
            )
            
            # Validation should complete without raising
            service._validate_insights(insights, resume, job, match_result)





if __name__ == "__main__":
    pytest.main([__file__, "-v"])