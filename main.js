// ===================== IMPORT FIREBASE SDK v9+ MODULAR =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js"
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js"

// ===================== KONFIGURASI FIREBASE =====================
const firebaseConfig = {
  apiKey: "AIzaSyAFr3Y121FfaDUWJ9FXibB3LNiN6gYAl1I",
  authDomain: "incer-3e941.firebaseapp.com",
  projectId: "incer-3e941",
  storageBucket: "incer-3e941.firebasestorage.app",
  messagingSenderId: "575500379499",
  appId: "1:575500379499:web:7cc7e87d7dbd02b722582e",
  measurementId: "G-KJ759EE2CR"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Referensi koleksi
const usersCollection = collection(db, "users")
const pasienCollection = collection(db, "pasien")
const antreanCollection = collection(db, "antrean")

// Variabel global untuk menyimpan data antrean
let dataAntreanGlobal = []
let unsubscribeAntrean = null

// ===================== UTILITAS: TANGGAL HARI INI =====================
// Mengembalikan tanggal dalam format YYYY-MM-DD untuk filter harian
function getTanggalHariIni() {
    const now = new Date()
    const tahun = now.getFullYear()
    const bulan = String(now.getMonth() + 1).padStart(2, '0')
    const tanggal = String(now.getDate()).padStart(2, '0')
    return `${tahun}-${bulan}-${tanggal}`
}

// ===================== FUNGSI LOGIN =====================
export async function login() {
    const username = document.getElementById("username").value.trim()
    const password = document.getElementById("password").value.trim()
    const statusEl = document.getElementById("status")

    // Validasi input kosong
    if (!username || !password) {
        statusEl.className = "status-message error"
        statusEl.innerText = "Username dan password wajib diisi!"
        return
    }

    try {
        // Query ke Firestore untuk mencari user dengan username & password cocok
        const q = query(
            usersCollection,
            where("username", "==", username),
            where("password", "==", password)
        )
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
            // Login berhasil - simpan status di localStorage
            localStorage.setItem("isLogin", "true")
            localStorage.setItem("username", username)

            statusEl.className = "status-message success"
            statusEl.innerText = "Login berhasil! Mengalihkan..."

            // Redirect ke dashboard setelah 800ms
            setTimeout(() => {
                tampilkanDashboard()
            }, 800)
        } else {
            statusEl.className = "status-message error"
            statusEl.innerText = "Username atau password salah!"
        }
    } catch (error) {
        console.error("Error login:", error)
        statusEl.className = "status-message error"
        statusEl.innerText = "Terjadi kesalahan: " + error.message
    }
}

// ===================== FUNGSI LOGOUT =====================
export function logout() {
    // Hapus status login
    localStorage.removeItem("isLogin")
    localStorage.removeItem("username")

    // Hentikan listener realtime jika ada
    if (unsubscribeAntrean) {
        unsubscribeAntrean()
        unsubscribeAntrean = null
    }

    // Redirect ke halaman login
    window.location.href = "index.html"
}

// ===================== FUNGSI CEK LOGIN =====================
export function cekLogin() {
    const isLogin = localStorage.getItem("isLogin")

    if (isLogin === "true") {
        // Jika sudah login, langsung tampilkan dashboard
        tampilkanDashboard()
    } else {
        // Jika belum login, tampilkan halaman login
        document.getElementById("halamanLogin").classList.remove("d-none")
        document.getElementById("halamanDashboard").classList.add("d-none")
    }
}

// ===================== FUNGSI TAMPILKAN DASHBOARD =====================
function tampilkanDashboard() {
    document.getElementById("halamanLogin").classList.add("d-none")
    document.getElementById("halamanDashboard").classList.remove("d-none")

    // Muat data antrean secara realtime
    muatDataAntreanRealtime()
}

