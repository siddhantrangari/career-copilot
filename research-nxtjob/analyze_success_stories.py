import os
import re
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent / "nxtjob-success-stories"
TRANSCRIPTS_DIR = BASE_DIR / "transcripts"
PROFILES_FILE = BASE_DIR / "CANDIDATE_SUCCESS_PROFILES.md"
LEARNINGS_FILE = BASE_DIR / "NXTJOB_SUCCESS_STORIES_LEARNINGS.md"

def extract_candidate_name(title):
    patterns = [
        r"How\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:Cracked|Secured|Transitioned|Landed|Acheived|Achieved|Got|Bagged|lands)",
        r"(?:From|The Rise From|How our client).*?([A-Za-z]+(?:'s|\s+[A-Za-z]+)?)\s+(?:Story|Hike|Role|Job)",
        r"([A-Za-z]+)'s\s+Story",
        r"([A-Za-z]+)\s+got\s+a\s+job",
        r"([A-Za-z]+)\s+lands\s+her",
        r"([A-Za-z]+)\s+secured",
    ]
    for p in patterns:
        m = re.search(p, title, re.IGNORECASE)
        if m:
            name = m.group(1).replace("'s", "").strip()
            if name.lower() not in ["our", "client", "being", "career", "grievance", "technical", "job"]:
                return name
    return "Candidate"

def extract_company(title, transcript):
    companies = [
        "Morgan Stanley", "Genpact", "Microsoft", "Blinkit", "HSBC", "Shaadi.com",
        "Scaler", "Wipro", "CDK Global", "SAAS Company", "Top MNC", "Australia", "Europe"
    ]
    for c in companies:
        if c.lower() in title.lower():
            return c
    # Check in transcript
    for c in ["Google", "Amazon", "Flipkart", "Accenture", "Deloitte", "TCS", "Infosys", "Cognizant", "Swiggy", "Zomato", "Uber", "Paytm", "Razorpay"]:
        if c.lower() in transcript.lower():
            return c
    return "Top Tier MNC / Tech SaaS"

def extract_hike(title, transcript):
    m = re.search(r"(\d+%\s*Salary\s*Hike|\d+%\s*Hike|\d+%\s*Salary\s*boost|1Cr\s*Package|140%\s*salary\s*hike|400%\s*Salary\s*Hike|200%\s*Salary\s*Hike)", title, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m2 = re.search(r"(\d+%\s*hike|\d+\s*LPA|\d+\s*Cr)", transcript, re.IGNORECASE)
    if m2:
        return m2.group(1).strip()
    return "30% - 50% Hike"

def extract_role(title, transcript):
    m = re.search(r"(Vice President|Senior Manager|Scrum Master|Director Level|Director|CMO|Consulting Role|Remote Job|Leadership Role|Engineering Manager|Product Manager|Lead)", title, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return "Senior Tech / Leadership Role"

def extract_timeline(title, transcript):
    m = re.search(r"(\d+\s*Days|\d+\s*Months|a year)", title, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return "60 - 90 Days"

def analyze_all():
    transcript_files = list(TRANSCRIPTS_DIR.glob("*.md"))
    print(f"Found {len(transcript_files)} transcript files.")
    
    profiles = []
    
    for tf in transcript_files:
        with open(tf, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Parse title & url
        title_m = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        url_m = re.search(r"\*\*YouTube URL\*\*:\s+\[(.*?)\]", content)
        vid_id_m = re.search(r"\*\*Video ID\*\*:\s+`([^`]+)`", content)
        
        title = title_m.group(1) if title_m else tf.stem
        url = url_m.group(1) if url_m else ""
        vid_id = vid_id_m.group(1) if vid_id_m else ""
        
        name = extract_candidate_name(title)
        company = extract_company(title, content)
        hike = extract_hike(title, content)
        role = extract_role(title, content)
        timeline = extract_timeline(title, content)
        
        # Construct LinkedIn Search URL
        li_search = f"https://www.linkedin.com/search/results/people/?keywords={name}%20{company.replace(' ', '%20')}"
        
        profiles.append({
            "name": name,
            "title": title,
            "role": role,
            "company": company,
            "hike": hike,
            "timeline": timeline,
            "url": url,
            "vid_id": vid_id,
            "transcript_file": tf.name,
            "li_search": li_search,
            "transcript_length": len(content)
        })
    
    profiles.sort(key=lambda x: x["name"])
    return profiles

if __name__ == "__main__":
    profiles = analyze_all()
    print(f"Parsed {len(profiles)} candidate profiles.")
