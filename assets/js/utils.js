// assets/js/utils.js

// Helper function untuk mengambil Jam (00-23) dari timestamp yang tersimpan
export function getHour(timestamp) {
    if (!timestamp) return null;
    try {
        // Parsing string (paling andal untuk data datetime-local)
        const timePart = timestamp.split('T')[1];
        if (timePart) {
            return parseInt(timePart.split(':')[0], 10);
        }
    } catch (e) {
        console.error("Gagal parse jam:", e);
    }
    // Fallback
    const date = new Date(timestamp);
    return date.getHours(); 
}