// ===================== FUNGSI SIMPAN PASIEN & BUAT ANTREAN =====================
export async function simpanPasien() {
    const nama = document.getElementById("namaPasien").value.trim()
    const umur = document.getElementById("umurPasien").value.trim()
    const jenisKelamin = document.getElementById("jkPasien").value
    const pesanEl = document.getElementById("pesanInput")

    // ============ VALIDASI INPUT ============
    if (!nama) {
        pesanEl.className = "alert alert-danger py-2"
        pesanEl.innerText = "Nama pasien wajib diisi!"
        return
    }

    if (!umur || isNaN(umur) || Number(umur) <= 0) {
        pesanEl.className = "alert alert-danger py-2"
        pesanEl.innerText = "Umur wajib diisi dan harus berupa angka positif!"
        return
    }

    if (!jenisKelamin) {
        pesanEl.className = "alert alert-danger py-2"
        pesanEl.innerText = "Jenis kelamin wajib dipilih!"
        return
    }

    try {
        const tanggalHariIni = getTanggalHariIni()

        // ============ 1. SIMPAN DATA PASIEN ============
        const pasienRef = await addDoc(pasienCollection, {
            nama: nama,
            umur: Number(umur),
            jenisKelamin: jenisKelamin,
            createdAt: serverTimestamp()
        })

        // ============ 2. BUAT NOMOR ANTREAN OTOMATIS ============
        // Ambil semua antrean hari ini untuk menentukan nomor berikutnya
        const qAntrean = query(
            antreanCollection,
            where("tanggal", "==", tanggalHariIni)
        )
        const snapshotAntrean = await getDocs(qAntrean)

        // Nomor urut = jumlah antrean hari ini + 1
        const nomorUrut = snapshotAntrean.size + 1
        // Format nomor: A-001, A-002, dst.
        const nomorAntrean = "A-" + String(nomorUrut).padStart(3, '0')

        // ============ 3. SIMPAN DATA ANTREAN ============
        await addDoc(antreanCollection, {
            pasienId: pasienRef.id,
            nama: nama,
            umur: Number(umur),
            jenisKelamin: jenisKelamin,
            nomor: nomorAntrean,
            tanggal: tanggalHariIni,
            status: "Menunggu",
            waktuDaftar: serverTimestamp(),
            waktuPanggil: null,
            waktuSelesai: null
        })

        // ============ 4. RESET FORM & TAMPILKAN PESAN SUKSES ============
        document.getElementById("namaPasien").value = ""
        document.getElementById("umurPasien").value = ""
        document.getElementById("jkPasien").value = ""

        pesanEl.className = "alert alert-success py-2"
        pesanEl.innerHTML = `<i class="bi bi-check-circle-fill"></i> Pasien <b>${nama}</b> berhasil didaftarkan dengan nomor <b>${nomorAntrean}</b>`

        // Hilangkan pesan setelah 5 detik
        setTimeout(() => {
            pesanEl.className = ""
            pesanEl.innerHTML = ""
        }, 5000)

    } catch (error) {
        console.error("Error simpan pasien:", error)
        pesanEl.className = "alert alert-danger py-2"
        pesanEl.innerText = "Gagal menyimpan: " + error.message
    }
}

// ===================== FUNGSI MUAT DATA ANTREAN REALTIME =====================

// Kueri hanya pakai `where` saja — tidak perlu composite index
const q = query(
    antreanCollection,
    where("tanggal", "==", tanggalHariIni)
)

unsubscribeAntrean = onSnapshot(q, (snapshot) => {
    dataAntreanGlobal = []
    snapshot.forEach((doc) => {
        dataAntreanGlobal.push({ id: doc.id, ...doc.data() })
    })
    
    // ✅ Urutkan di JavaScript (bukan di Firestore)
    dataAntreanGlobal.sort((a, b) => {
        const wa = a.waktuDaftar?.toMillis?.() || 0
        const wb = b.waktuDaftar?.toMillis?.() || 0
        return wa - wb // ascending: paling awal di atas
    })
    
    renderTabelAntrean()
    renderStatistik()
}, (error) => {
    console.error("Error memuat antrean:", error)
})

