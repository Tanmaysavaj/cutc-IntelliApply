import logging

import typer

from src.phase1.market import MarketAnalyzer
from src.phase2.resume import ResumeAnalyzer
from src.phase3.advisor import ApplicationAdvisor
from src.utils.logger import setup_logger


app = typer.Typer()


@app.callback()
def main(verbose: bool = typer.Option(False, "--verbose", "-v")):
    setup_logger(verbose)


@app.command()
def market(
    input_folder: str = "input/jobs",
):
    logging.debug("Starting Phase 1 market analysis")
    analyzer = MarketAnalyzer()
    analyzer.analyze(input_folder)


@app.command()
def resume(
    resume_file: str = "input/resume/resume.pdf",
):
    logging.debug("Starting Phase 2 resume analysis")
    analyzer = ResumeAnalyzer()
    analyzer.analyze(resume_file)


@app.command()
def advisor(
    job_file: str = "input/job/job3.pdf",
):
    logging.debug("Starting Phase 3 application advisor")
    advisor = ApplicationAdvisor()
    advisor.analyze(job_file)


if __name__ == "__main__":
    app()