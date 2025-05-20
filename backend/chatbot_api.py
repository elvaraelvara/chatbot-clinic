import os
os.environ["USE_TF"] = "0"  # Hindari TensorFlow / Keras konflik

from flask import Flask, request, jsonify
import torch
import pandas as pd
import re
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.preprocessing import LabelEncoder
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)


MODEL_PATH = "./model"
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

df = pd.read_csv("data03.csv")
df['Pertanyaan'] = df['Pertanyaan'].str.lower().str.replace(r'[^\w\s]', '', regex=True).str.strip()
df['Jawaban'] = df['Jawaban'].str.strip()

label_encoder = LabelEncoder()
df['label'] = label_encoder.fit_transform(df['Kategori'])


sentence_model = SentenceTransformer("distiluse-base-multilingual-cased-v1", device=device)
df['embedding'] = df['Pertanyaan'].apply(lambda x: sentence_model.encode(x, convert_to_tensor=True).to(device))

def clean(text):
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

def predict_kategori(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding="max_length", max_length=128).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1)
    conf, pred = torch.max(probs, dim=1)
    if conf.item() >= 0.7:
        return label_encoder.inverse_transform([pred.item()])[0], conf.item()
    return None, conf.item()

def fallback_kategori(text):
    emb = sentence_model.encode(text, convert_to_tensor=True).to(device)
    sims = [util.pytorch_cos_sim(emb, e)[0][0].item() for e in df['embedding']]
    idx = int(torch.tensor(sims).argmax())
    return df.iloc[idx]['Kategori']

@app.route("/tanyaklinik", methods=["POST"])
def tanya_klinik():
    pertanyaan = request.json.get("pertanyaan", "")
    cleaned = clean(pertanyaan)

    kategori_pred, conf = predict_kategori(cleaned)
    fallback = False

    if kategori_pred is None:
        kategori_pred = fallback_kategori(cleaned)
        fallback = True

    jawaban_row = df[df['Kategori'] == kategori_pred]
    jawaban = jawaban_row['Jawaban'].values[0] if not jawaban_row.empty else "Jawaban tidak ditemukan."

    return jsonify({
        "fallback": fallback,
        "confidence": round(conf, 4),
        "kategori": kategori_pred,
        "jawaban": jawaban
    })

if __name__ == "__main__":
    print("Chatbot server is running on http://localhost:8000")
    app.run(host="0.0.0.0", port=8000)
