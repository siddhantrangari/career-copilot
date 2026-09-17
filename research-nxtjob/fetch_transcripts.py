import os
import sys
import json
import subprocess
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent / "nxtjob-success-stories"
TRANSCRIPTS_DIR = BASE_DIR / "transcripts"
TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

# List of 58 videos from @nxtjobai
VIDEOS = [
    {"id": "_SauTQNyMBQ", "title": "How Tarun Cracked a Vice President Role In Just 75 Days", "duration": "16:26"},
    {"id": "IZ8LZwZuCuU", "title": "How Ashutosh Secured his Dream Senior Manager Role", "duration": "11:04"},
    {"id": "D_BdYtHLBkE", "title": "How Koustubh Transitioned to a Scrum Master In Just 85 Days", "duration": "10:44"},
    {"id": "YQ2DC1x4kEE", "title": "How Monalisa Secured her Dream Role at Morgan Stanley", "duration": "30:46"},
    {"id": "SFXENdH0G0A", "title": "How Snehasish Landed his Dream Job at Genpact with a 50% Hike", "duration": "8:44"},
    {"id": "ScERI7oDjk4", "title": "The Rise From Grievance to Glory– Dhanush's 90% Salary Hike!", "duration": "11:13"},
    {"id": "PCRhTSO_b1E", "title": "Vishnu's Story From Mid to Leadership Role", "duration": "12:41"},
    {"id": "5BGqe3t-nuk", "title": "How Anurag Got 30+ Interviews & a 50% Hike", "duration": "9:19"},
    {"id": "TdNJJnZ2tgo", "title": "How Manoj Secured a Director Role and 1Cr Package", "duration": "16:19"},
    {"id": "D2jL3WHhr0k", "title": "How Somya Acheived a 40% Salary Hike in just 85 days", "duration": "8:33"},
    {"id": "GR1P7yPpTuA", "title": "How Chandra Transitioned to a Director Level Role", "duration": "11:21"},
    {"id": "ycidkr-NQwA", "title": "How Srividya Landed her Dream Consulting Role in Just 85 Days", "duration": "12:43"},
    {"id": "cbAlOPojHD0", "title": "How Sunil Secured a 40% Salary Hike", "duration": "13:16"},
    {"id": "Qm9k9c_fyYw", "title": "How Sudhish Landed Job offers at Top MNC'S", "duration": "14:52"},
    {"id": "JvZgIGe2YLc", "title": "How Pooja Landed a High Paying Job at Scaler", "duration": "7:04"},
    {"id": "qeEs5AAIlv4", "title": "How Janak Secured a 35% Salary Hike", "duration": "10:35"},
    {"id": "rMyy6SxKlUY", "title": "How Shubham Secured a 20% Salary Hike in a SAAS Company", "duration": "13:23"},
    {"id": "FcxtK9awQ8w", "title": "How Sahil Secured a High Paying Job at CDK Global", "duration": "6:34"},
    {"id": "cAX8-umMSzI", "title": "How Rohia Secured a CMO Role in just 75 days", "duration": "9:37"},
    {"id": "TGJakOQxjKk", "title": "How Riya Got a 76% Salary Hike", "duration": "20:27"},
    {"id": "jgPyCLA6ElM", "title": "How Pratibha Landed her Dream Role in just 70 Days", "duration": "11:49"},
    {"id": "Dlhq_AgqjTc", "title": "How Naresh Secured a 20% Salary Hike at Wipro", "duration": "13:52"},
    {"id": "toQ2tHcrjW4", "title": "How Mayur Secured a Top Leadership Role at Shaadi.com", "duration": "13:10"},
    {"id": "b3q0k0AtJ9E", "title": "How Karan landed his Dream role in just 70 days!", "duration": "7:19"},
    {"id": "mMdks8yhII8", "title": "How Mahalakshmi got a 44% Salary Hike", "duration": "13:32"},
    {"id": "f1I0iEaZN-0", "title": "How Deepika lands her Dream Remote Job", "duration": "16:31"},
    {"id": "ZbCzeAwsRmM", "title": "How Bhanu secured a 25% Salary boost and got placed at Morgan Stanley!", "duration": "14:03"},
    {"id": "B_w6c3wsSQA", "title": "How Chirag Secured a 35% Salary hike", "duration": "22:28"},
    {"id": "JB_ffhYXxAo", "title": "How Shilpa Landed Her Dream Job in Under 90 Days", "duration": "12:17"},
    {"id": "mUm_GjQTI3k", "title": "How Garima Secured a 30% Salary Hike", "duration": "6:51"},
    {"id": "FjmlnE86lJQ", "title": "How Debasis Secured a 30% Salary Hike", "duration": "8:21"},
    {"id": "bq7DUXJNmWM", "title": "How Mithilesh Secured a 50% Salary Hike", "duration": "14:56"},
    {"id": "-3P_Yl-XQ8c", "title": "How Rahul Secured a 82% Salary Hike", "duration": "16:31"},
    {"id": "2Rk0qLPvwUc", "title": "How Sandip Got 35+ Interview Calls", "duration": "20:24"},
    {"id": "hAOvWcJ96YQ", "title": "From Struggling with Interviews to Landing Her Dream Job", "duration": "7:22"},
    {"id": "VUBxw5YH1Yc", "title": "How Uttam Secured a 92% Salary Hike", "duration": "13:52"},
    {"id": "uQDDtZqqp3w", "title": "How Gopi Secured His Dream Job At Microsoft", "duration": "10:51"},
    {"id": "DrU3YBZA3jM", "title": "How Sourav Bagged a Job In International Market", "duration": "8:44"},
    {"id": "mPfSkoJsO_U", "title": "How Rebecca Secured a Remarkable 400% Salary Hike!", "duration": "14:49"},
    {"id": "K2AoGO9HLkw", "title": "How Divyanshu Secured a Remarkable 90% Salary Hike", "duration": "11:34"},
    {"id": "aa_0wtdYl2o", "title": "How Suganya Secured a 58% Salary Hike in an MNC", "duration": "12:59"},
    {"id": "P4V8GU3LDyU", "title": "How Rahul Secured a 30% Salary Hike with our targeted Job Search Strategy", "duration": "10:31"},
    {"id": "F9AcCPlG-pE", "title": "From being Laid-Off to getting Hired at an MNC", "duration": "12:24"},
    {"id": "UOSB2MxSDKE", "title": "From Career Gap to Dream Job in Just 2 Months", "duration": "15:20"},
    {"id": "4YNpahVZhXA", "title": "How Punit secured a 36% Salary Hike in just 2 months", "duration": "6:32"},
    {"id": "DQnJXBDb700", "title": "From Technical Manager to Director in just 6 months", "duration": "21:17"},
    {"id": "erZ7OyCe2eg", "title": "How Sudarshan Secured his Dream Role at HSBC", "duration": "15:57"},
    {"id": "UtEQzhnTPKM", "title": "How Sagnik Secured his Dream Job at Blinkit", "duration": "17:36"},
    {"id": "i1BVPbjXDGc", "title": "How Priyank Achieved a 38% Salary Hike!", "duration": "11:18"},
    {"id": "k_BogrKOIcw", "title": "How Shreya Achieved a 60% Salary Hike!", "duration": "13:02"},
    {"id": "Nz_XYvDnU2M", "title": "From 0 To 10+ Interview Calls!", "duration": "7:03"},
    {"id": "jsLnthKpKyE", "title": "How Abhishek Achieved 57% Salary Hike!", "duration": "10:18"},
    {"id": "EC2LEskQurs", "title": "How Sameer Secured 6 Job Offers in Just 3 Months", "duration": "11:33"},
    {"id": "OX9R8Z2uH0Y", "title": "How Vaibhav Achieved a 200% Salary Hike", "duration": "17:51"},
    {"id": "Zy6GNE12dMA", "title": "From 75 rejections to 30% salary hike in a year", "duration": "10:18"},
    {"id": "PI7PTMAp8Ps", "title": "2 job offers from Europe in 90 days!", "duration": "11:36"},
    {"id": "LgzRVhudOXE", "title": "How Aravind got a job in Australia within 3 months", "duration": "5:34"},
    {"id": "EZd2TczRktg", "title": "How our client secured a job offer with 140% salary hike", "duration": "4:08"},
]

