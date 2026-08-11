import whois
import logging

class WhoisService:

    def lookup(self, domain: str) -> dict:
        try:
            logging.debug("Performing WHOIS lookup: %s", domain)
            result = whois.whois(domain)

            return {
                "domain_name": result.domain_name,
                "creation_date": str(result.creation_date),
                "expiration_date": str(result.expiration_date),
                "registrar": result.registrar,
            }
            logging.debug("WHOIS lookup completed")

        except Exception:
            logging.error("Error occurred while performing WHOIS lookup for domain: %s", domain)
            return {}