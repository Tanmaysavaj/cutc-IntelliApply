import json
from pathlib import Path

from src.config import (
    ANALYSIS_DIR,
    JOBS_DIR,
    OPENROUTER_MODEL,
    REPORTS_DIR,
)
from src.models.job import CompanyResearch
from src.models.market_analysis import MarketAnalysis
from src.services.llm_service import LLMService
from src.services.pdf_service import PDFService
from src.services.tavily_service import TavilyService


class MarketAnalyzer:

    def __init__(self):
        self.pdf_service = PDFService()
        self.llm_service = LLMService()
        self.tavily_service = TavilyService()

    def analyze(self, input_folder: str):

        pdf_files = Path(input_folder).glob("*.pdf")

        for pdf in pdf_files:

            output_file = JOBS_DIR / f"{pdf.stem}.json"

            if output_file.exists():
                print(f"Skipping {pdf.name}")
                continue

            print(f"Processing {pdf.name}")

            text = self.pdf_service.extract_text(str(pdf))

            job = self.llm_service.extract_job(text)
            

            research = self.tavily_service.research_company(
                job.company_name
            )

            job.company_research = CompanyResearch(
                summary=research
            )

            with open(output_file, "w", encoding="utf-8") as file:
                json.dump(
                    job.model_dump(),
                    file,
                    indent=4,
                    ensure_ascii=False,
                )
            

        self.generate_market_analysis()

    def generate_market_analysis(self):

        all_jobs = []


        for file in JOBS_DIR.glob("*.json"):
            
            with open(file, "r", encoding="utf-8") as f:
                
                 all_jobs.append(json.load(f))

        prompt = """
You are analyzing multiple software engineering job postings.

Analyze all of the provided job postings and identify:

- Most common required skills
- Most common preferred skills
- Typical experience requirements
- Typical education requirements
- Salary observations
- Common responsibilities
- Overall industry trends

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
                    "content": json.dumps(all_jobs),
                },
            ],
            response_format=MarketAnalysis,
        )

        print(response.choices[0].message)
        analysis = response.choices[0].message.parsed
        if analysis is None:
            raise RuntimeError("Failed to generate market analysis.")

        analysis_json = ANALYSIS_DIR / "market-analysis.json"

        with open(analysis_json, "w", encoding="utf-8") as file:
            json.dump(
                analysis.model_dump(),
                file,
                indent=4,
                ensure_ascii=False,
            )

        markdown_prompt = """
        Generate a Markdown report from the structured market analysis.

        Use the following sections:

        # Job Market Analysis

        ## Required Skills

        ## Preferred Skills

        ## Experience

        ## Education

        ## Salary

        ## Responsibilities

        ## Industry Trends
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
                        analysis.model_dump(),
                        indent=4
                    ),
                },
            ],
        )

        report = response.choices[0].message.content

        analysis_md = REPORTS_DIR / "market-analysis.md"

        with open(analysis_md, "w", encoding="utf-8") as file:
            file.write(report)

        print("Market analysis completed.")