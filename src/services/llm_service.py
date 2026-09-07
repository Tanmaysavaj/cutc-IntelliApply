from datetime import date
import json

from openai import OpenAI
import logging

from src.config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from src.models.application_report import ApplicationReport
from src.models.job import JobPosting
from src.models.resume import Resume

logger = logging.getLogger(__name__)


def _strip_code_fence(text):
    """Removes a ```json ... ``` wrapper, which models add even when told not to."""
    cleaned = (text or "").strip()
    if not cleaned.startswith("```"):
        return cleaned
    lines = cleaned.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _first_json_object(text):
    """Extracts the outermost JSON object, ignoring any prose around it."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]


class LLMService:

    def __init__(self):
        self.client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )

    def _extract_structured(self, model_cls, system_prompt, text, label):
        """Extracts `model_cls` from `text`, tolerating models without schema support.

        `client.beta.chat.completions.parse()` relies on OpenAI-style structured
        outputs, which OpenRouter only supports for compatible models. On a model
        that does not support them — most of the free ones — the call returns
        successfully but `message.parsed` is None. The previous code then read
        `.job_title` straight off that None, so the whole request died with
        "'NoneType' object has no attribute 'job_title'", which says nothing about
        the real cause.

        So: try structured output first, and if the model cannot do it, fall back to
        asking for plain JSON and validating it here. That keeps the good path exact
        while letting cheaper models work.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ]

        raw_content = None
        try:
            response = self.client.beta.chat.completions.parse(
                model=OPENROUTER_MODEL,
                messages=messages,
                response_format=model_cls,
            )
            message = response.choices[0].message
            if getattr(message, "parsed", None) is not None:
                return message.parsed
            # Schema was accepted but not honoured; the text may still be usable.
            raw_content = message.content
            logger.warning(
                "Model %s returned no structured output for %s; falling back to JSON parsing",
                OPENROUTER_MODEL,
                label,
            )
        except Exception as exc:
            # Some models reject `response_format` outright rather than ignoring it.
            logger.warning(
                "Structured output unavailable for %s on model %s (%s); falling back to JSON parsing",
                label,
                OPENROUTER_MODEL,
                exc,
            )

        if raw_content is None:
            raw_content = self._request_json(model_cls, system_prompt, text)

        return self._validate_json(model_cls, raw_content, label)

    def _request_json(self, model_cls, system_prompt, text):
        """Asks for raw JSON, embedding the schema in the prompt."""
        try:
            schema = json.dumps(model_cls.model_json_schema())
        except Exception:  # pragma: no cover - schema generation is not expected to fail
            schema = ""

        instruction = (
            f"{system_prompt}\n\n"
            "Respond with a single JSON object only. No markdown, no code fences and no "
            "commentary. It must validate against this JSON Schema:\n"
            f"{schema}"
        )

        response = self.client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": instruction},
                {"role": "user", "content": text},
            ],
        )
        return response.choices[0].message.content

    def _validate_json(self, model_cls, raw_content, label):
        cleaned = _strip_code_fence(raw_content)
        if not cleaned:
            raise RuntimeError(
                f"The model ({OPENROUTER_MODEL}) returned an empty response for {label}. "
                "It may not support structured output — try a model that does, such as "
                "google/gemini-2.5-flash."
            )

        for candidate in (cleaned, _first_json_object(cleaned)):
            if not candidate:
                continue
            try:
                return model_cls.model_validate_json(candidate)
            except Exception:
                continue

        raise RuntimeError(
            f"The model ({OPENROUTER_MODEL}) did not return valid JSON for {label}. "
            "This usually means the model does not support structured output — try a "
            "model that does, such as google/gemini-2.5-flash."
        )

    def extract_job(self, text: str) -> JobPosting:
        """Extract job information from text using LLM.
        
        Args:
            text: Raw text from job posting
            
        Returns:
            JobPosting with extracted structured data
            
        Raises:
            RuntimeError: If extraction fails
            ValueError: If extracted data appears to be page shell content
        """
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
        - IMPORTANT: If the text appears to be from a job search page shell (e.g., containing "LinkedIn", "Indeed", "Glassdoor" as company without actual job details), set job_title and company_name to "EXTRACTION_FAILED" to signal that only page navigation/metadata was extracted.

        Today's date is {date.today().isoformat()}.

        For posting_age_days:
        - If the posting contains an exact date, calculate the age in days.
        - If the posting says something like "Posted 3 days ago", return 3.
        - If the posting date cannot be determined, return null.

        Return only the structured output.
        """

        try:
            logger.debug(f"Calling LLM for job extraction with {len(text)} characters of input")
            job_data = self._extract_structured(JobPosting, system_prompt, text, "the job posting")
            logger.info(f"LLM extracted job: title='{job_data.job_title}', company='{job_data.company_name}'")

            return job_data

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            raise RuntimeError(f"Failed to extract job information: {e}")

    def extract_resume(self, text: str) -> Resume:
        """Extract resume information from text using LLM.
        
        Args:
            text: Raw text from resume
            
        Returns:
            Resume with extracted structured data
            
        Raises:
            RuntimeError: If extraction fails
        """
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
            logger.debug(f"Calling LLM for resume extraction with {len(text)} characters of input")
            resume = self._extract_structured(Resume, system_prompt, text, "the resume")
            logger.info("LLM extracted resume successfully")
            return resume

        except Exception as e:
            logger.error(f"LLM resume extraction failed: {e}")
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
            payload = json.dumps(
                {
                    "job": job,
                    "resume": resume,
                    "market_analysis": market_analysis,
                    "gap_analysis": gap_analysis,
                    "company_research": company_research,
                    "whois": whois_information,
                },
                indent=4,
            )
            return self._extract_structured(
                ApplicationReport, system_prompt, payload, "the application report"
            )

        except Exception as e:
            raise RuntimeError(
                f"Failed to generate application report: {e}"
            )