def sanitize_filename(name):
    return re.sub(r'[^a-zA-Z0-9_-]', '_', name).strip('_')

def clean_vtt_text(vtt_content):
    lines = vtt_content.split('\n')
    text_lines = []
    seen = set()
    prev_text = ""
    for line in lines:
        line = line.strip()
        if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:') or '-->' in line:
            continue
        # Remove XML/HTML tags like <c> </c> <00:00:00.000>
        clean = re.sub(r'<[^>]+>', '', line).strip()
        if clean and clean != prev_text:
            text_lines.append(clean)
            prev_text = clean
    return ' '.join(text_lines)

def download_transcript(video):
    vid_id = video["id"]
    title = video["title"]
    url = f"https://www.youtube.com/watch?v={vid_id}"
    safe_title = sanitize_filename(title[:40])
    target_file = TRANSCRIPTS_DIR / f"{safe_title}_{vid_id}.md"

    if target_file.exists() and target_file.stat().st_size > 100:
        print(f"[SKIP] Already exists: {target_file.name}")
        return

    tmp_prefix = f"/tmp/yt_sub_{vid_id}"
    cmd = [
        "/opt/homebrew/bin/yt-dlp",
        "--write-auto-sub",
        "--write-sub",
        "--sub-lang", "en,en-orig,en-US,en-GB",
        "--skip-download",
        "--sub-format", "vtt/ttml/srt/best",
        "-o", f"{tmp_prefix}.%(ext)s",
        url
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        
        # Check for generated subtitle files
        sub_files = list(Path("/tmp").glob(f"yt_sub_{vid_id}.*.vtt")) + \
                    list(Path("/tmp").glob(f"yt_sub_{vid_id}.*.srt")) + \
                    list(Path("/tmp").glob(f"yt_sub_{vid_id}.*.ttml"))
        
        transcript_text = ""
        if sub_files:
            vtt_file = sub_files[0]
            with open(vtt_file, 'r', encoding='utf-8', errors='ignore') as f:
                raw_content = f.read()
            transcript_text = clean_vtt_text(raw_content)
            for sf in sub_files:
                try: sf.unlink()
                except: pass

        if not transcript_text:
            # Fallback description fetch
            meta_cmd = ["/opt/homebrew/bin/yt-dlp", "--dump-json", url]
            res = subprocess.run(meta_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            if res.returncode == 0:
                meta = json.loads(res.stdout)
                desc = meta.get("description", "")
                transcript_text = f"*(Subtitles auto-generation unavailable. Video Summary & Description)*\n\n{desc}"

        content = f"""# {title}
- **YouTube URL**: [{url}]({url})
- **Video ID**: `{vid_id}`
- **Duration**: {video['duration']}

---

## Cleaned Video Transcript & Interview Content

{transcript_text if transcript_text else "Transcript could not be extracted directly."}
"""
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[DONE] Saved: {target_file.name} ({len(transcript_text)} chars)")
    except Exception as e:
        print(f"[ERROR] {vid_id}: {e}")

from concurrent.futures import ThreadPoolExecutor

def main():
    print(f"Starting concurrent transcript download for {len(VIDEOS)} NxtJob success story videos...")
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(download_transcript, vid) for vid in VIDEOS]
        for f in futures:
            try:
                f.result()
            except Exception as e:
                print(f"[ERROR]: {e}")
    print("All transcripts processed!")

if __name__ == "__main__":
    main()
