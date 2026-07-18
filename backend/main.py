import os
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import google.generativeai as genai

# Load the .env file so we can read our API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = genai.GenerativeModel("gemini-flash-latest")
@app.get("/")
def read_root():
    return {"message": "SOCMate AI backend is running"}


@app.post("/upload")
async def upload_log(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    # Limit how much text we send to the AI, to keep things fast and cheap
    log_sample = text[:3000]

    prompt = f"""
You are a cybersecurity SOC analyst assistant. Analyze the following security log data.

Respond ONLY in valid JSON, with this exact structure and nothing else:
{{
  "severity": "Low" | "Medium" | "High" | "Critical",
  "summary": "A short plain-English summary of what happened",
  "recommended_action": "A short, actionable recommendation for the analyst"
}}

Log data:
{log_sample}
"""

    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # Gemini sometimes wraps JSON in ```json ... ``` — strip that if present
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:].strip()

        analysis = json.loads(raw_text)

    except Exception as e:
        analysis = {
            "severity": "Unknown",
            "summary": "AI analysis failed to parse.",
            "recommended_action": f"Check backend logs. Error: {str(e)}"
        }

    return {
        "filename": file.filename,
        "size": len(content),
        "preview": text[:500],
        "analysis": analysis
    }