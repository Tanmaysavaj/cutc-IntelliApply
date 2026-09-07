"""Tests for LLM structured-output handling and its JSON fallback.

Run with:  python -m pytest tests/test_llm_structured_fallback.py -q

Background: the service asked for OpenAI-style structured outputs via
`client.beta.chat.completions.parse()`. OpenRouter only supports those for
compatible models, and most free models are not. On such a model the call
*succeeds* but `message.parsed` is None — and the old code read `.job_title`
straight off it, producing "'NoneType' object has no attribute 'job_title'",
which tells a user nothing about what to change.

These tests use a fake OpenAI client so no network or API key is needed.
"""

import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.models.job import JobPosting  # noqa: E402
from src.services.llm_service import LLMService, _first_json_object, _strip_code_fence  # noqa: E402

VALID_JOB_JSON = """
{
  "job_title": "Backend Developer",
  "company_name": "Shopify",
  "required_skills": ["Python", "PostgreSQL"],
  "preferred_skills": [],
  "key_responsibilities": ["Build services"]
}
"""


def _message(parsed=None, content=None):
    return types.SimpleNamespace(parsed=parsed, content=content)


def _response(message):
    return types.SimpleNamespace(choices=[types.SimpleNamespace(message=message)])


class FakeCompletions:
    """Stands in for both the `.beta…parse` and `.chat…create` surfaces."""

    def __init__(self, parse_result=None, parse_error=None, create_content=None):
        self._parse_result = parse_result
        self._parse_error = parse_error
        self._create_content = create_content
        self.parse_calls = 0
        self.create_calls = 0

    def parse(self, **_kwargs):
        self.parse_calls += 1
        if self._parse_error is not None:
            raise self._parse_error
        return self._parse_result

    def create(self, **_kwargs):
        self.create_calls += 1
        return _response(_message(content=self._create_content))


def _service(fake):
    service = LLMService.__new__(LLMService)  # skip __init__, which needs an API key
    service.client = types.SimpleNamespace(
        beta=types.SimpleNamespace(chat=types.SimpleNamespace(completions=fake)),
        chat=types.SimpleNamespace(completions=fake),
    )
    return service


def test_uses_structured_output_when_the_model_supports_it():
    expected = JobPosting.model_validate_json(VALID_JOB_JSON)
    fake = FakeCompletions(parse_result=_response(_message(parsed=expected)))
    service = _service(fake)

    result = service.extract_job("a job posting")

    assert result.job_title == "Backend Developer"
    # The good path must stay exact: no fallback request when parsing worked.
    assert fake.create_calls == 0


def test_falls_back_when_parsed_is_none_but_content_is_usable():
    # The exact failure mode of a model without schema support.
    fake = FakeCompletions(parse_result=_response(_message(parsed=None, content=VALID_JOB_JSON)))
    service = _service(fake)

    result = service.extract_job("a job posting")

    assert result.job_title == "Backend Developer"
    assert result.company_name == "Shopify"
    # Content came back with the first call, so no second request is needed.
    assert fake.create_calls == 0


def test_falls_back_with_a_second_request_when_response_format_is_rejected():
    fake = FakeCompletions(
        parse_error=Exception("Unknown parameter: response_format"),
        create_content=VALID_JOB_JSON,
    )
    service = _service(fake)

    result = service.extract_job("a job posting")

    assert result.job_title == "Backend Developer"
    assert fake.create_calls == 1, "should retry in plain JSON mode"


def test_tolerates_markdown_fences_and_surrounding_prose():
    wrapped = f"Here you go:\n```json\n{VALID_JOB_JSON}\n```\nHope that helps!"
    fake = FakeCompletions(parse_result=_response(_message(parsed=None, content=wrapped)))
    service = _service(fake)

    assert service.extract_job("a job posting").job_title == "Backend Developer"


def test_unusable_output_names_the_model_and_suggests_a_fix():
    fake = FakeCompletions(parse_result=_response(_message(parsed=None, content="I cannot help.")))
    service = _service(fake)

    with pytest.raises(RuntimeError) as excinfo:
        service.extract_job("a job posting")

    message = str(excinfo.value)
    # The old failure was "'NoneType' object has no attribute 'job_title'".
    assert "NoneType" not in message
    assert "structured output" in message
    assert "gemini" in message.lower(), "should suggest a model that works"


def test_empty_output_is_reported_clearly():
    fake = FakeCompletions(parse_result=_response(_message(parsed=None, content="")), create_content="")
    service = _service(fake)

    with pytest.raises(RuntimeError) as excinfo:
        service.extract_job("a job posting")

    assert "empty response" in str(excinfo.value)


@pytest.mark.parametrize(
    "raw,expected_start",
    [
        ("```json\n{\"a\": 1}\n```", '{"a": 1}'),
        ("```\n{\"a\": 1}\n```", '{"a": 1}'),
        ('{"a": 1}', '{"a": 1}'),
        ("", ""),
    ],
)
def test_strip_code_fence(raw, expected_start):
    assert _strip_code_fence(raw) == expected_start


def test_first_json_object_ignores_prose():
    assert _first_json_object('blah {"a": 1} trailing') == '{"a": 1}'
    assert _first_json_object("no json here") is None
