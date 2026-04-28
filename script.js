// --- JAVASCRIPT: LOGIKA & KONEKSI DATABASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// URL Firebase
const firebaseConfig = {
    databaseURL: "https://monitoring-suhu-kelembap-324cc-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Mengambil elemen HTML
const elSuhu = document.getElementById("suhu_val");
const elLembab = document.getElementById("lembab_val");
const elWaktu = document.getElementById("waktu_val");
const panelSuhu = document.getElementById("panel_suhu");
const statusTeks = document.getElementById("status_teks");
const exportButton = document.getElementById("export_csv_btn");
const exportRange = document.getElementById("export_range");
const exportStatus = document.getElementById("export_status");

const STORAGE_KEY = "mqtt_rekap_history";
let historyData = loadHistory();

function loadHistory() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn("Gagal memuat riwayat dari localStorage:", error);
        return [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
    } catch (error) {
        console.warn("Gagal menyimpan riwayat ke localStorage:", error);
    }
}

function trimHistory() {
    const maxKeep = 31 * 24 * 60 * 60 * 1000; // 1 bulan
    const cutoff = Date.now() - maxKeep;
    historyData = historyData.filter(entry => entry.timestamp >= cutoff);
}

function addHistoryEntry(data) {
    const waktu = data.waktu || new Date().toLocaleString();
    const suhu = data.suhu ?? "-";
    const kelembaban = data.kelembaban ?? "-";
    historyData.push({
        waktu,
        suhu,
        kelembaban,
        timestamp: Date.now()
    });

    trimHistory();
    saveHistory();
}

function getRangeMs(value) {
    switch (value) {
        case "1h": return 60 * 60 * 1000;
        case "24h": return 24 * 60 * 60 * 1000;
        case "7d": return 7 * 24 * 60 * 60 * 1000;
        case "30d": return 30 * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000;
    }
}

function escapeCsv(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function convertToCsv(records) {
    const header = ["Waktu", "Suhu (°C)", "Kelembaban (%)"];
    return [header.join(","), ...records.map(entry => [
        escapeCsv(entry.waktu),
        escapeCsv(entry.suhu),
        escapeCsv(entry.kelembaban)
    ].join(","))].join("\r\n");
}

function exportCsv() {
    const rangeMs = getRangeMs(exportRange.value);
    const cutoff = Date.now() - rangeMs;
    const filtered = historyData.filter(entry => entry.timestamp >= cutoff);

    if (filtered.length === 0) {
        exportStatus.innerText = "Tidak ada data dalam rentang waktu ini. Tunggu beberapa saat lalu coba lagi.";
        return;
    }

    const csvContent = convertToCsv(filtered);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const filename = `rekapan-${exportRange.value}-${new Date().toISOString().slice(0, 10)}.csv`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    exportStatus.innerText = `Berhasil membuat file CSV dengan ${filtered.length} baris data untuk rentang ${exportRange.options[exportRange.selectedIndex].text}.`;
}

if (exportButton) {
    exportButton.addEventListener("click", exportCsv);
}

// Membaca data secara Real-Time
onValue(ref(db, 'data_alat'), (snapshot) => {
    const data = snapshot.val();
    
    if(data) {
        elSuhu.innerText = data.suhu;
        elLembab.innerText = data.kelembaban;
        elWaktu.innerText = data.waktu;

        addHistoryEntry(data);

        // LOGIKA KONDISIONAL
        if (parseFloat(data.suhu) > 30.0) {
            panelSuhu.className = "panel status-warning";
            statusTeks.innerText = "OVERHEAT WARNING";
            statusTeks.style.color = "#ff3333";
        } else {
            panelSuhu.className = "panel status-normal";
            statusTeks.innerText = "STATUS: NORMAL";
            statusTeks.style.color = "#00ff66";
        }
    }
});