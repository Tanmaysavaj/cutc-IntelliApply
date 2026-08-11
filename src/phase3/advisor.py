import json
import logging

from src.config import (
    ANALYSIS_DIR,
    JOBS_DIR,
)
from pathlib import Path
from jinja2 import Environment
from jinja2 import FileSystemLoader
from src.config import REPORTS_DIR
from src.models.job import CompanyResearch
from src.services.llm_service import LLMService
from src.services.pdf_service import PDFService
from src.services.tavily_service import TavilyService
from src.services.whois_service import WhoisService


class ApplicationAdvisor:

    def __init__(self):
        self.pdf_service = PDFService()
        self.llm_service = LLMService()
        self.tavily_service = TavilyService()
        self.whois_service = WhoisService()

    def analyze(self, job_pdf: str):
        logging.debug("Researching company legitimacy with Tavily")

        text = self.pdf_service.extract_text(job_pdf)

        job = self.llm_service.extract_job(text)

        company_research = self.tavily_service.research_company(
            job.company_name
        )

        job.company_research = CompanyResearch(
            summary=company_research
        )

        logging.debug("Looking for company domain with WHOIS information")
        whois_information = {}

        if job.company_website:
            whois_information = self.whois_service.lookup(
                job.company_website
            )

        with open(
            ANALYSIS_DIR / "market-analysis.json",
            "r",
            encoding="utf-8",
        ) as file:
            market_analysis = json.load(file)

        with open(
            ANALYSIS_DIR / "gap-analysis.json",
            "r",
            encoding="utf-8",
        ) as file:
            gap_analysis = json.load(file)

        with open(
            JOBS_DIR.parent / "resume" / "resume.json",
            "r",
            encoding="utf-8",
        ) as file:
            resume = json.load(file)

        report = self.llm_service.generate_application_report(
            job=job.model_dump(),
            resume=resume,
            market_analysis=market_analysis,
            gap_analysis=gap_analysis,
            company_research=company_research,
            whois_information=whois_information,
        )

        with open(
            ANALYSIS_DIR / "application-report.json",
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                report.model_dump(),
                file,
                indent=4,
                ensure_ascii=False,
            )

        logging.debug("Generating application report and fit assessment")
        self.generate_html_report(report)
        logging.debug(
                 "Application report generated with fit score: %s",report.fit_score,)
        

    def generate_html_report(self, report):

        env = Environment(
            loader=FileSystemLoader("templates")
        )

        template = env.get_template(
            "application-report.html"
        )

        html = template.render(
            report=report
        )

        output = REPORTS_DIR / "application-report.html"

        with open(
            output,
            "w",
            encoding="utf-8",
        ) as file:
            file.write(html)

        print("Application report generated.")