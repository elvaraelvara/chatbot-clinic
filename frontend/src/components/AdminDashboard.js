import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';
import logo from './logo.png';

function AdminDashboard() {
  const [antrean, setAntrean] = useState([]);
  const [dokters, setDokters] = useState([]);

  useEffect(() => {
    fetchAntrean();
    fetchDokter();
  }, []);

  const fetchAntrean = () => {
    axios.get('http://localhost:5000/admin/antrean')
      .then(res => {
        console.log("ANTREAN DARI SERVER:", res.data);
        setAntrean(res.data || []);
      })
      .catch(err => console.error("Error fetching antrean:", err));
  };

  const fetchDokter = () => {
    axios.get('http://localhost:5000/dokter')
      .then(res => setDokters(res.data || []))
      .catch(err => console.error("Error fetching dokter:", err));
  };

  const handleUpdateStatus = (id, status) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const statusUpdate = {
      dibatalkan: status === 'dibatalkan' ? 1 : 0,
      dipanggil: status === 'dipanggil' ? 1 : 0,
      dilayani: status === 'dilayani' ? 1 : 0,
      dilewati: status === 'dilewati' ? 1 : 0,
      alasanbatal: status === 'dibatalkan' ? 'Dibatalkan oleh admin' : null,
      tanggalbatal: status === 'dibatalkan' ? now : null
    };

    axios.put(`http://localhost:5000/admin/antrean/${id}`, statusUpdate)
      .then(res => {
        alert(res.data.message);
        return axios.post('http://localhost:5000/admin/antrean/update', { id, status });
      })
      .then(() => fetchAntrean())
      .catch(err => console.error("Error updating status:", err));
  };

  const getNamaDokter = (id) => {
    if (!id) return '-';
    const dokter = dokters.find(d => parseInt(d.id) === parseInt(id));
    return dokter ? dokter.nama : '(Tidak ditemukan)';
  };

  const getStatusText = (ant) => {
    if (ant.dibatalkan) return 'Dibatalkan';
    if (ant.dilayani) return 'Dilayani';
    if (ant.dipanggil) return 'Dipanggil';
    if (ant.dilewati) return 'Dilewati';
    return 'Menunggu';
  };

  return (
    <div className="admin-container">
      <div className="admin-logo">
        <img src={logo} alt="Klinik Mitra Medicare" />
      </div>

      <div className="admin-scroll-container">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nomor Antrean</th>
                <th>Nama</th>
                <th>Keluhan</th>
                <th>Dokter</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {antrean.length > 0 ? (
                antrean.map((ant) => (
                  <tr key={ant.id}>
                    <td>{ant.id}</td>
                    <td>{ant.nomorantrean}</td>
                    <td>{ant.nama || '-'}</td>
                    <td>{ant.keluhan || '-'}</td>
                    <td>{getNamaDokter(ant.kodedokter)}</td>
                    <td>{ant.tanggaldibuat ? new Date(ant.tanggaldibuat).toLocaleString() : '-'}</td>
                    <td>{getStatusText(ant)}</td>
                    <td className="action-cell">
                      <button className="action-button blue" onClick={() => handleUpdateStatus(ant.id, 'dilayani')}>Layani</button>
                      <button className="action-button orange" onClick={() => handleUpdateStatus(ant.id, 'dilewati')}>Lewati</button>
                      <button className="action-button red" onClick={() => handleUpdateStatus(ant.id, 'dibatalkan')}>Batal</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>Tidak ada antrean ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