// ===================== FUNGSI function muatDataAntreanRealtime()MUAT DATA ANTREAN REALTIME =====================
function muatDataAntreanRealtime() {
    const tanggalHariIni = getTanggalHariIni()
    
    // Hentikan listener lama jika ada (mencegah duplikat)
    if (unsubscribeAntrean) unsubscribeAntrean()
    
    // Kueri hanya pakai `where` agar tidak perlu composite index
    const q = query(
        antreanCollection,
        where("tanggal", "==", tanggalHariIni)
    )
    
    // onSnapshot = listener realtime, otomatis update saat data berubah
    unsubscribeAntrean = onSnapshot(q, (snapshot) => {
        dataAntreanGlobal = []
        snapshot.forEach((doc) => {
            dataAntreanGlobal.push({ id: doc.id, ...doc.data() })
        })
        
        // Urutkan di JavaScript (bukan di Firestore) — ascending waktuDaftar
        dataAntreanGlobal.sort((a, b) => {
            const wa = a.waktuDaftar?.toMillis?.() || 0
            const wb = b.waktuDaftar?.toMillis?.() || 0
            return wa - wb
        })
        
        // Render tabel dan statistik
        renderTabelAntrean()
        renderStatistik()
    }, (error) => {
        console.error("Error memuat antrean:", error)
    })
}
function renderTabelAntrean() {
    const tabel = document.getElementById("tabelAntrean")
    const pesanKosong = document.getElementById("pesanKosong")
    tabel.innerHTML = ""

    // Jika tidak ada data, tampilkan pesan kosong
    if (dataAntreanGlobal.length === 0) {
        pesanKosong.classList.remove("d-none")
        return
    }
    pesanKosong.classList.add("d-none")

    // Loop setiap antrean dan buat baris tabel
    dataAntreanGlobal.forEach((antrean, index) => {
        const baris = document.createElement("tr")

        // Kolom nomor urut
        const tdNo = document.createElement("td")
        tdNo.textContent = index + 1

        // Kolom nomor antrean
        const tdNomor = document.createElement("td")
        tdNomor.innerHTML = `<span class="fw-bold text-primary">${antrean.nomor}</span>`

        // Kolom nama pasien
        const tdNama = document.createElement("td")
        tdNama.innerHTML = `<div class="fw-semibold">${antrean.nama}</div>
                            <small class="text-muted">${antrean.umur} th • ${antrean.jenisKelamin}</small>`

        // Kolom waktu daftar
        const tdWaktu = document.createElement("td")
        tdWaktu.textContent = formatWaktu(antrean.waktuDaftar)
        tdWaktu.className = "text-muted small"

        // Kolom status dengan badge warna
        const tdStatus = document.createElement("td")
        tdStatus.innerHTML = getBadgeStatus(antrean.status)

        // Kolom aksi
        const tdAksi = document.createElement("td")
        tdAksi.className = "text-center"

        // Tombol aksi sesuai status
        if (antrean.status === "Menunggu") {
            const btnBatal = document.createElement("button")
            btnBatal.className = "btn btn-outline-danger btn-aksi"
            btnBatal.innerHTML = '<i class="bi bi-x-circle"></i> Batal'
            btnBatal.onclick = () => batalkanAntrean(antrean.id, antrean.nomor)
            tdAksi.appendChild(btnBatal)
        } else if (antrean.status === "Dipanggil") {
            const btnSelesai = document.createElement("button")
            btnSelesai.className = "btn btn-success btn-aksi"
            btnSelesai.innerHTML = '<i class="bi bi-check-circle"></i> Selesai'
            btnSelesai.onclick = () => selesaikanAntrean(antrean.id, antrean.nomor)

            const btnBatal = document.createElement("button")
            btnBatal.className = "btn btn-outline-danger btn-aksi"
            btnBatal.innerHTML = '<i class="bi bi-x-circle"></i>'
            btnBatal.onclick = () => batalkanAntrean(antrean.id, antrean.nomor)

            tdAksi.appendChild(btnSelesai)
            tdAksi.appendChild(btnBatal)
        } else {
            tdAksi.innerHTML = '<span class="text-muted small">-</span>'
        }

        // Gabungkan semua kolom ke baris
        baris.appendChild(tdNo)
        baris.appendChild(tdNomor)
        baris.appendChild(tdNama)
        baris.appendChild(tdWaktu)
        baris.appendChild(tdStatus)
        baris.appendChild(tdAksi)

        tabel.appendChild(baris)
    })
}

