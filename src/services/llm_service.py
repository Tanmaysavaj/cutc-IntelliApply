from datetime import date
import json

from openai import OpenAI
import logging

from src.config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from src.models.application_report import ApplicationReport
from src.models.job import JobPosting
from src.models.resume import Resume


class LLMService:

    def __init__(self):
        self.client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )

    def extract_job(self, text: str) -> JobPosting:
        system_prompt = f"""
        You are an information extraction assistant.

        Extract information from the job posting into the provided schema.
        Extract the company's official website if it is explicitly present in the job posting.
        If it is not present, return null.

        Rules:
        - Extract only information explicitly stated in the posting.
        - Do not guess or hallucinate missing values.
        - Use null for missing optional fields.
        - Use empty lists for missing list fields.
        - Separate required skills from preferred skills.
        - Keep skills concise (for example: Python, AWS, Docker).
        - Keep responsibilities concise.

        Today's date is {date.today().isoformat()}.

        For posting_age_days:
        - If the posting contains an exact date, calculate the age in days.
        - If the posting says something like "Posted 3 days ago", return 3.
        - If the posting date cannot be determined, return null.

        Return only the structured output.
        """

        try:
            logging.debug("Calling LLM for job extraction")
            response = self.client.beta.chat.completions.parse(
                model=OPENROUTER_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": text,
                    },
                ],
                response_format=JobPosting,
            )

            return response.choices[0].message.parsed

        except Exception as e:
            raise RuntimeError(f"Failed to extract job information: {e}")

    def extract_resume(self, text: str) -> Resume:
        system_prompt = """
        You are an information extraction assistant.

        Extract information from the resume into the provided schema.

        Rules:
        - Extract only information explicitly present in the resume.
        - Do not guess or hallucinate missing values.
        - Use null for missing optional fields.
        - Use empty lists for missing list fields.
        - Keep skills concise (for example: Python, AWS, Docker).
        - Include only information relevant to the schema.

        Return only the structured output.
        """

        try:
            logging.debug("Calling LLM for resume extraction")
            response = self.client.beta.chat.completions.parse(
                model=OPENROUTER_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": text,
                    },
                ],
                response_format=Resume,
            )

            return response.choices[0].message.parsed

        except Exception as e:
            raise RuntimeError(f"Failed to extract resume information: {e}")

    def generate_application_report(
        self,
        job,
        resume,
        market_analysis,
        gap_analysis,
        company_research,
        whois_information,
    ) -> ApplicationReport:
        system_prompt = """
        You are an AI career advisor.

        Using the provided information, generate an application assessment.

        Include:
        - Job legitimacy assessment
        - Reason for the legitimacy assessment
        - Resume fit score (0-100)
        - Candidate strengths
        - Candidate weaknesses
        - Resume improvement suggestions
        - Cover letter talking points
        - Interview questions

        Return only the structured output.
        """

        try:
            logging.debug("Calling LLM for application report")
            response = self.client.beta.chat.completions.parse(
                model=OPENROUTER_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "job": job,
                                "resume": resume,
                                "market_analysis": market_analysis,
                                "gap_analysis": gap_analysis,
                                "company_research": company_research,
                                "whois": whois_information,
                            },
                            indent=4,
                        ),
                    },
                ],
                response_format=ApplicationReport,
            )

            return response.choices[0].message.parsed

        except Exception as e:
            raise RuntimeError(
                f"Failed to generate application report: {e}"
            )