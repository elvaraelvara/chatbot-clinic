import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ChatbotUser.css';
import logo from './logo.png';
import { Send } from 'lucide-react';

function ChatbotUser() {
  const [dokters, setDokters] = useState([]);
  const [messages, setMessages] = useState([{ sender: 'bot' }]);
  const [inputMessage, setInputMessage] = useState('');
  const [antrean, setAntrean] = useState({ nama: '', nik: '', keluhan: '', kodedokter: '', nohp: '' });
  const [isAntreanFormVisible, setAntreanFormVisible] = useState(false);
  const [isChatKlinikActive, setChatKlinikActive] = useState(false);
  const [showDoctorList, setShowDoctorList] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:5000/dokter').then(res => setDokters(res.data));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAntrean({ ...antrean, [name]: value });
  };

  const handleSendMessage = async (e, command = null) => {
    if (e) e.preventDefault();
    const messageToSend = command ?? inputMessage.trim();
    if (!messageToSend) return;

    let newMessages = [...messages, { sender: 'user', message: messageToSend }];
    setShowDoctorList(false);
    if (messageToSend !== '/antrean') setAntreanFormVisible(false);

    if (messageToSend === '/dokter') {
      setShowDoctorList(true);
      newMessages.push({ sender: 'bot', message: 'Berikut adalah daftar dokter kami:' });
      setShowSuggestions(false);
    } else if (messageToSend === '/antrean') {
      setAntreanFormVisible(true);
      newMessages.push({ sender: 'bot', message: 'Silakan isi formulir antrean berikut.' });
      setShowSuggestions(false);
    } else if (messageToSend === '/tanyaklinik') {
      setChatKlinikActive(true);
      setShowSuggestions(true);
      newMessages.push({ sender: 'bot', message: 'Selamat datang di Klinik Mitra Pratama Medicare! Ada yang bisa kami bantu hari ini?' });
    } else if (messageToSend === '/antreansekarang') {
      try {
        const res = await axios.get('http://localhost:5000/antreansekarang');
        newMessages.push({ sender: 'bot', message: `Sekarang antrean berada di urutan ${res.data.jumlah_antrean}` });
      } catch {
        newMessages.push({ sender: 'bot', message: '❌ Gagal mengambil data antrean saat ini.' });
      }
      setShowSuggestions(false);
    } else if (isChatKlinikActive) {
      try {
        const res = await axios.post('http://localhost:5000/tanyaklinik', { pertanyaan: messageToSend });
        newMessages.push({ sender: 'bot', message: res.data.jawaban });
      } catch {
        newMessages.push({ sender: 'bot', message: '❌ Gagal menghubungi chatbot.' });
      }
      setShowSuggestions(false);
    } else {
      newMessages.push({ sender: 'bot', message: 'Perintah tidak dikenali. Gunakan /dokter, /antrean, /tanyaklinik, atau /antreansekarang.' });
      setShowSuggestions(false);
    }

    setMessages(newMessages);
    setInputMessage('');
  };

  const handleSubmitAntrean = async (e) => {
    e.preventDefault();
    const { nama, nik, keluhan, kodedokter, nohp } = antrean;

    if (!nama || !nik || !keluhan || !kodedokter || !nohp) {
      setMessages([...messages, { sender: 'bot', message: '❌ Harap lengkapi semua data pada formulir antrean.' }]);
      return;
    }
    if (!/^\d{16}$/.test(nik)) {
      setMessages([...messages, { sender: 'bot', message: '❌ NIK harus terdiri dari 16 digit angka.' }]);
      return;
    }
    if (!/^0\d{9,13}$/.test(nohp)) {
      setMessages([...messages, { sender: 'bot', message: '❌ Nomor HP harus berupa angka, diawali 0, dan panjang 10–14 digit.' }]);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/antrean', antrean);
      setMessages([...messages, { sender: 'bot', message: `✅ Antrean berhasil ditambahkan. Nomor antrean: ${res.data.nomorantrean}` }]);
      setAntreanFormVisible(false);
      setAntrean({ nama: '', nik: '', keluhan: '', kodedokter: '', nohp: '' });
    } catch {
      setMessages([...messages, { sender: 'bot', message: '❌ Gagal menambahkan antrean. Silakan coba lagi.' }]);
    }
  };

  const handleCommandClick = (command) => {
    handleSendMessage(null, command);
  };

  const handleSuggestionClick = async (text) => {
    setInputMessage(text);
    setShowSuggestions(false);
    await handleSendMessage(null, text);
  };

  return (
    <div className="chatbot-page">
      <header className="sticky-header">
        <img src={logo} alt="Klinik Mitra Medicare" className="chat-logo large" />
      </header>
      <main className="chatbot-container centered">
        <div className="chat-window">
          <div className="chat-messages">
            {messages.map((msg, index) => {
              if (index === 0 && msg.sender === 'bot') {
                return (
                  <div key={index} className="chat-bubble welcome-message">
                    <h3>👋 Selamat datang di <b>Klinik Pratama Mitra Medicare</b></h3>
                    <p>Gunakan perintah berikut untuk memulai:</p>
                    <ul>
                      <li><code>/dokter</code> — Melihat daftar dokter aktif</li>
                      <li><code>/antrean</code> — Daftar antrean online</li>
                      <li><code>/tanyaklinik</code> — Bertanya tentang layanan klinik</li>
                      <li><code>/antreansekarang</code> — Cek antrean saat ini</li>
                    </ul>
                  </div>
                );
              }
              return (
                <div key={index} className={`chat-bubble ${msg.sender}`}>{msg.message}</div>
              );
            })}

            {showDoctorList && (
              <div className="doctor-list">
                {dokters.map((doc, index) => (
                  <div key={index} className="doctor-card">
                    <strong>{doc.nama}</strong>
                    <p>Jam Praktek: {doc.jampraktek}</p>
                  </div>
                ))}
              </div>
            )}

            {isAntreanFormVisible && (
              <form className="antrean-form" onSubmit={handleSubmitAntrean}>
                <input type="text" name="nama" placeholder="Nama Lengkap" value={antrean.nama} onChange={handleInputChange} required />
                <input type="text" name="nik" placeholder="NIK" value={antrean.nik} onChange={handleInputChange} required />
                <textarea name="keluhan" placeholder="Keluhan" value={antrean.keluhan} onChange={handleInputChange} required />
                <input type="text" name="nohp" placeholder="No HP" value={antrean.nohp} onChange={handleInputChange} required />
                <select name="kodedokter" value={antrean.kodedokter} onChange={handleInputChange} required>
                  <option value="">Pilih Dokter</option>
                  {dokters.map(doc => <option key={doc.id} value={doc.id}>{doc.nama}</option>)}
                </select>
                <button type="submit">Submit Antrean</button>
              </form>
            )}

            {showSuggestions && (
              <div className="suggested-questions">
                <p className="suggestion-title">Pertanyaan Umum</p>
                <ul>
                  <li onClick={() => handleSuggestionClick("Jam operasional klinik ini mulai pukul berapa dan tutup jam berapa?")}>Jam operasional klinik ini mulai pukul berapa dan tutup jam berapa?</li>
                  <li onClick={() => handleSuggestionClick("Apakah bisa daftar antrean secara online? Bagaimana caranya?")}>Apakah bisa daftar antrean secara online? Bagaimana caranya?</li>
                  <li onClick={() => handleSuggestionClick("Dokter siapa yang praktek hari ini dan jam berapa?")}>Dokter siapa yang praktek hari ini dan jam berapa?</li>
                  <li onClick={() => handleSuggestionClick("Apakah klinik ini bisa menerima BPJS?")}>Apakah klinik ini bisa menerima BPJS?</li>
                  <li onClick={() => handleSuggestionClick("Berapa biaya konsultasi dengan dokter umum atau spesialis?")}>Berapa biaya konsultasi dengan dokter umum atau spesialis?</li>
                  <li onClick={() => handleSuggestionClick("Apakah tersedia layanan tes laboratorium seperti cek darah atau rapid test?")}>Apakah tersedia layanan tes laboratorium seperti cek darah atau rapid test?</li>
                  <li onClick={() => handleSuggestionClick("Apakah tersedia layanan konsultasi online atau telemedisin?")}>Apakah tersedia layanan konsultasi online atau telemedisin?</li>
                </ul>
              </div>
            )}
          </div>

          <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
            <div className="input-bubble">
              <div className="top-row">
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
                <button type="submit" className="bubble-send-button" title="Kirim">
                  <Send size={20} color="white" strokeWidth={2.5} />
                </button>
              </div>
              <div className="command-row">
                <button type="button" onClick={() => handleCommandClick('/tanyaklinik')}>/tanyaklinik</button>
                <button type="button" onClick={() => handleCommandClick('/dokter')}>/dokter</button>
                <button type="button" onClick={() => handleCommandClick('/antrean')}>/antrean</button>
                <button type="button" onClick={() => handleCommandClick('/antreansekarang')}>/antreansekarang</button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ChatbotUser;
