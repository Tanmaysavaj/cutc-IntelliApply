"""Deterministic matching service for resume-job application scoring.

This service provides a weighted, deterministic scoring algorithm that:
- Matches skills with normalization (case, aliases, variations)
- Compares experience levels deterministically
- Evaluates education requirements
- Analyzes keyword alignment in responsibilities
- Produces explainable, reproducible scores

DO NOT use LLM for primary scoring - use only for explanations/recommendations later.
"""

import re
from typing import List, Optional, Set, Tuple
from src.models.resume import Resume
from src.models.job import JobPosting
from app.schemas.matching import (
    MatchResult,
    ScoreBreakdown,
    RequiredSkillsScore,
    PreferredSkillsScore,
    ExperienceScore,
    EducationScore,
    ResponsibilitiesScore,
)


# Skill normalization map for common aliases and variations
# Format: normalized_name -> list of aliases that should map to it
SKILL_ALIASES = {
    "python": ["python", "py"],
    "javascript": ["javascript", "js"],
    "typescript": ["typescript", "ts"],
    "node": ["node", "node.js", "nodejs"],
    "react": ["react", "react.js"],
    "vue": ["vue", "vue.js"],
    "angular": ["angular", "angularjs"],
    "java": ["java"],
    "csharp": ["csharp", "c#", "c-sharp"],
    "cpp": ["cpp", "c++", "c-plus-plus"],
    "ruby": ["ruby"],
    "golang": ["golang", "go"],
    "rust": ["rust", "rs"],
    "php": ["php"],
    "swift": ["swift"],
    "kotlin": ["kotlin"],
    "sql": ["sql"],
    "postgres": ["postgres", "postgresql"],
    "mysql": ["mysql"],
    "mongodb": ["mongodb", "mongo"],
    "redis": ["redis"],
    "elasticsearch": ["elasticsearch", "elastic"],
    "aws": ["aws", "amazon web services"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud platform"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes", "k8s"],
    "terraform": ["terraform"],
    "ansible": ["ansible"],
    "jenkins": ["jenkins"],
    "git": ["git"],
    "linux": ["linux", "ubuntu", "centos"],
    "html": ["html"],
    "css": ["css"],
    "sass": ["sass", "scss"],
    "webpack": ["webpack"],
    "npm": ["npm"],
    "yarn": ["yarn"],
    "gitlab": ["gitlab"],
    "github": ["github"],
    "ci/cd": ["ci/cd", "cicd", "ci", "cd"],
    "rest": ["rest", "restful"],
    "graphql": ["graphql"],
    "django": ["django"],
    "flask": ["flask"],
    "fastapi": ["fastapi"],
    "spring": ["spring", "spring boot"],
    "express": ["express", "express.js"],
    "expressjs": ["expressjs"],
    "nextjs": ["nextjs", "next.js"],
    "nuxt": ["nuxt", "nuxt.js"],
    "pytest": ["pytest"],
    "unittest": ["unittest", "python unittest"],
    "jest": ["jest"],
    "mocha": ["mocha"],
    "cypress": ["cypress"],
    "selenium": ["selenium"],
    "puppeteer": ["puppeteer"],
    "jira": ["jira"],
    "confluence": ["confluence"],
    "agile": ["agile", "scrum"],
    "devops": ["devops"],
    "frontend": ["frontend", "front-end", "front end"],
    "backend": ["backend", "back-end", "back end"],
    "fullstack": ["fullstack", "full-stack", "full stack"],
    "mobile": ["mobile"],
    "ios": ["ios", "objective-c", "swift"],
    "android": ["android", "java"],
    "machine learning": ["machine learning", "ml"],
    "deep learning": ["deep learning", "dl"],
    "tensorflow": ["tensorflow", "tf"],
    "pytorch": ["pytorch", "torch"],
    "scikit-learn": ["scikit-learn", "sklearn"],
    "data analysis": ["data analysis", "data analytics"],
    "data science": ["data science", "datascience"],
    "nlp": ["nlp", "natural language processing"],
    "computer vision": ["computer vision"],
    "blockchain": ["blockchain"],
    "ethereum": ["ethereum"],
    "solidity": ["solidity"],
    "security": ["security"],
    "penetration testing": ["penetration testing", "pen testing"],
    "networking": ["networking"],
    "cloud": ["cloud", "cloud computing"],
    "serverless": ["serverless", "aws lambda", "azure functions"],
    "api": ["api", "apis"],
    "microservices": ["microservices", "microservices architecture"],
    "architecture": ["architecture", "system architecture"],
    "testing": ["testing", "software testing"],
    "qa": ["qa", "quality assurance"],
    "automation": ["automation", "test automation"],
    "performance": ["performance", "performance testing"],
    "ui": ["ui", "ui design"],
    "ux": ["ux", "ux design"],
    "design": ["design"],
    "mongodb": ["mongodb", "mongo db"],
    "postgresql": ["postgresql", "postgres"],
    "sqlite": ["sqlite"],
    "oracle": ["oracle"],
    "mssql": ["mssql", "microsoft sql server", "sql server"],
    "cassandra": ["cassandra"],
    "rabbitmq": ["rabbitmq"],
    "kafka": ["kafka"],
    "grpc": ["grpc"],
    "websocket": ["websocket", "websockets"],
    "graphql": ["graphql"],
    "apollo": ["apollo"],
    "prisma": ["prisma"],
    "typeorm": ["typeorm"],
    "sequelize": ["sequelize"],
    "django": ["django"],
    "flask": ["flask"],
    "pyramid": ["pyramid"],
    "tornado": ["tornado"],
    "sanic": ["sanic"],
    "fastapi": ["fastapi"],
    "hapi": ["hapi"],
    "express": ["express"],
    "next.js": ["next.js", "nextjs"],
    "nuxt.js": ["nuxt.js", "nuxt"],
    "remix": ["remix"],
    "svelte": ["svelte"],
    "sveltekit": ["sveltekit"],
    "laravel": ["laravel"],
    "symfony": ["symfony"],
    "codeigniter": ["codeigniter"],
    "cakephp": ["cakephp"],
    "zend": ["zend"],
    "codeigniter": ["codeigniter"],
    "yii": ["yii"],
    "phalcon": ["phalcon"],
    "slim": ["slim"],
    "lumen": ["lumen"],
}


