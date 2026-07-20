import os
import json
import uuid
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
client = genai.Client(api_key="YOUR_API_KEY")
# Example usage:
response = client.models.generate_content(model="gemini-2.5-flash", contents="Hello")
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

# In-memory history store (resets when server restarts — fine for a hackathon demo)
history = []


def analyze_log_text(text: str):
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

    return analysis


@app.get("/")
def read_root():
    return {"message": "SOCMate AI backend is running"}


@app.post("/upload")
async def upload_logs(files: list[UploadFile] = File(...)):
    results = []

    for file in files:
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")

        analysis = analyze_log_text(text)

        entry = {
            "id": str(uuid.uuid4()),
            "filename": file.filename,
            "size": len(content),
            "preview": text[:500],
            "full_text": text[:3000],
            "analysis": analysis,
            "timestamp": datetime.utcnow().isoformat()
        }

        history.append(entry)
        results.append(entry)

    return {"results": results}


@app.get("/history")
def get_history():
    return {"history": history}


@app.post("/chat/{incident_id}")
async def chat_about_incident(incident_id: str, question: dict):
    incident = next((h for h in history if h["id"] == incident_id), None)

    if not incident:
        return {"answer": "Incident not found."}

    user_question = question.get("question", "")

    prompt = f"""
You are a cybersecurity SOC analyst assistant helping a colleague understand a specific security incident.

Incident details:
- Severity: {incident['analysis']['severity']}
- Summary: {incident['analysis']['summary']}
- Recommended Action: {incident['analysis']['recommended_action']}
- Raw log excerpt: {incident['full_text']}

The analyst asks: "{user_question}"

Give a clear, concise, helpful answer (2-4 sentences) as a knowledgeable SOC assistant.
"""

    try:
        response = model.generate_content(prompt)
        answer = response.text.strip()
    except Exception as e:
        answer = f"Sorry, I couldn't process that. Error: {str(e)}"

    return {"answer": answer}