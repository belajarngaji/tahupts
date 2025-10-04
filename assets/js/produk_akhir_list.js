// assets/js/produk_akhir_list.js

import { supabase } from './supabase.js';

const productListBody = document.getElementById('productListBody');
const message = document.getElementById('message');

const loadProductList = async () => {
    message.textContent = 'Mengambil data produk akhir...';

    // Ambil data dari tabel produk_akhir
    const { data, error } = await supabase
        .from('produk_akhir')
        .select('nama_produk, satuan_jual, harga_jual_default, hpp_per_unit, target_margin')
        .order('nama_produk', { ascending: true });

    if (error) {
        message.textContent = `❌ Gagal memuat data: ${error.message}`;
        productListBody.innerHTML = '<tr><td colspan="6">Error memuat data.</td></tr>';
        console.error(error);
        return;
    }

    if (data.length === 0) {
        message.textContent = 'Tidak ada Produk Akhir yang terdaftar.';
        productListBody.innerHTML = '<tr><td colspan="6">Tidak ada data produk.</td></tr>';
        return;
    }

    productListBody.innerHTML = '';
    
    data.forEach(product => {
        const hpp = parseFloat(product.hpp_per_unit) || 0;
        const hargaJual = parseFloat(product.harga_jual_default) || 0;
        const marginTarget = parseFloat(product.target_margin) || 0;
        
        let actualMargin = 0;
        let marginStatus = 'N/A';
        let statusClass = '';

        if (hargaJual > 0 && hpp > 0) {
            actualMargin = ((hargaJual - hpp) / hargaJual) * 100;
            
            if (hargaJual < hpp) {
                marginStatus = 'RUGI';
                statusClass = 'hpp-high';
            } else if (marginTarget > 0 && actualMargin < marginTarget) {
                marginStatus = `Di bawah target ${marginTarget.toFixed(0)}%`;
                statusClass = '';
            } else {
                marginStatus = `TARGET TERCAPAI (${actualMargin.toFixed(1)}%)`;
                statusClass = 'hpp-low';
            }
        } else if (hpp > 0 && hargaJual === 0) {
            marginStatus = 'BELUM ADA HARGA JUAL';
        }


        const row = productListBody.insertRow();
        
        row.insertCell().textContent = product.nama_produk;
        row.insertCell().textContent = product.satuan_jual;
        
        // HPP
        row.insertCell().textContent = `Rp${hpp.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
        
        // Harga Jual
        row.insertCell().textContent = `Rp${hargaJual.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
        
        // Margin Target
        row.insertCell().textContent = `${marginTarget.toFixed(0)}%`;
        
        // Status Margin
        const statusCell = row.insertCell();
        statusCell.textContent = marginStatus;
        statusCell.className = statusClass;
    });

    message.textContent = `✅ ${data.length} produk akhir berhasil dimuat.`;
};

document.addEventListener('DOMContentLoaded', loadProductList);