// ===================== FUNGSI GET BADGE STATUS =====================
function getBadgeStatus(status) {
    const map = {
        "Menunggu": "badge-menunggu",
        "Dipanggil": "badge-dipanggil",
        "Selesai": "badge-selesai",
        "Batal": "badge-batal"
    }
    return `<span class="badge-status ${map[status] || 'badge-menunggu'}">${status}</span>`
}

// ===================== FUNGSI FORMAT WAKTU =====================
function formatWaktu(timestamp) {
    if (!timestamp) return "-"
    try {
        // Firestore Timestamp object
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch (e) {
        return "-"
    }
}

// ===================== FUNGSI RENDER STATISTIK =====================
function renderStatistik() {
    const menunggu = dataAntreanGlobal.filter(a => a.status === "Menunggu").length
    const selesai = dataAntreanGlobal.filter(a => a.status === "Selesai").length
    const dipanggil = dataAntreanGlobal.find(a => a.status === "Dipanggil")

    document.getElementById("jumlahMenunggu").textContent = menunggu
    document.getElementById("jumlahSelesai").textContent = selesai
    document.getElementById("jumlahTotal").textContent = dataAntreanGlobal.length
    document.getElementById("nomorSaatIni").textContent = dipanggil ? dipanggil.nomor : "-"
}

// ===================== FUNGSI PANGGIL BERIKUTNYA =====================
export async function panggilBerikutnya() {
    try {
        // Cari antrean dengan status "Menunggu" paling awal
        const antreanMenunggu = dataAntreanGlobal.filter(a => a.status === "Menunggu")

        if (antreanMenunggu.length === 0) {
            alert("Tidak ada antrean yang menunggu.")
            return
        }

        // Ambil antrean paling awal
        const antreanDipanggil = antreanMenunggu[0]

        // Update status menjadi "Dipanggil" dan catat waktu panggil
        const antreanRef = doc(db, "antrean", antreanDipanggil.id)
        await updateDoc(antreanRef, {
            status: "Dipanggil",
            waktuPanggil: serverTimestamp()
        })

        // Opsional: tampilkan notifikasi
        console.log(`Memanggil antrean: ${antreanDipanggil.nomor} - ${antreanDipanggil.nama}`)

    } catch (error) {
        console.error("Error panggil antrean:", error)
        alert("Gagal memanggil antrean: " + error.message)
    }
}

// ===================== FUNGSI SELESAIKAN ANTREAN =====================
export async function selesaikanAntrean(id, nomor) {
    if (!confirm(`Selesaikan antrean ${nomor}?`)) return

    try {
        const antreanRef = doc(db, "antrean", id)
        await updateDoc(antreanRef, {
            status: "Selesai",
            waktuSelesai: serverTimestamp()
        })
    } catch (error) {
        console.error("Error selesaikan antrean:", error)
        alert("Gagal menyelesaikan antrean: " + error.message)
    }
}

// ===================== FUNGSI BATALKAN ANTREAN =====================
export async function batalkanAntrean(id, nomor) {
    if (!confirm(`Batalkan antrean ${nomor}?`)) return

    try {
        const antreanRef = doc(db, "antrean", id)
        await updateDoc(antreanRef, {
            status: "Batal"
        })
    } catch (error) {
        console.error("Error batalkan antrean:", error)
        alert("Gagal membatalkan antrean: " + error.message)
    }
}

// ===================== FUNGSI INIT DISPLAY (HALAMAN DISPLAY) =====================
export function initDisplay() {
    const tanggalHariIni = getTanggalHariIni()
    
    // Update jam setiap detik
    setInterval(() => {
        const jamEl = document.getElementById("jamDisplay")
        if (jamEl) {
            jamEl.textContent = new Date().toLocaleTimeString('id-ID')
        }
    }, 1000)
    
    // Kueri hanya pakai `where` agar tidak perlu composite index
    const q = query(
        antreanCollection,
        where("tanggal", "==", tanggalHariIni)
    )
    
    // Variabel untuk melacak nomor terakhir yang dipanggil (untuk trigger suara)
    let lastCalledId = null
    
    // Listener realtime untuk display
    onSnapshot(q, (snapshot) => {
        const semuaAntrean = []
        snapshot.forEach((doc) => {
            semuaAntrean.push({ id: doc.id, ...doc.data() })
        })
        
        // Urutkan di JavaScript berdasarkan waktuDaftar
        semuaAntrean.sort((a, b) => {
            const wa = a.waktuDaftar?.toMillis?.() || 0
            const wb = b.waktuDaftar?.toMillis?.() || 0
            return wa - wb
        })
        
        // Cari antrean yang sedang dipanggil (status = "Dipanggil")
        const dipanggil = semuaAntrean.find(a => a.status === "Dipanggil")
        
        // Cari antrean menunggu untuk ditampilkan sebagai "berikutnya"
        const menunggu = semuaAntrean.filter(a => a.status === "Menunggu")
        
        // ============ UPDATE TAMPILAN NOMOR DIPANGGIL ============
        const elNomor = document.getElementById("nomorDipanggil")
        const elNama = document.getElementById("namaDipanggil")
        const elPesan = document.querySelector(".pesan-poli")
        
        if (dipanggil) {
            elNomor.textContent = dipanggil.nomor
            elNama.textContent = dipanggil.nama
            elPesan.style.display = "block"
            
            // Trigger suara hanya jika ini antrean BARU yang dipanggil
            if (lastCalledId !== dipanggil.id) {
                lastCalledId = dipanggil.id
                mainkanSuaraPanggilan(dipanggil.nomor, dipanggil.nama)
            }
        } else if (semuaAntrean.length > 0 && menunggu.length === 0) {
            elNomor.textContent = "✔"
            elNama.textContent = "ANTREAN SELESAI"
            elPesan.textContent = "Tidak ada pasien yang sedang menunggu"
            elPesan.style.display = "block"
        } else {
            elNomor.textContent = "-"
            elNama.textContent = "BELUM ADA ANTREAN"
            elPesan.textContent = "Silakan menunggu pendaftaran pasien"
            elPesan.style.display = "block"
        }
        
        // ============ UPDATE DAFTAR ANTREAN BERIKUTNYA ============
        const listBerikutnya = document.getElementById("listBerikutnya")
        listBerikutnya.innerHTML = ""
        
        if (menunggu.length === 0) {
            listBerikutnya.innerHTML = '<div class="next-empty">Tidak ada antrean berikutnya</div>'
        } else {
            // Tampilkan maksimal 5 antrean berikutnya
            menunggu.slice(0, 5).forEach((antrean) => {
                const item = document.createElement("div")
                item.className = "next-item"
                item.innerHTML = `
                    <span>${antrean.nomor}</span>
                    <span class="nama">${antrean.nama}</span>
                `
                listBerikutnya.appendChild(item)
            })
        }
    }, (error) => {
        console.error("Error display:", error)
    })
}

// ===================== FUNGSI MAIN SUARA PANGGILAN =====================
function mainkanSuaraPanggilan(nomor, nama) {
    try {
        // Mainkan beep sound
        const audio = document.getElementById("audioPanggil")
        if (audio) {
            audio.currentTime = 0
            audio.play().catch(e => console.log("Audio play blocked:", e))
        }

        // Gunakan Web Speech API untuk text-to-speech
        if ('speechSynthesis' in window) {
            // Batalkan ucapan sebelumnya
            window.speechSynthesis.cancel()

            // Buat ucapan baru
            const ucapan = new SpeechSynthesisUtterance(
                `Nomor antrean, ${nomor.split('').join(' ')}, atas nama, ${nama}, silakan menuju poli umum`
            )
            ucapan.lang = 'id-ID'
            ucapan.rate = 0.9
            ucapan.pitch = 1
            ucapan.volume = 1

            // Delay sedikit agar beep selesai dulu
            setTimeout(() => {
                window.speechSynthesis.speak(ucapan)
            }, 500)
        }
    } catch (error) {
        console.error("Error memainkan suara:", error)
    }
}