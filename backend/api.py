import os
import re
import torch
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
from transformers import TextClassificationPipeline, AutoTokenizer, AutoModelForSequenceClassification

app = Flask(__name__)

df = pd.read_csv("data04.csv")
df['Pertanyaan'] = df['Pertanyaan'].astype(str).str.lower().str.replace(r"[^\w\s]", "", regex=True).str.strip()
df['Jawaban'] = df['Jawaban'].astype(str).str.strip()
jawaban_korpus = df['Jawaban'].tolist()

embedding_file = "jawaban_embeddings.npy"
jawaban_embeddings = torch.tensor(np.load(embedding_file))
if torch.cuda.is_available():
    jawaban_embeddings = jawaban_embeddings.to("cuda")

# === Load SentenceTransformer (Untuk Embed Pertanyaan User) ===
embed_model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                                  device="cuda" if torch.cuda.is_available() else "cpu")

MODEL_PATH = "./model"
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

pipeline_indobert = TextClassificationPipeline(
    model=model,
    tokenizer=tokenizer,
    device=0 if torch.cuda.is_available() else -1,
    return_all_scores=True,
    function_to_apply="softmax",
    batch_size=16
)

def clean_text(text):
    text = text.lower()
    text = re.sub(r"[^\w\s\?\.,]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# === Fungsi: Retrieval + Reranking ===
def jawab_dengan_retrieval_dan_indobert(pertanyaan_user, top_k=20):
    pertanyaan_user = clean_text(pertanyaan_user)
    pertanyaan_embedding = embed_model.encode(pertanyaan_user, convert_to_tensor=True).to(jawaban_embeddings.device)

    # Retrieval
    skor = util.cos_sim(pertanyaan_embedding, jawaban_embeddings)[0]
    top_idx = torch.topk(skor, k=top_k).indices
    kandidat = [jawaban_korpus[i] for i in top_idx]

    # Reranking
    pasangan = [{"text": pertanyaan_user, "text_pair": j} for j in kandidat]
    hasil_prediksi = pipeline_indobert(pasangan)
    skor_relevansi = [p[1]["score"] for p in hasil_prediksi]
    idx_terbaik = int(np.argmax(skor_relevansi))

    return kandidat[idx_terbaik], skor_relevansi[idx_terbaik]

# === Endpoint Flask ===
@app.route("/tanyaklinik", methods=["POST"])
def tanya_klinik():
    pertanyaan = request.json.get("pertanyaan", "")
    if not pertanyaan.strip():
        return jsonify({"error": "Pertanyaan kosong"}), 400

    jawaban, skor = jawab_dengan_retrieval_dan_indobert(pertanyaan)
    return jsonify({
        "jawaban": jawaban,
        "confidence": round(skor, 4),
        "fallback": False
    })

if __name__ == "__main__":
    print("Chatbot retrieval + reranking berjalan di http://localhost:8000")
    app.run(host="0.0.0.0", port=8000)
