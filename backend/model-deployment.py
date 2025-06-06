import os
import re
import torch
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
from transformers import TextClassificationPipeline, AutoTokenizer, AutoModelForSequenceClassification
from spellchecker import SpellChecker

app = Flask(__name__)

# === Load Dataset dan Preprocessing Jawaban ===
df = pd.read_csv("data04.csv")
df['Pertanyaan'] = df['Pertanyaan'].astype(str).str.lower().str.replace(r"[^\w\s]", "", regex=True).str.strip()
df['Jawaban'] = df['Jawaban'].astype(str).str.strip()
jawaban_korpus = df['Jawaban'].tolist()

# === Load Kamus Alay ===
alay_df = pd.read_csv("https://raw.githubusercontent.com/nasalsabila/kamus-alay/master/colloquial-indonesian-lexicon.csv")
kamus_alay = dict(zip(alay_df['slang'], alay_df['formal']))

# === Setup SpellChecker ===
spell = SpellChecker(language=None)

# Load kata dari dataset
corpus_kata = df['Pertanyaan'].str.split().sum()
spell.word_frequency.load_words(corpus_kata)

# Tambahkan kosakata medis dan administrasi umum
spell.word_frequency.load_words([
    # Umum & Klinik
    'klinik', 'puskesmas', 'rumah', 'sakit', 'dokter', 'periksa', 'pemeriksaan',
    'poli', 'gigi', 'umum', 'anak', 'kandungan', 'penyakit', 'dalam', 'kulit',
    'vaksin', 'imunisasi', 'laboratorium', 'skrining', 'obat', 'resep', 'alamat'

    # Administrasi
    'daftar', 'pendaftaran', 'online', 'antrean', 'antrian', 'nomor',
    'nik', 'bpjs', 'ktp', 'rujukan', 'jadwal', 'kunjungan',

    # Layanan & Sistem
    'pelayanan', 'informasi', 'biaya', 'konsultasi', 'konfirmasi', 'verifikasi',
    'sistem', 'otomatis', 'manual', 'batal', 'reschedule', 'ulang', 'login',
    'akun', 'password', 'email', 'telepon', 'whatsapp', 'cs', 'layanan',

    # Waktu & Hari
    'hari', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu',
    'tanggal', 'jam', 'pagi', 'siang', 'sore', 'malam',

    # Kata Tanya
    'bagaimana', 'kapan', 'dimana', 'berapa', 'apakah', 'bisa', 'tidak', 'ya',

    # Kata Umum
    'saya', 'anda', 'pasien', 'keluarga', 'orang', 'ibu', 'bapak', 'anak', 
    'istri', 'suami', 'perlu', 'butuh', 'ingin', 'mau', 'datang', 'langsung',

    # Lokasi (opsional)
    'medan', 'jakarta', 'bandung', 'surabaya', 'yogyakarta', 'cabang', 'pusat'
])

# === Load Embedding Jawaban ===
embedding_file = "jawaban_embeddings.npy"
jawaban_embeddings = torch.tensor(np.load(embedding_file))
if torch.cuda.is_available():
    jawaban_embeddings = jawaban_embeddings.to("cuda")

# === Load SentenceTransformer untuk embedding pertanyaan ===
embed_model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                                  device="cuda" if torch.cuda.is_available() else "cpu")

# === Load IndoBERT untuk reranking ===
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

# === Fungsi Pembersih + Normalisasi Alay + Koreksi Typo ===
def clean_text(text):
    text = text.lower()
    text = re.sub(r"[^\w\s\?\.,]", "", text)
    text = re.sub(r"\s+", " ", text)
    words = text.strip().split()

    # Normalisasi kata alay
    words_alay = [kamus_alay.get(w, w) for w in words]

    # Koreksi typo + log perbaikan
    corrected = []
    for original_word in words_alay:
        if original_word not in spell:
            corrected_word = spell.correction(original_word)
            if corrected_word != original_word:
                print(f"[TYPO] '{original_word}' dikoreksi menjadi '{corrected_word}'")
            corrected.append(corrected_word)
        else:
            corrected.append(original_word)

    cleaned = " ".join(corrected)
    print(f"[CLEANED TEXT] {cleaned}")
    return cleaned

# === Retrieval + Reranking ===
def jawab_dengan_retrieval_dan_indobert(pertanyaan_user, top_k=20):
    pertanyaan_user = clean_text(pertanyaan_user)
    pertanyaan_embedding = embed_model.encode(pertanyaan_user, convert_to_tensor=True).to(jawaban_embeddings.device)

    skor = util.cos_sim(pertanyaan_embedding, jawaban_embeddings)[0]
    top_idx = torch.topk(skor, k=top_k).indices
    kandidat = [jawaban_korpus[i] for i in top_idx]

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

    if skor < 0.5:
        return jsonify({
            "jawaban": (
                "Mohon maaf, saya belum dapat memahami pertanyaan Anda. "
                "Silakan hubungi kami melalui WhatsApp di +62 813-3302-6820 "
                "atau email mitramedicarecorps@yahoo.com untuk bantuan lebih lanjut."
            ),
            "confidence": round(skor, 4),
            "fallback": True
        })

    return jsonify({
        "jawaban": jawaban,
        "confidence": round(skor, 4),
        "fallback": False
    })

# === Run Flask App ===
if __name__ == "__main__":
    print("Chatbot retrieval + reranking berjalan di http://localhost:8000")
    app.run(host="0.0.0.0", port=8000)
