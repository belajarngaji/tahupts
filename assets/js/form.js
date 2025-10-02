import { supabase } from './supabase.js'

// Ambil referensi form
const form = document.getElementById("formTambahBahan")

form.addEventListener("submit", async (e) => {
  e.preventDefault()

  // Ambil data dari input
  const nama = document.getElementById("nama").value
  const jumlah_awal = parseFloat(document.getElementById("jumlah").value)
  const satuan_awal = document.getElementById("satuan").value
  const harga_total = parseFloat(document.getElementById("harga").value)

  // Data opsional (satuan kedua)
  const satuan_kedua = document.getElementById("satuan_kedua").value || null
  const konversi = document.getElementById("konversi").value 
    ? parseInt(document.getElementById("konversi").value) 
    : null

  // Hitung harga per satuan kedua jika ada
  let harga_per_satuan_kedua = null
  if (satuan_kedua && konversi > 0) {
    harga_per_satuan_kedua = harga_total / konversi
  }

  // Susun data untuk Supabase
  const dataBahan = {
    nama,
    jumlah_awal,
    satuan_awal,
    harga_total,
    satuan_kedua,
    konversi,
    harga_per_satuan_kedua
  }

  // Insert ke Supabase
  const { error } = await supabase.from("bahan").insert([dataBahan])

  if (error) {
    alert("❌ Gagal simpan: " + error.message)
    console.error(error)
  } else {
    alert("✅ Bahan berhasil ditambahkan!")
    form.reset()
  }
})
