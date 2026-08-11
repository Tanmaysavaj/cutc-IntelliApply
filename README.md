# AI Job Search Assistant

An AI-powered job search assistant built with Python. The project analyzes job postings, compares a resume against market requirements, and provides application advice for a new job posting.

## Requirements

- Python 3.12+
- OpenRouter API key
- Tavily API key

## Setup

Create and activate a virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using `.env.example`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
TAVILY_API_KEY=your_tavily_api_key
OPENROUTER_MODEL=google/gemini-2.5-flash
```

Do not commit `.env` or API keys to GitHub.

## Input Files

### Phase 1

Place job posting PDFs in:

```text
input/jobs/
```

At least 8 job postings should be provided.

### Phase 2

Place the resume PDF in:

```text
input/resume/resume.pdf
```

### Phase 3

Place the new job posting PDF in:

```text
input/job/job.pdf
```

## Running the Project

### Phase 1 — Job Market Analysis

```bash
python -m src.main market
```

Generates:

```text
data/jobs/*.json
data/analysis/market-analysis.json
reports/market-analysis.md
```

Previously processed job postings are skipped when the command is run again.

### Phase 2 — Resume Gap Analysis

```bash
python -m src.main resume
```

Generates:

```text
data/resume/resume.json
data/analysis/gap-analysis.json
reports/gap-analysis.md
```

### Phase 3 — Application Advisor

```bash
python -m src.main advisor
```

Generates:

```text
data/analysis/application-report.json
reports/application-report.html
```

The application report includes:

- Legitimacy assessment
- Fit assessment
- Resume adaptation
- Cover letter guidance
- Interview preparation

## Evaluation

Evaluation results are documented in:

```text
eval/
├── extraction-spot-check.md
├── scoring-check.md
├── legitimacy-check.md
└── failure-analysis.md
```

The project uses manual evaluation of extraction accuracy, scoring, legitimacy assessment, and system failures.

## Project Structure

```text
assignment-02/
├── README.md
├── .env.example
├── src/
├── data/
│   ├── jobs/
│   ├── resume/
│   └── analysis/
├── reports/
├── eval/
└── docs/
    └── reflection.md
```

## Tools and Technologies

- Python
- Pydantic
- OpenRouter
- Gemini 2.5 Flash
- Tavily Search
- WHOIS
- PyMuPDF
- Jinja2
- Typer

## Extras

- Company research using Tavily
- WHOIS-based legitimacy checking
- Re-runnable job processing
- HTML application report
- Structured LLM outputs using Pydantic