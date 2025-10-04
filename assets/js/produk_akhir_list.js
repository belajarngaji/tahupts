// assets/js/produk_akhir_list.js

import { supabase } from './supabase.js';

const productCardContainer = document.getElementById('productCardContainer');
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
        productCardContainer.innerHTML = '<p>Error memuat data.</p>';
        console.error(error);
        return;
    }

    if (data.length === 0) {
        message.textContent = 'Tidak ada Produk Akhir yang terdaftar.';
        productCardContainer.innerHTML = '<p>Tidak ada data produk.</p>';
        return;
    }

    productCardContainer.innerHTML = '';
    
    data.forEach(product => {
        const hpp = parseFloat(product.hpp_per_unit) || 0;
        const hargaJual = parseFloat(product.harga_jual_default) || 0;
        const marginTarget = parseFloat(product.target_margin) || 0;
        
        const labaPerUnit = hargaJual - hpp;
        const labaPerUnitFormatted = labaPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        
        let actualMargin = 0;
        let marginStatusLabel = '';
        let marginStatusClass = '';
        let targetAchievedIcon = '';

        if (hargaJual > 0 && hpp > 0) {
            actualMargin = (labaPerUnit / hargaJual) * 100;
            
            if (labaPerUnit < 0) {
                // RUGI
                marginStatusLabel = 'RUGI';
                marginStatusClass = 'status-loss';
                targetAchievedIcon = `↓ -${Math.abs(actualMargin).toFixed(1)}%`;
            } else if (marginTarget > 0 && actualMargin < marginTarget) {
                // DI BAWAH TARGET
                const marginDiff = marginTarget - actualMargin;
                marginStatusLabel = 'Di Bawah Target';
                marginStatusClass = 'status-neutral';
                targetAchievedIcon = `↓ -${marginDiff.toFixed(1)}%`;
            } else {
                // TARGET TERCAPAI ATAU UNTUNG TANPA TARGET
                marginStatusLabel = 'TARGET TERCAPAI';
                marginStatusClass = 'status-ok';
                targetAchievedIcon = actualMargin > 0 ? `↑ +${(actualMargin - marginTarget).toFixed(1)}%` : '~';
            }
        } else if (hpp > 0 && hargaJual === 0) {
            marginStatusLabel = 'Harga Jual Belum Diatur';
            marginStatusClass = 'status-neutral';
            targetAchievedIcon = 'N/A';
        }

        // --- BUAT ELEMEN CARD ---
        const card = document.createElement('div');
        card.className = 'product-card';
        
        card.innerHTML = `
            <h2>${product.nama_produk}</h2>
            <hr style="border: 0; border-top: 1px solid #ddd;">

            <div class="product-info-group">
                <span>Satuan Jual:</span>
                <strong>${product.satuan_jual}</strong>
            </div>

            <div class="product-info-group">
                <span>HPP:</span>
                <strong>Rp${hpp.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
            </div>

            <div class="product-info-group">
                <span>Harga Jual:</span>
                <strong>Rp${hargaJual.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong>
            </div>

            <div class="product-info-group">
                <span>Margin Target:</span>
                <strong>${marginTarget.toFixed(0)}%</strong>
            </div>
            
            <div class="margin-status-box ${marginStatusClass}">
                <span class="status-main-label">${marginStatusLabel}</span>
                <span>${labaPerUnit < 0 ? '-' : '+'}Rp${Math.abs(labaPerUnitFormatted)}</span>
                <span>${targetAchievedIcon}</span>
            </div>
        `;

        productCardContainer.appendChild(card);
    });

    message.textContent = `✅ ${data.length} produk akhir berhasil dimuat dalam format Katalog.`;
};

document.addEventListener('DOMContentLoaded', loadProductList);