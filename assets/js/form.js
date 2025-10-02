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

    const satuan_kedua = document.getElementById("satuan_kedua").value
    const jumlah_kedua = parseFloat(document.getElementById("jumlah_kedua").value)

    // ✅ Validasi dasar
    if (!nama || !harga_total || !jumlah_awal || !satuan_awal) {
      alert("⚠️ Harap isi semua data utama (nama, harga, jumlah, satuan awal).")
      return
    }

    // ✅ Hitung harga per satuan awal
    const harga_per_satuan_awal = harga_total / jumlah_awal

    // ✅ Default nilai satuan kedua
    let harga_per_satuan_kedua = null
    let konversi = null

    if (satuan_kedua && jumlah_kedua > 0) {
      konversi = jumlah_kedua
      harga_per_satuan_kedua = harga_total / (jumlah_awal * jumlah_kedua)
    }

    // ✅ Susun data
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

    // ✅ Simpan ke Supabase
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