class SkillNormalizer:
    """Normalizes skill names for consistent matching."""

    @staticmethod
    def normalize(skill: str) -> str:
        """Normalize a skill name to its canonical form.
        
        Args:
            skill: Raw skill name
            
        Returns:
            Normalized skill name
        """
        if not skill:
            return ""
        
        # Convert to lowercase and strip whitespace
        normalized = skill.lower().strip()
        
        # Remove common prefixes/suffixes
        normalized = re.sub(r'\b(\d+)\.0\b', r'\1', normalized)  # Remove version numbers
        normalized = re.sub(r'[^\w\s]', '', normalized)  # Remove special chars
        
        # Check for exact match in aliases
        for canonical, aliases in SKILL_ALIASES.items():
            if normalized == canonical:
                return canonical
            if normalized in aliases:
                return canonical
        
        # Try to match against canonical names
        for canonical in SKILL_ALIASES.keys():
            if canonical in normalized or normalized in canonical:
                return canonical
        
        # Return the normalized version as-is if no match found
        return normalized

    @staticmethod
    def normalize_list(skills: List[str]) -> List[str]:
        """Normalize a list of skill names.
        
        Args:
            skills: List of raw skill names
            
        Returns:
            List of normalized skill names (unique, sorted)
        """
        if not skills:
            return []
        
        normalized = set()
        for skill in skills:
            norm_skill = SkillNormalizer.normalize(skill)
            if norm_skill:
                normalized.add(norm_skill)
        
        return sorted(list(normalized))


