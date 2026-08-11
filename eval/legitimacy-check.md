# Legitimacy Check

## Objective

Evaluate whether the legitimacy assessment correctly identifies trustworthy job postings using external information sources.

---

## Tools Used

The legitimacy assessment combines multiple sources of information:

- Tavily web search
- WHOIS domain lookup
- Information extracted from the job posting

---

## Test Case

**Company**

Ontario Ministry of Public and Business Service Delivery and Procurement

**Result**

Legitimacy: **Legitimate**

---

## Evidence

### Web Search

The Tavily search successfully returned company information that matched the organization named in the job posting.

The search confirmed:

- The organization exists.
- The organization operates as a Government of Ontario ministry.
- The company information was consistent with the job description.

### WHOIS Lookup

A WHOIS lookup was performed on the company website (when available).

The lookup returned domain registration information that was used as an additional legitimacy signal.

No suspicious registration information was identified.

### Job Posting Review

The job posting itself contained several indicators of legitimacy:

- Official government organization
- Detailed responsibilities
- Office locations
- Salary information
- Internship/co-op program details
- Professional formatting

---

## Observations

The legitimacy assessment used multiple independent signals rather than relying only on the job posting text.

Government organizations are generally easier to verify than small private companies because more public information is available.

For companies without an official website listed, the WHOIS lookup may not contribute additional evidence.

---

## Conclusion

The legitimacy agent correctly classified the tested posting as legitimate.

Combining web search, WHOIS information, and job posting analysis produced a more reliable assessment than using any single source alone.