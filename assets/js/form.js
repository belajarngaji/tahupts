// form.js

// 1. Import Supabase Client dari file lokal
import { supabase } from './supabase.js'

// 2. Pastikan semua kode dijalankan setelah DOM (HTML) siap dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Ambil referensi elemen-elemen form
  const form = document.getElementById("formTambahBahan")
  const hargaInput = document.getElementById("harga")
  const jumlahKeduaInput = document.getElementById("jumlah_kedua")

  // --- Logika Opsional: Hitung Otomatis Harga Per Satuan Kedua ---
  // (Asumsi Anda menambahkan input dengan ID 'harga_per_satuan_kedua' untuk menampilkan hasilnya)
  const hargaPerKeduaDisplay = document.getElementById("harga_per_satuan_kedua")
  
  if (hargaPerKeduaDisplay) {
      jumlahKeduaInput.addEventListener("input", () => {
        const harga = parseFloat(hargaInput.value) || 0
        const konversi = parseInt(jumlahKeduaInput.value) || 0 
        
        // Perhitungan: Harga Total / Nilai Konversi
        hargaPerKeduaDisplay.value = (konversi > 0) ? (harga / konversi).toFixed(2) : ""
      })
  }
  // ------------------------------------------------------------------


  // 3. Handle submit form
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Ambil semua input
    const nama = document.getElementById("nama").value.trim()
    const harga_total = parseFloat(document.getElementById("harga").value)
    const jumlah_awal = parseFloat(document.getElementById("jumlah").value)
    const satuan_awal = document.getElementById("satuan").value

    const satuan_kedua = document.getElementById("satuan_kedua").value
    const jumlah_kedua = parseFloat(document.getElementById("jumlah_kedua").value)

    // Validasi dasar
    if (!nama || !harga_total || !jumlah_awal || !satuan_awal) {
      alert("⚠️ Harap isi semua data utama (nama, harga, jumlah, satuan awal).")
      return
    }

    // Perhitungan Harga
    const harga_per_satuan_awal = harga_total / jumlah_awal

    // Inisialisasi nilai konversi
    let harga_per_satuan_kedua = null
    let konversi = null

    // Jika satuan kedua diisi dan jumlah konversi valid (> 0)
    if (satuan_kedua && jumlah_kedua > 0) {
      konversi = jumlah_kedua
      // Rumus: Harga Total / (Jumlah Awal * Nilai Konversi)
      harga_per_satuan_kedua = harga_total / (jumlah_awal * jumlah_kedua)
    }

    // Susun objek data untuk Supabase
    const dataBahan = {
      nama,
      harga_total,
      jumlah_awal,
      satuan_awal,
      harga_per_satuan_awal,
      satuan_kedua: satuan_kedua || null,
      konversi,
      harga_per_satuan_kedua
    }

    console.log("📝 Data yang akan disimpan:", dataBahan)

    // Simpan ke Supabase
    const { error } = await supabase.from("bahan").insert([dataBahan])

    if (error) {
      alert("❌ Gagal menyimpan data bahan: " + error.message)
      console.error("Supabase Error:", error)
    } else {
      alert("✅ Bahan berhasil ditambahkan!")
      form.reset() // Bersihkan form setelah sukses
    }
  })
})