class MatchingService:
    """Deterministic matching service for resume-job scoring."""

    # Weight constants for scoring
    REQUIRED_SKILLS_WEIGHT = 0.45  # 45%
    PREFERRED_SKILLS_WEIGHT = 0.15  # 15%
    EXPERIENCE_WEIGHT = 0.15  # 15%
    EDUCATION_WEIGHT = 0.10  # 10%
    RESPONSIBILITIES_WEIGHT = 0.15  # 15%

    # Minimum scores for different levels
    EXPERIENCE_MIN_SCORE = 70  # Minimum score for experience match
    EDUCATION_MIN_SCORE = 70  # Minimum score for education match
    RESPONSIBILITIES_MIN_SCORE = 50  # Minimum score for responsibilities

    @staticmethod
    def calculate_skill_match(
        job_skills: List[str],
        resume_skills: List[str],
        skill_type: str,
    ) -> Tuple[List[str], List[str], int]:
        """Calculate skill match between job and resume.
        
        Args:
            job_skills: List of skills from job posting
            resume_skills: List of skills from resume
            skill_type: "required" or "preferred"
            
        Returns:
            Tuple of (matched_skills, missing_skills, score)
        """
        if not job_skills:
            # No skills required - full score
            return [], [], 100
        
        if not resume_skills:
            # No skills in resume - no match
            return [], SkillNormalizer.normalize_list(job_skills), 0
        
        # Normalize both lists
        normalized_job_skills = SkillNormalizer.normalize_list(job_skills)
        normalized_resume_skills = SkillNormalizer.normalize_list(resume_skills)
        
        # Find matches and missing
        matched = []
        missing = []
        
        for job_skill in normalized_job_skills:
            if job_skill in normalized_resume_skills:
                matched.append(job_skill)
            else:
                missing.append(job_skill)
        
        # Calculate score based on proportion matched
        total = len(normalized_job_skills)
        matched_count = len(matched)
        score = int((matched_count / total) * 100) if total > 0 else 0
        
        return matched, missing, score

    @staticmethod
    def extract_experience_years(experience_text: Optional[str]) -> Optional[int]:
        """Extract minimum years of experience from text.
        
        Args:
            experience_text: Experience description (e.g., "3+ years", "5-7 years")
            
        Returns:
            Minimum years extracted, or None if not determinable
        """
        if not experience_text:
            return None
        
        text = experience_text.lower()
        
        # Try to extract "X+ years" or "X years+"
        match = re.search(r'(\d+)\s*\+\s*years?', text)
        if match:
            return int(match.group(1))
        
        # Try to extract "X years"
        match = re.search(r'(\d+)\s+years?', text)
        if match:
            return int(match.group(1))
        
        # Try to extract "X-Y years" and return minimum
        match = re.search(r'(\d+)\s*-\s*(\d+)\s+years?', text)
        if match:
            return int(match.group(1))
        
        # Try to extract "X to Y years" and return minimum
        match = re.search(r'(\d+)\s+to\s+(\d+)\s+years?', text)
        if match:
            return int(match.group(1))
        
        # Try to extract "senior", "mid-level", etc.
        seniority_map = {
            "entry": 0,
            "junior": 0,
            "mid": 3,
            "mid-level": 3,
            "senior": 5,
            "lead": 7,
            "principal": 10,
            "staff": 8,
        }
        
        for term, years in seniority_map.items():
            if term in text:
                return years
        
        return None

    @staticmethod
    def match_experience(
        job_requirement: Optional[str],
        resume_experience: List[dict],
    ) -> Tuple[bool, bool, int]:
        """Match experience requirements between job and resume.
        
        Args:
            job_requirement: Experience requirement from job
            resume_experience: List of work experiences from resume
            
        Returns:
            Tuple of (matched: bool, unknown: bool, score: int)
        """
        if not job_requirement:
            # No experience requirement specified
            return True, True, 100  # Unknown but not a penalty
        
        job_years = MatchingService.extract_experience_years(job_requirement)
        
        if job_years is None:
            # Could not determine experience requirement
            return False, True, 0
        
        # Calculate total experience from resume
        total_years = 0
        for exp in resume_experience:
            duration = exp.get("duration", "")
            if duration:
                years = MatchingService.extract_experience_years(duration)
                if years is not None:
                    total_years += years
        
        # If resume has equal or more years, it's a match
        if total_years >= job_years:
            return True, False, 100
        
        # If resume has fewer years, partial or no match
        if total_years > 0:
            # Partial match based on proportion
            score = int((total_years / job_years) * 100)
            score = max(score, 50)  # Minimum partial score
            return False, False, score
        
        return False, False, 0

    @staticmethod
    def extract_education_level(education_text: Optional[str]) -> List[str]:
        """Extract education level keywords from text.
        
        Args:
            education_text: Education requirement text
            
        Returns:
            List of education level keywords found
        """
        if not education_text:
            return []
        
        text = education_text.lower()
        keywords = []
        
        level_keywords = {
            "bachelor": ["bachelor", "bachelors", "b.a.", "ba", "bs", "b.s."],
            "master": ["master", "masters", "m.a.", "ma", "ms", "m.s.", "mba"],
            "doctorate": ["doctorate", "doctoral", "ph.d.", "phd", "md", "jd"],
            "associate": ["associate", "associates", "a.a.", "aa", "a.s."],
            "certificate": ["certificate", "certification", "certified"],
            "high school": ["high school", "hs", "diploma"],
        }
        
        for level, terms in level_keywords.items():
            for term in terms:
                if term in text:
                    keywords.append(level)
                    break
        
        return keywords

    @staticmethod
    def match_education(
        job_requirement: Optional[str],
        resume_education: List[dict],
    ) -> Tuple[bool, bool, int]:
        """Match education requirements between job and resume.
        
        Args:
            job_requirement: Education requirement from job
            resume_education: List of education from resume
            
        Returns:
            Tuple of (matched: bool, unknown: bool, score: int)
        """
        if not job_requirement:
            # No education requirement specified
            return True, True, 100  # Unknown but not a penalty
        
        job_keywords = MatchingService.extract_education_level(job_requirement)
        
        if not job_keywords:
            # Could not determine education requirement
            return False, True, 0
        
        # Education level hierarchy (higher number = higher education)
        education_levels = {
            "high school": 0,
            "associate": 1,
            "bachelor": 2,
            "master": 3,
            "doctorate": 4,
            "certificate": 1,
        }
        
        # Get the minimum required education level
        min_required_level = max(
            [education_levels.get(k, 0) for k in job_keywords],
            default=0
        )
        
        # Check resume education against job requirements
        for edu in resume_education:
            degree = edu.get("degree", "")
            if not degree:
                continue
            
            degree_keywords = MatchingService.extract_education_level(degree)
            
            if not degree_keywords:
                continue
            
            # Get the resume education level
            resume_level = max(
                [education_levels.get(k, 0) for k in degree_keywords],
                default=0
            )
            
            # Check if resume education meets or exceeds requirement
            if resume_level >= min_required_level:
                return True, False, 100
        
        # If resume has education but doesn't meet requirements
        if resume_education:
            return False, False, 0
        
        # Could not verify education requirement (no education in resume)
        return False, True, 0

    @staticmethod
    def match_responsibilities(
        job_responsibilities: List[str],
        resume: Resume,
    ) -> Tuple[int, List[str]]:
        """Match job responsibilities against resume content.
        
        Args:
            job_responsibilities: List of responsibilities from job
            resume: Resume object with all content
            
        Returns:
            Tuple of (score, matched_keywords)
        """
        if not job_responsibilities:
            return 100, []
        
        # Collect all resume content for keyword matching
        resume_content = []
        
        # Skills
        resume_content.extend(resume.hard_skills)
        resume_content.extend(resume.soft_skills)
        
        # Work experience responsibilities
        for exp in resume.work_experience:
            resume_content.extend(exp.responsibilities)
        
        # Projects
        resume_content.extend(resume.projects)
        
        # Keywords
        resume_content.extend(resume.keywords)
        
        # Normalize resume content
        normalized_resume = SkillNormalizer.normalize_list(resume_content)
        
        # Match responsibilities
        matched_keywords = []
        responsibility_keywords = []
        
        for resp in job_responsibilities:
            # Extract meaningful keywords from responsibility
            words = resp.lower().split()
            meaningful = [w for w in words if len(w) > 3 and w not in [
                "the", "and", "with", "for", "of", "in", "to", "a", "an",
                "your", "your", "help", "support", "work", "be", "a", "is",
                "are", "have", "has", "had", "do", "does", "did", "will",
                "would", "could", "should", "may", "might", "must", "shall",
                "can", "need", "dare", "ought", "used", "integrate", "develop",
                "design", "build", "create", "implement", "maintain", "support",
                "manage", "lead", "coordinate", "collaborate", "communicate",
                "document", "analyze", "review", "test", "deploy", "release",
                "improve", "enhance", "optimize", "debug", "troubleshoot",
            ]]
            responsibility_keywords.extend(meaningful)
        
        # Find matches
        for keyword in responsibility_keywords:
            if keyword in normalized_resume:
                matched_keywords.append(keyword)
        
        # Calculate score
        if not responsibility_keywords:
            return 100, []
        
        match_ratio = len(matched_keywords) / len(responsibility_keywords)
        score = int(match_ratio * 100)
        
        return score, matched_keywords

    @classmethod
    def calculate_overall_score(
        cls,
        required_score: int,
        preferred_score: int,
        experience_score: int,
        education_score: int,
        responsibilities_score: int,
        has_required_skills: bool,
        has_preferred_skills: bool,
        has_experience: bool,
        has_education: bool,
        has_responsibilities: bool,
    ) -> int:
        """Calculate weighted overall score.
        
        Args:
            required_score: Score for required skills (0-100)
            preferred_score: Score for preferred skills (0-100)
            experience_score: Score for experience (0-100)
            education_score: Score for education (0-100)
            responsibilities_score: Score for responsibilities (0-100)
            has_required_skills: Whether required skills exist
            has_preferred_skills: Whether preferred skills exist
            has_experience: Whether experience is determinable
            has_education: Whether education is determinable
            has_responsibilities: Whether responsibilities exist
            
        Returns:
            Overall score (0-100)
        """
        # Calculate weighted component scores
        weighted_required = required_score * cls.REQUIRED_SKILLS_WEIGHT
        weighted_preferred = preferred_score * cls.PREFERRED_SKILLS_WEIGHT
        weighted_experience = experience_score * cls.EXPERIENCE_WEIGHT
        weighted_education = education_score * cls.EDUCATION_WEIGHT
        weighted_responsibilities = responsibilities_score * cls.RESPONSIBILITIES_WEIGHT
        
        # Sum weighted scores
        total = (
            weighted_required +
            weighted_preferred +
            weighted_experience +
            weighted_education +
            weighted_responsibilities
        )
        
        return int(round(total))

    @classmethod
    def generate_match_result(
        cls,
        resume: Resume,
        job: JobPosting,
    ) -> MatchResult:
        """Generate complete match result for resume and job.
        
        Args:
            resume: Resume object with extracted data
            job: JobPosting object with extracted data
            
        Returns:
            MatchResult with all scoring components
        """
        # Calculate required skills match
        matched_required, missing_required, required_score = (
            cls.calculate_skill_match(
                job.required_skills,
                resume.hard_skills,
                "required",
            )
        )
        
        # Calculate preferred skills match
        matched_preferred, missing_preferred, preferred_score = (
            cls.calculate_skill_match(
                job.preferred_skills,
                resume.hard_skills + resume.soft_skills,
                "preferred",
            )
        )
        
        # Calculate experience match
        experience_matched, experience_unknown, experience_score = (
            cls.match_experience(
                job.experience_level,
                [exp.model_dump() for exp in resume.work_experience],
            )
        )
        
        # Calculate education match
        education_matched, education_unknown, education_score = (
            cls.match_education(
                job.education_requirements,
                [edu.model_dump() for edu in resume.education],
            )
        )
        
        # Calculate responsibilities match
        responsibilities_score, responsibility_matches = (
            cls.match_responsibilities(
                job.key_responsibilities,
                resume,
            )
        )
        
        # Determine status
        status = "complete"
        if (
            experience_unknown or
            education_unknown or
            not job.required_skills and not job.preferred_skills
        ):
            status = "incomplete"
        
        # Calculate overall score
        overall_score = cls.calculate_overall_score(
            required_score,
            preferred_score,
            experience_score,
            education_score,
            responsibilities_score,
            bool(job.required_skills),
            bool(job.preferred_skills),
            not experience_unknown,
            not education_unknown,
            bool(job.key_responsibilities),
        )
        
        # Generate strengths and gaps
        strengths = []
        gaps = []
        
        # Strengths
        if matched_required:
            strengths.append(f"Matched {len(matched_required)} required skills: {', '.join(matched_required[:3])}")
        
        if matched_preferred:
            strengths.append(f"Matched {len(matched_preferred)} preferred skills")
        
        if experience_matched and not experience_unknown:
            strengths.append("Experience level matches the job requirement")
        
        if education_matched and not education_unknown:
            strengths.append("Education requirements are satisfied")
        
        if responsibilities_score >= 70:
            strengths.append("Strong alignment with job responsibilities")
        
        # Gaps
        if missing_required:
            gaps.append(f"Missing {len(missing_required)} required skills: {', '.join(missing_required[:3])}")
        
        if missing_preferred:
            gaps.append(f"Missing {len(missing_preferred)} preferred skills")
        
        if experience_unknown:
            gaps.append("Experience level cannot be determined")
        elif not experience_matched:
            gaps.append("Experience level does not match the job requirement")
        
        if education_unknown:
            gaps.append("Education requirement cannot be verified")
        elif not education_matched:
            gaps.append("Education requirement does not match the job requirement")
        
        if responsibilities_score < 50:
            gaps.append("Limited alignment with job responsibilities")
        
        # Ensure minimum scores for edge cases
        if not job.required_skills and not job.preferred_skills:
            status = "incomplete"
        
        if not resume.hard_skills and not resume.soft_skills:
            status = "incomplete"
        
        return MatchResult(
            overall_score=overall_score,
            score_breakdown=ScoreBreakdown(
                required_skills=RequiredSkillsScore(
                    score=required_score,
                    matched_skills=matched_required,
                    missing_skills=missing_required,
                ),
                preferred_skills=PreferredSkillsScore(
                    score=preferred_score,
                    matched_skills=matched_preferred,
                    missing_skills=missing_preferred,
                ),
                experience=ExperienceScore(
                    score=experience_score,
                    matched=experience_matched,
                    unknown=experience_unknown,
                    job_requirement=job.experience_level,
                    candidate_experience=", ".join(
                        exp.duration for exp in resume.work_experience if exp.duration
                    ) or None,
                ),
                education=EducationScore(
                    score=education_score,
                    matched=education_matched,
                    unknown=education_unknown,
                    job_requirement=job.education_requirements,
                    candidate_education=", ".join(
                        edu.degree for edu in resume.education if edu.degree
                    ) or None,
                ),
                responsibilities=ResponsibilitiesScore(
                    score=responsibilities_score,
                    keyword_count=len(responsibility_matches),
                    keyword_matches=responsibility_matches,
                ),
            ),
            matched_required_skills=matched_required,
            missing_required_skills=missing_required,
            matched_preferred_skills=matched_preferred,
            missing_preferred_skills=missing_preferred,
            strengths=strengths,
            gaps=gaps,
            status=status,
        )
