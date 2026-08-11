from tavily import TavilyClient
import logging

from src.config import TAVILY_API_KEY


class TavilyService:
    def __init__(self):
        self.client = TavilyClient(api_key=TAVILY_API_KEY)

    def research_company(self, company_name: str) -> str:
        logging.debug("Calling Tavily for company research: %s", company_name)
        try:
            response = self.client.search(
                query=f"{company_name} company overview, culture, recent news",
                search_depth="basic",
                max_results=3,
            )

            results = response.get("results", [])
            logging.debug("Tavily company research completed")

            if not results:
                return "No company research available."
            logging.debug("Tavily didn't return any results for company research: %s", company_name)

            summary = []

            for result in results:
                summary.append(result.get("content", ""))

            return "\n".join(summary)

        except Exception as e:
            return f"Company research unavailable: {e}"