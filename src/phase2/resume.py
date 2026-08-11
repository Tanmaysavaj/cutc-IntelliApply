import json
from pathlib import Path

from src.config import (
    ANALYSIS_DIR,
    REPORTS_DIR,
    RESUME_DIR,
    OPENROUTER_MODEL,
)

from src.models.resume import Resume
from src.models.gap_analysis import GapAnalysis
from src.services.llm_service import LLMService
from src.services.pdf_service import PDFService


class ResumeAnalyzer:

    def __init__(self):
        self.pdf_service = PDFService()
        self.llm_service = LLMService()

    def analyze(self, resume_path: str):

        text = self.pdf_service.extract_text(resume_path)

        resume = self.llm_service.extract_resume(text)

        resume_file = RESUME_DIR / "resume.json"

        with open(resume_file, "w", encoding="utf-8") as file:
            json.dump(
                resume.model_dump(),
                file,
                indent=4,
                ensure_ascii=False,
            )

        self.generate_gap_analysis(resume)

    def generate_gap_analysis(self, resume: Resume):

        market_file = ANALYSIS_DIR / "market-analysis.json"

        with open(market_file, "r", encoding="utf-8") as file:
            market_analysis = json.load(file)

        prompt = """
        You are comparing a resume against the job market analysis.

        Analyze the resume against the market analysis.

        Identify:

        - Strengths
        - Missing skills
        - Unique value

        For every missing skill:

        - Assign one level:
            - Quick Win
            - Short-term
            - Medium-term
            - Long-term

        - Provide one practical recommendation.

        Do not invent information.

        Return only the structured output.
        """

        response = self.llm_service.client.beta.chat.completions.parse(
            model=OPENROUTER_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "resume": resume.model_dump(),
                            "market_analysis": market_analysis,
                        }
                    ),
                },
            ],
            response_format=GapAnalysis,
        )

        gap_analysis = response.choices[0].message.parsed

        gap_file = ANALYSIS_DIR / "gap-analysis.json"

        with open(gap_file, "w", encoding="utf-8") as file:
            json.dump(
                gap_analysis.model_dump(),
                file,
                indent=4,
                ensure_ascii=False,
            )

        markdown_prompt = """
        Generate a Markdown report from the structured gap analysis.

        Include:

        # Resume Gap Analysis

        ## Strengths

        ## Skill Gaps

        For each gap include:
        - Skill
        - Level
        - Recommendation

        ## Unique Value
        """

        response = self.llm_service.client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": markdown_prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        gap_analysis.model_dump(),
                        indent=4,
                    ),
                },
            ],
        )

        report = response.choices[0].message.content

        report_file = REPORTS_DIR / "gap-analysis.md"

        with open(report_file, "w", encoding="utf-8") as file:
            file.write(report)

        print("Resume gap analysis completed.")