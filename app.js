// ==========================================
// 0. INISIALISASI FIREBASE & MQTT
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB9ak86rfEFWu4WZdGkqRJPzYWJWJYI0sM",
    authDomain: "nutribot-18e6e.firebaseapp.com",
    databaseURL: "https://nutribot-18e6e-default-rtdb.firebaseio.com",
    projectId: "nutribot-18e6e",
    storageBucket: "nutribot-18e6e.firebasestorage.app",
    messagingSenderId: "952588165077",
    appId: "1:952588165077:web:807b6aaaec368e0e09e75c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Gunakan Port 8884 untuk jalur Secure WebSocket (WSS)
const mqttClient = new Paho.MQTT.Client("broker.hivemq.com", 8884, "NutriBot_Web_" + parseInt(Math.random() * 1000));

// Tambahkan konfigurasi koneksi SSL
mqttClient.connect({ 
    useSSL: true, // Wajib bernilai true untuk koneksi HTTPS Netlify
    onSuccess: () => console.log("MQTT Kontrol Aktuator Ready! (Secure)") 
});

mqttClient.connect({ onSuccess: () => console.log("MQTT Kontrol Aktuator Ready!") });


// ==========================================
// 1. GRAFIK RIWAYAT pH (LINE CHART)
// ==========================================
const ctxRiwayat = document.getElementById('grafikRiwayat').getContext('2d');
const chartRiwayat = new Chart(ctxRiwayat, {
    type: 'line',
    data: {
        labels: [], datasets: [{
            label: 'Nilai pH Air', data: [], 
            borderColor: '#00d2ff', backgroundColor: 'rgba(0, 210, 255, 0.2)',
            borderWidth: 2, tension: 0.4, fill: true
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#ffffff' } } },
        scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' }, min: 0, max: 14 } }
    }
});


// ==========================================
// 2. MENDENGARKAN SENSOR DARI FIREBASE (Anti-Amnesia)
// ==========================================
db.ref('NutriBot_Node1/sensor_aktual/volume_air_persen').on('value', (snapshot) => {
    const val = snapshot.val() || 0;
    document.getElementById('teks-volume-air').innerText = val + '%';
    document.getElementById('animasi-air').style.top = (100 - val) + '%';
});

db.ref('NutriBot_Node1/sensor_aktual/level_nutrisi_persen').on('value', (snapshot) => {
    const val = snapshot.val() || 0;
    document.getElementById('teks-level-nutrisi').innerText = val + '%';
    document.getElementById('animasi-nutrisi').style.height = val + '%';
    document.getElementById('notif-nutrisi').style.display = val < 10 ? 'block' : 'none';
});

db.ref('NutriBot_Node1/sensor_aktual/suhu_air').on('value', (snapshot) => {
    document.getElementById('teks-suhu').innerText = snapshot.val() || 0;
});

db.ref('NutriBot_Node1/sensor_aktual/ph_air').on('value', (snapshot) => {
    const nilaiPH = snapshot.val() || 0;
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    chartRiwayat.data.labels.push(waktu);
    chartRiwayat.data.datasets[0].data.push(nilaiPH);

    if (chartRiwayat.data.labels.length > 8) {
        chartRiwayat.data.labels.shift(); 
        chartRiwayat.data.datasets[0].data.shift(); 
    }
    chartRiwayat.update();
});


// ==========================================
// 3. MENGIRIM KONTROL KE MQTT & FIREBASE
// ==========================================
function kendalikanPompa(topicMqtt, nodeFirebase, statusAktif) {
    // 1. Tembak langsung ke ESP32 agar cepat
    if (mqttClient.isConnected()) {
        const pesan = new Paho.MQTT.Message(statusAktif ? "true" : "false");
        pesan.destinationName = topicMqtt;
        mqttClient.send(pesan);
    }
    // 2. Simpan status di Firebase agar ingat saat di-refresh
    db.ref(`NutriBot_Node1/status_pompa/${nodeFirebase}`).set(statusAktif);
    db.ref('NutriBot_Node1/kontrol_sistem/mode_manual').set(true);
}

document.getElementById('pompa-ab').addEventListener('change', (e) => {
    kendalikanPompa("nutribot/kontrol/pompa_ab", "pompa_AB_Mix", e.target.checked);
});
document.getElementById('pompa-ph-up').addEventListener('change', (e) => {
    kendalikanPompa("nutribot/kontrol/pompa_ph_up", "pompa_pH_Up", e.target.checked);
});
document.getElementById('pompa-ph-down').addEventListener('change', (e) => {
    kendalikanPompa("nutribot/kontrol/pompa_ph_down", "pompa_pH_Down", e.target.checked);
});