import { jsPDF } from 'jspdf';
import { BRAND_NAME, formatRupiah } from '../config/brand';

export interface ReceiptData {
  orderId: string;
  title: string;
  itemsSummary: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
  voucherCode?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  driverName?: string;
  createdAt: number;
}

export function downloadOrderReceiptPdf(order: ReceiptData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();

  // Emerald header bar
  doc.setFillColor(15, 169, 88);
  doc.rect(0, 0, w, 74, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(BRAND_NAME, 28, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Struk Elektronik Resmi (E-Receipt)', 28, 54);

  doc.setTextColor(30, 41, 59);
  let y = 104;

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 28, y);
    doc.setTextColor(15, 23, 42);
    doc.text(value, w - 28, y, { align: 'right' });
    y += 20;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(order.title, 28, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const splitSummary = doc.splitTextToSize(order.itemsSummary || '-', w - 56);
  doc.text(splitSummary, 28, y);
  y += splitSummary.length * 13 + 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(28, y, w - 28, y);
  y += 20;

  row('ID Pesanan', order.orderId);
  row('Tanggal', new Date(order.createdAt).toLocaleString('id-ID'));
  row('Metode Bayar', order.paymentMethod);
  row('Status Bayar', order.paymentStatus.toUpperCase());
  if (order.driverName) row('Mitra Driver', order.driverName);
  if (order.pickupAddress) row('Jemput', order.pickupAddress.slice(0, 36));
  if (order.dropoffAddress) row('Tujuan', order.dropoffAddress.slice(0, 36));

  y += 6;
  doc.line(28, y, w - 28, y);
  y += 20;

  row('Subtotal', formatRupiah(order.subtotal));
  if (order.discount > 0) {
    row(`Diskon ${order.voucherCode || ''}`, `-${formatRupiah(order.discount)}`);
  }
  row('Biaya Layanan', formatRupiah(order.fee));

  y += 4;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(24, y - 14, w - 48, 30, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 169, 88);
  doc.text('Total Pembayaran', 34, y + 6);
  doc.text(formatRupiah(order.total), w - 34, y + 6, { align: 'right' });

  y += 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Terima kasih telah menggunakan ${BRAND_NAME}. Simpan struk ini sebagai bukti transaksi sah.`, w / 2, y, {
    align: 'center',
  });

  doc.save(`${BRAND_NAME}-Struk-${order.orderId}.pdf`);
}
