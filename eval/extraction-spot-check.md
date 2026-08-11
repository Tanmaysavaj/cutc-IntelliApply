# Extraction Spot Check

## Objective

Verify that structured extraction from job posting PDFs is accurate and consistent.

---

## Test Set

A total of **8 software engineering internship/co-op job postings** were processed.

The following fields were manually spot-checked:

- Job title
- Company name
- Location
- Required skills
- Preferred skills
- Experience requirements
- Education requirements
- Responsibilities

---

## Results

### Posting 1

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

### Posting 2

- Job title: Correct
- Company name: Correct
- Required skills: Mostly correct
- Responsibilities: Correct

### Posting 3

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

### Posting 4

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

### Posting 5

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

### Posting 6

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

### Posting 7

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

### Posting 8

- Job title: Correct
- Company name: Correct
- Required skills: Correct
- Responsibilities: Correct

A manual review showed that extraction was generally accurate.

Minor differences occurred where the LLM summarized long responsibility lists or grouped similar skills together.

---

## Overall Assessment

The structured extraction was consistent across all tested job postings.

No malformed JSON outputs were generated after debugging was completed.

The extracted information was suitable for generating the market analysis.