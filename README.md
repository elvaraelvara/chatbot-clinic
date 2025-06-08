# 🧠 Healthcare Chatbot using IndoBERT – Klinik Mitra Medicare

## 📘 Project Overview
This is a web-based chatbot system developed using **IndoBERT**, a pre-trained Large Language Model (LLM) for Indonesian. The chatbot serves patients of **Klinik Pratama Mitra Medicare** by answering questions about healthcare services such as doctor schedules, queue registration, clinic operations, and insurance — fully integrated with a **MySQL-based real-time database** and an **admin dashboard**.
---
## 🎥 Project Demonstration

[![Watch the demo](https://img.youtube.com/vi/w9kE01X9VeM/hqdefault.jpg)](https://youtu.be/w9kE01X9VeM)

---

## 🔍 Key Features

### 💬 Chatbot (Powered by IndoBERT)
- Fine-tuned for Indonesian healthcare queries
- Semantic similarity-based response matching
- Handles misspellings and slang (alay)
- Retrieval-augmented design with:
  - Sentence embedding search (FAISS / cosine similarity)
  - IndoBERT-based reranking classifier

### 🏥 Clinic Service Automation
- Real-time queue registration and tracking
- Doctor schedule inquiry system
- Admin queue management (serve, skip, cancel)

### 👨‍⚕️ Admin Dashboard
- View all active queues
- Update patient statuses
- View patient and doctor details

### 📊 Evaluation Metrics
- IndoBERT (fine-tuned):  
  - **Accuracy**: 95.24%  
  - **F1-Score**: 0.8277
- User satisfaction score: **91.25%**

---

## 🧠 Machine Learning Details

- **Model**: IndoBERT (`indobenchmark/indobert-base-p1`)
- **Architecture**: 12-layer Transformer encoder
- **Training**: Binary classification (relevant/irrelevant QA pairs)
- **Data**: 409 manually-labeled question-answer pairs
- **Technique**: Hard negative sampling, pairwise fine-tuning
- **Evaluation**: BERTScore (Precision, Recall, F1) + Accuracy

---

## 💻 Tech Stack

| Layer       | Tools / Frameworks                     |
|-------------|----------------------------------------|
| Frontend    | ReactJS                                |
| Backend     | Flask (chatbot model) + Express.js (API) |
| Database    | MySQL (doctor schedules, queues)       |
| Embedding   | SentenceTransformer + FAISS            |
| Evaluation  | `bert_score`, `sklearn`                |
| Model API   | HuggingFace Transformers, Torch        |

---

## 📂 Project Structure

```
├── frontend/                # React-based chatbot UI
├── backend/
│   ├── flask/              # API for IndoBERT inference
│   └── express/            # Queue system and DB APIs
├── model-data/             # IndoBERT fine-tuned weights
├── data/                   # QA dataset (paired)
├── utils/                  # Preprocessing and spell-check
├── README.md               # Project documentation
```

---

## ▶️ Getting Started

```bash
# Clone the repository
git clone https://github.com/username/indobert-clinic-chatbot.git
cd indobert-clinic-chatbot

# Run backend model (Flask)
cd backend/flask
pip install -r requirements.txt
python app.py

# Run queue API (Express)
cd ../express
npm install
node index.js

# Run frontend
cd ../../frontend
npm install
npm start
```

---

## 📊 Dataset
- Collected from real patient questions at Klinik Mitra Medicare
- Covers: doctor schedule, registration, services, insurance, etc.
- Download: [Kaggle Dataset](https://www.kaggle.com/datasets/teresiaelvara/tugaskahir)

---

