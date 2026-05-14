import { useState, useMemo } from "react";
import { Search, Download } from "lucide-react";
import LineChart from "./LineChart.jsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useOrderContext } from "../context/OrderContext.jsx";

export default function LaporanPenjualan() {
  const { orders } = useOrderContext();

  // --- STATE ---
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const getItemPrice = (item) => item.harga || item.harga_satuan || 0;

  // --- FILTER PESANAN ---
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDateStr = order.waktu_pesan || order.createdAt || order.created_at || order.waktu;
      if (!orderDateStr) return false;
      let dateString = String(orderDateStr);
      if (!dateString.includes('T') && !dateString.includes('Z')) {
        dateString = dateString.replace(' ', 'T') + 'Z';
      } else if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
        dateString = dateString + 'Z';
      }
      
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return false;
      const dateOnly = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      return dateOnly >= startDate && dateOnly <= endDate;
    });
  }, [orders, startDate, endDate]);

  // --- HITUNG SUMMARY ---
  const summary = useMemo(() => {
    let totalPendapatan = 0;
    let totalPesanan = filteredOrders.length;
    let totalItem = 0;
    const menuCounts = {};

    filteredOrders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const qty = item.qty || 1;
          const price = getItemPrice(item);
          totalPendapatan += qty * price;
          totalItem += qty;
          
          const menuName = item.name || item.nama_menu;
          if (menuName) {
            menuCounts[menuName] = (menuCounts[menuName] || 0) + qty;
          }
        });
      }
    });

    let terlaris = "-";
    let maxQty = 0;
    for (const [menu, qty] of Object.entries(menuCounts)) {
      if (qty > maxQty) {
        maxQty = qty;
        terlaris = menu;
      }
    }

    return { totalPesanan, totalItem, pendapatan: totalPendapatan, terlaris };
  }, [filteredOrders]);

  // --- RINCIAN TABEL ---
  const detailRows = useMemo(() => {
    const rowsMap = {};
    filteredOrders.forEach(order => {
      const orderDateStr = order.waktu_pesan || order.createdAt || order.created_at || order.waktu;
      if (!orderDateStr) return;
      let dateString = String(orderDateStr);
      if (!dateString.includes('T') && !dateString.includes('Z')) {
        dateString = dateString.replace(' ', 'T') + 'Z';
      } else if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
        dateString = dateString + 'Z';
      }
      
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return;
      const tanggal = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const menuName = item.name || item.nama_menu;
          const qty = item.qty || 1;
          const key = `${tanggal}_${menuName}`;
          if (!rowsMap[key]) {
            rowsMap[key] = { tanggal, menu: menuName, terjual: 0, pendapatan: 0 };
          }
          rowsMap[key].terjual += qty;
          rowsMap[key].pendapatan += qty * getItemPrice(item);
        });
      }
    });
    return Object.values(rowsMap).sort((a, b) => {
      // Sort by descending date string simple
      return b.tanggal.localeCompare(a.tanggal);
    });
  }, [filteredOrders]);

  // --- DATA GRAFIK ---
  const chartData = useMemo(() => {
    const dataMap = {};
    filteredOrders.forEach(order => {
      const orderDateStr = order.waktu_pesan || order.createdAt || order.created_at || order.waktu;
      if (!orderDateStr) return;
      let dateString = String(orderDateStr);
      if (!dateString.includes('T') && !dateString.includes('Z')) {
        dateString = dateString.replace(' ', 'T') + 'Z';
      } else if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
        dateString = dateString + 'Z';
      }
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return;
      const label = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      
      let orderTotal = 0;
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          orderTotal += (item.qty || 1) * getItemPrice(item);
        });
      }
      
      dataMap[label] = (dataMap[label] || 0) + orderTotal;
    });

    return Object.keys(dataMap).sort().map(label => ({
      label,
      value: dataMap[label]
    }));
  }, [filteredOrders]);

  // --- FILTER PENCARIAN TABEL ---
  const filteredRows = useMemo(() => {
    return detailRows.filter(r =>
      r.menu.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [detailRows, searchTerm]);

  // --- EXPORT PDF (RApih & Clean) ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("LAPORAN PENJUALAN BOS MENTAI", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [["Tanggal", "Nama Menu", "Terjual", "Pendapatan"]],
      body: filteredRows.map(r => [r.tanggal, r.menu, `${r.terjual} pcs`, `Rp ${r.pendapatan.toLocaleString('id-ID')}`]),
      headStyles: { fillColor: [208, 64, 64] }
    });

    const finalY = doc.lastAutoTable.finalY || 30;
    doc.setFontSize(12);
    doc.text(`Total Pendapatan : Rp ${summary.pendapatan.toLocaleString('id-ID')}`, 14, finalY + 15);
    doc.text(`Total Pesanan    : ${summary.totalPesanan} Pesanan`, 14, finalY + 23);
    doc.text(`Item Terjual     : ${summary.totalItem} Item`, 14, finalY + 31);
    doc.text(`Menu Terlaris    : ${summary.terlaris}`, 14, finalY + 39);

    doc.save(`Laporan_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div style={styles.container}>
      {/* HEADER & FILTER */}
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard Penjualan</h1>
        <div style={styles.filterBar}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.inputDate} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.inputDate} />
        </div>
      </div>

      {/* CARD RINGKASAN */}
      <div style={styles.gridCards}>
        <Card label="Total Pendapatan" value={`Rp ${Number(summary.pendapatan).toLocaleString('id-ID')}`} color="#d97706" />
        <Card label="Total Pesanan" value={summary.totalPesanan} color="#e53e3e" />
        <Card label="Item Terjual" value={summary.totalItem} color="#16a34a" />
        <Card label="Menu Terlaris" value={summary.terlaris} color="#2563eb" />
      </div>

      {/* GRAFIK */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Grafik Penjualan (Harian)</h3>
        <div style={{ marginTop: 20, width: '100%' }}>
          <LineChart data={chartData} />
        </div>
      </div>

      {/* TABEL RINCIAN */}
      <div style={styles.section}>
        <div style={styles.tableHeader}>
          <h3 style={styles.sectionTitle}>Rincian Penjualan Setiap Menu</h3>
          <div style={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari menu..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.inputSearch}
            />
          </div>
        </div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.trHead}>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Nama Menu</th>
              <th style={styles.th}>Terjual</th>
              <th style={styles.th}>Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => (
              <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td style={styles.td}>{row.tanggal}</td>
                <td style={styles.td}>{row.menu}</td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: '#e53e3e' }}>{row.terjual} pcs</td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: '#16a34a' }}>Rp {row.pendapatan.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={downloadPDF} style={styles.btnPdf}>
        <Download size={18} /> Unduh Laporan PDF
      </button>
    </div>
  );
}

// --- SUB KOMPONEN CARD ---
function Card({ label, value, color }) {
  return (
    <div style={{ ...styles.card, backgroundColor: color }}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

// --- STYLING ---
const styles = {
  container: { padding: "30px", backgroundColor: "#f8fafc", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  title: { fontSize: "24px", fontWeight: "800", color: "#1e293b" },
  filterBar: { display: "flex", gap: "10px" },
  inputDate: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" },
  btnFilter: { backgroundColor: "#e53e3e", color: "white", border: "none", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  gridCards: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "30px" },
  card: { padding: "20px", borderRadius: "15px", color: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  cardLabel: { fontSize: "14px", opacity: 0.9, marginBottom: "5px" },
  cardValue: { fontSize: "22px", fontWeight: "700" },
  section: { backgroundColor: "white", padding: "25px", borderRadius: "15px", marginBottom: "30px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  sectionTitle: { fontSize: "16px", fontWeight: "700", color: "#334155" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  searchBox: { display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", padding: "5px 12px", borderRadius: "8px" },
  inputSearch: { border: "none", outline: "none", fontSize: "14px" },
  table: { width: "100%", borderCollapse: "collapse" },
  trHead: { backgroundColor: "#f1f5f9", textAlign: "left" },
  th: { padding: "12px", fontSize: "13px", color: "#64748b", fontWeight: "600" },
  td: { padding: "12px", fontSize: "14px", borderBottom: "1px solid #f1f5f9" },
  trEven: { backgroundColor: "#ffffff" },
  trOdd: { backgroundColor: "#f8fafc" },
  btnPdf: { display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#1e293b", color: "white", border: "none", padding: "12px 25px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", float: "right" }
};