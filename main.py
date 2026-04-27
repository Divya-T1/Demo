from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import pypdf
import json
import io
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic()
documents: dict[str, str] = {}  # filename -> extracted text (in-memory)


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    data = await file.read()
    reader = pypdf.PdfReader(io.BytesIO(data))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    documents[file.filename] = text[:20000]
    return {"name": file.filename, "pages": len(reader.pages)}


@app.get("/docs")
async def list_docs():
    return [{"name": k} for k in documents]


class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []


@app.post("/chat")
async def chat(req: ChatRequest):
    if not documents:
        return {"answer": "Upload a document first."}

    context = "\n\n---\n\n".join(
        f"[{name}]\n{text}" for name, text in documents.items()
    )

    messages = req.history + [{"role": "user", "content": req.question}]

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=f"You are a research assistant. Answer questions using only the documents below.\n\n{context[:15000]}",
        messages=messages,
    )
    return {"answer": response.content[0].text}


class SandboxRequest(BaseModel):
    question: str


@app.post("/sandbox")
async def sandbox(req: SandboxRequest):
    context = "\n\n".join(
        f"[{name}]\n{text[:2000]}" for name, text in documents.items()
    )

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        system="""You are a prompt engineering coach. Score the question and respond with JSON only:
{"score": <1-10>, "feedback": "<2-3 sentences on what could be better>", "improved": "<rewritten version of the question>"}

Score based on: clarity (is it unambiguous?), specificity (is it precise?), relevance (does it relate to the documents?).""",
        messages=[
            {
                "role": "user",
                "content": f"Documents available:\n{context[:4000]}\n\nScore this question: {req.question}",
            }
        ],
    )

    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        return {"score": 5, "feedback": response.content[0].text, "improved": req.question}
