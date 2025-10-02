import { supabase } from './supabase.js'

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formTambahBahan")
  const checkbox = document.getElementById("punyaSatuanKedua")
  const opsiSatuanKedua = document.getElementById("opsiSatuanKedua")

  const hargaInput = document.getElementById("harga")
  const konversiInput = document.getElementById("konversi")
  const hargaPerInput = document.getElementById("harga_per_satuan_kedua")

  // ✅ Tampilkan / sembunyikan opsi satuan kedua
  checkbox.addEventListener("change", () => {
    opsiSatuanKedua.style.display = checkbox.checked ? "block" : "none"
  })

  // ✅ Hitung otomatis harga per satuan kedua
  konversiInput.addEventListener("input", () => {
    const harga = parseFloat(hargaInput.value) || 0
    const konversi = parseInt(konversiInput.value) || 0
    hargaPerInput.value = (konversi > 0) ? (harga / konversi).toFixed(2) : ""
  })

  // ✅ Handle submit form
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Ambil data dari input dasar
    const nama = document.getElementById("nama").value.trim()
    const jumlah_awal = parseFloat(document.getElementById("jumlah").value)
    const satuan_awal = document.getElementById("satuan").value.trim()
import { supabase } from './supabase.js'
// ✅ Import Supabase client
import { supabase } from './supabase.js'

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formTambahBahan")

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // ✅ Ambil input
    const nama = document.getElementById("nama").value.trim()
    const harga_total = parseFloat(document.getElementById("harga").value)
    const jumlah_awal = parseFloat(document.getElementById("jumlah").value)
    const satuan_awal = document.getElementById("satuan").value

// form.js (VERSI PERBAIKAN)

import { supabase } from './supabase.js'

// Pastikan semua kode dijalankan setelah DOM siap
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formTambahBahan")
  
  // Terdapat input di kode Anda yang tidak ada di HTML:
  // const checkbox = document.getElementById("punyaSatuanKedua")
  // const opsiSatuanKedua = document.getElementById("opsiSatuanKedua")
  // const konversiInput = document.getElementById("konversi")
  // Saya hapus kode yang merujuk pada elemen yang tidak ada di HTML Anda, 
  // dan menggunakan input yang benar: jumlah_kedua.

  const hargaInput = document.getElementById("harga")
  const jumlahKeduaInput = document.getElementById("jumlah_kedua")
  const hargaPerKeduaInput = document.getElementById("harga_per_satuan_kedua") // <-- ID ini juga tidak ada di HTML Anda. Abaikan dulu, fokus ke fungsi inti.

  // ⚠️ Jika Anda ingin menampilkan harga_per_satuan_kedua secara otomatis, 
  // Anda harus menggunakan input yang sudah ada, yaitu "jumlah_kedua".
  jumlahKeduaInput.addEventListener("input", () => {
    const harga = parseFloat(hargaInput.value) || 0
    const konversi = parseInt(jumlahKeduaInput.value) || 0 // 'jumlah_kedua' adalah nilai konversi
    
    // Asumsi Anda punya input dengan ID 'harga_per_satuan_kedua'
    if (document.getElementById("harga_per_satuan_kedua")) {
        document.getElementById("harga_per_satuan_kedua").value = (konversi > 0) ? (harga / konversi).toFixed(2) : ""
    }
  })

  // ✅ Handle submit form
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Ambil input
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

    // Hitung harga per satuan awal
    const harga_per_satuan_awal = harga_total / jumlah_awal

    // Default nilai satuan kedua
    let harga_per_satuan_kedua = null
    let konversi = null // Dalam kasus ini, konversi = jumlah_kedua

    // Jika pengguna memilih satuan kedua DAN mengisi jumlah konversi
    if (satuan_kedua && jumlah_kedua > 0) {
      konversi = jumlah_kedua
      // Rumus: Harga Total / Jumlah Awal / Konversi
      // Contoh: Rp10.000 / 1 kg / 1000 gram = Rp10/gram
      harga_per_satuan_kedua = harga_total / (jumlah_awal * jumlah_keduda)
    }

    // Susun data
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
      alert("❌ Gagal menyimpan: " + error.message)
      console.error(error)
    } else {
      alert("✅ Bahan berhasil ditambahkan!")
      form.reset()
    }
  })
})
