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
    const harga_total = parseFloat(hargaInput.value)

    // Validasi dasar
    if (!nama || !jumlah_awal || !satuan_awal || !harga_total) {
      alert("⚠️ Harap isi semua data dasar (nama, jumlah, satuan, harga).")
      return
    }

    // Data opsional satuan kedua
    let satuan_kedua = null
    let konversi = null
    let harga_per_satuan_kedua = null

    if (checkbox.checked) {
      satuan_kedua = document.getElementById("satuan_kedua").value.trim()
      konversi = parseInt(konversiInput.value)

      if (!satuan_kedua || !konversi || konversi <= 0) {
        alert("⚠️ Jika memakai satuan kedua, isi nama dan konversinya dengan benar.")
        return
      }

      harga_per_satuan_kedua = parseFloat(hargaPerInput.value)
    }

    // Susun data untuk disimpan
    const dataBahan = {
      nama,
      jumlah_awal,
      satuan_awal,
      harga_total,
      satuan_kedua,
      konversi,
      harga_per_satuan_kedua
    }

    console.log("📝 Data siap simpan:", dataBahan)

    // Simpan ke Supabase
    const { error } = await supabase.from("bahan").insert([dataBahan])

    if (error) {
      alert("❌ Gagal menyimpan: " + error.message)
      console.error(error)
    } else {
      alert("✅ Bahan berhasil ditambahkan!")
      form.reset()
      opsiSatuanKedua.style.display = "none"
    }
  })
})
