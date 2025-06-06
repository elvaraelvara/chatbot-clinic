const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const axios = require('axios');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

/* === GET: Daftar Dokter Aktif === */
app.get('/dokter', (req, res) => {
  const query = `
    SELECT id, nama, kapasitas, jampraktek 
    FROM masterNakes 
    WHERE status_aktif = 1
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

/* === POST: Tambah Antrean === */
app.post('/antrean', (req, res) => {
  const { nama, nik, keluhan, kodedokter, nohp } = req.body;

  const countQuery = `
    SELECT COUNT(*) AS jumlah 
    FROM masterAntrean 
    WHERE dibatalkan = 0 AND dilayani = 0
  `;

  db.query(countQuery, (err, result) => {
    if (err) return res.status(500).send({ error: 'Gagal menghitung antrean' });

    const nomorAntrean = result[0].jumlah + 1;
    const nomorAntreanFormatted = String(nomorAntrean).padStart(3, '0');

    const insertQuery = `
      INSERT INTO masterAntrean 
      (nomorantrean, angkaantrean, kodepoli, nik, nama, keluhan, kodedokter, nohp, tanggaldibuat, tanggalperiksa, 
       kodelokasi, sumberantrean, kodefaskes, namafaskes, inhouse, sisapanggilan)
      VALUES (?, ?, '001', ?, ?, ?, ?, ?, NOW(), NOW(), 'L001', 'chatbot', '0217B098', 'Pratama Mitra Medicare', 'No', 10)
    `;

    db.query(insertQuery, [nomorAntreanFormatted, nomorAntreanFormatted, nik, nama, keluhan, kodedokter, nohp], (err) => {
      if (err) return res.status(500).send({ error: 'Gagal menambahkan antrean', details: err });
      res.status(201).json({
        message: 'Antrean berhasil ditambahkan',
        nomorantrean: nomorAntreanFormatted
      });
    });
  });
});

/* === GET: Ambil Semua Antrean (Admin) === */
app.get('/admin/antrean', (req, res) => {
  const query = `
    SELECT id, nomorantrean, angkaantrean, nama, nik, keluhan, kodedokter, nohp, tanggaldibuat,
           dibatalkan, dilayani, dipanggil, dilewati
    FROM masterAntrean
    ORDER BY nomorantrean ASC
  `;
  db.query(query, (err, result) => {
    if (err) return res.status(500).send({ error: 'Gagal mengambil data antrean' });
    res.json(result);
  });
});

/* === POST: Hapus Antrean dan Reorder === */
app.post('/admin/antrean/update', (req, res) => {
  const { id, status } = req.body;

  const deleteQuery = `DELETE FROM masterAntrean WHERE id = ?`;
  db.query(deleteQuery, [id], (err) => {
    if (err) return res.status(500).send({ error: 'Gagal menghapus antrean' });

    const reorderQuery = `
      SET @num := 0;
      UPDATE masterAntrean
      SET nomorantrean = (@num := @num + 1),
          angkaantrean = LPAD(@num, 3, '0')
      WHERE dibatalkan = 0 AND dilayani = 0
      ORDER BY tanggaldibuat ASC
    `;

    db.query(reorderQuery, (err2) => {
      if (err2) return res.status(500).send({ error: 'Gagal mengurutkan ulang antrean' });
      res.status(200).json({ message: `Antrean dihapus dan antrean aktif diurutkan ulang.` });
    });
  });
});

/* === PUT: Update Status Antrean dan Reorder === */
app.put('/admin/antrean/:id', (req, res) => {
  const id = req.params.id;
  const {
    dibatalkan,
    dipanggil,
    dilayani,
    dilewati,
    alasanbatal,
    tanggalbatal
  } = req.body;

  const updateStatusQuery = `
    UPDATE masterAntrean
    SET dibatalkan = ?, dipanggil = ?, dilayani = ?, dilewati = ?,
        alasanbatal = ?, tanggalbatal = ?
    WHERE id = ?
  `;

  db.query(
    updateStatusQuery,
    [dibatalkan, dipanggil, dilayani, dilewati, alasanbatal, tanggalbatal, id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Gagal update status antrean' });

      const reorderQuery = `
        SET @num := 0;
        UPDATE masterAntrean
        SET nomorantrean = (@num := @num + 1),
            angkaantrean = LPAD(@num, 3, '0')
        WHERE dibatalkan = 0 AND dilayani = 0
        ORDER BY tanggaldibuat ASC
      `;

      db.query(reorderQuery, (err2) => {
        if (err2) return res.status(500).json({ message: 'Gagal mengurutkan ulang antrean' });
        res.status(200).json({ message: 'Status diupdate dan antrean aktif diurutkan ulang' });
      });
    }
  );
});

/* === GET: Jumlah Antrean Saat Ini === */
app.get('/antreansekarang', (req, res) => {
  const query = `
    SELECT COUNT(*) AS jumlah
    FROM masterAntrean
    WHERE dibatalkan = 0 AND dilayani = 0  c
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Gagal menghitung antrean:", err);
      return res.status(500).json({ error: 'Gagal mendapatkan antrean' });
    }
    res.status(200).json({ jumlah_antrean: result[0].jumlah });
  });
});

/* === POST: Tanya Klinik ke Chatbot === */
app.post('/tanyaklinik', async (req, res) => {
  const { pertanyaan } = req.body;
  try {
    const response = await axios.post("http://localhost:8000/tanyaklinik", { pertanyaan });
    res.status(200).json(response.data);
  } catch (err) {
    res.status(500).send({ error: "Gagal menghubungi chatbot", detail: err.message });
  }
});

/* === RUN SERVER === */
app.listen(port, () => {
  console.log(`✅ Server berjalan di http://localhost:${port}`);
});
