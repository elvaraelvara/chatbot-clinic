const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db'); // Pastikan db.js sudah dikonfigurasi
const axios = require('axios'); // 

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

app.get('/dokter', (req, res) => {
  const query = 'SELECT id, nama, kapasitas, jampraktek FROM masterNakes WHERE status_aktif = 1';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(results);
    }
  });
});

app.post('/antrean', (req, res) => {
  const { nama, nik, keluhan, kodedokter, nohp } = req.body;

  const getLatestAntreanQuery = 'SELECT nomorantrean FROM masterAntrean ORDER BY id DESC LIMIT 1';

  db.query(getLatestAntreanQuery, (err, result) => {
    if (err) {
      return res.status(500).send({ error: 'Gagal mengambil nomor antrean' });
    }

    let nomorAntrean = 1;
    if (result.length > 0) {
      nomorAntrean = parseInt(result[0].nomorantrean) + 1;
    }

    const nomorAntreanFormatted = String(nomorAntrean).padStart(3, '0');
    const angkaAntrean = nomorAntreanFormatted;

    const insertQuery = `
      INSERT INTO masterAntrean 
      (nomorantrean, angkaantrean, kodepoli, nik, nama, keluhan, kodedokter, nohp, tanggaldibuat, tanggalperiksa, 
      kodelokasi, sumberantrean, kodefaskes, namafaskes, inhouse, sisapanggilan)
      VALUES (?, ?, '001', ?, ?, ?, ?, ?, NOW(), NOW(), 'L001', 'chatbot', '0217B098', 'Pratama Mitra Medicare', 'No', 10)
    `;

    db.query(insertQuery, [nomorAntreanFormatted, angkaAntrean, nik, nama, keluhan, kodedokter, nohp], (err, result) => {
      if (err) {
        return res.status(500).send({ error: 'Gagal menambahkan antrean', details: err });
      }
      res.status(201).json({ 
        message: 'Antrean berhasil ditambahkan',
        nomorantrean: nomorAntreanFormatted 
      });
    });
  });
});

app.get('/admin/antrean', (req, res) => {
  const query = `
    SELECT id, nomorantrean, angkaantrean, nama, nik, keluhan, kodedokter, nohp, tanggaldibuat 
    FROM masterAntrean 
    ORDER BY nomorantrean ASC
  `;
  db.query(query, (err, result) => {
    if (err) {
      return res.status(500).send({ error: 'Gagal mengambil data antrean' });
    }
    res.json(result);
  });
});

app.post('/admin/antrean/update', (req, res) => {
  const { id, status } = req.body;

  const getNomorQuery = 'SELECT nomorantrean FROM masterAntrean WHERE id = ?';
  db.query(getNomorQuery, [id], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).send({ error: 'Data tidak ditemukan' });
    }

    const nomorToRemove = parseInt(result[0].nomorantrean);

    const deleteQuery = 'DELETE FROM masterAntrean WHERE id = ?';
    db.query(deleteQuery, [id], (err) => {
      if (err) {
        return res.status(500).send({ error: 'Gagal menghapus antrean' });
      }

      const updateQuery = `
        UPDATE masterAntrean 
        SET nomorantrean = nomorantrean - 1,
            angkaantrean = LPAD(nomorantrean - 1, 3, '0')
        WHERE nomorantrean > ?
      `;

      db.query(updateQuery, [nomorToRemove], (err) => {
        if (err) {
          return res.status(500).send({ error: 'Gagal memperbarui antrean' });
        }

        res.status(200).json({ 
          message: `Antrean dengan status "${status}" berhasil dihapus dan urutan diperbarui.` 
        });
      });
    });
  });
});

app.post('/tanyaklinik', async (req, res) => {
  const { pertanyaan } = req.body;
  try {
    const response = await axios.post("http://localhost:8000/tanyaklinik", { pertanyaan });
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).send({ error: "Gagal menghubungi chatbot", detail: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
