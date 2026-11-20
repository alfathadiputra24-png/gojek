import React from 'react';
import { Banknote, QrCode, Ticket, Wallet } from 'lucide-react';

export type PaymentMethodType = 'qris' | 'ewallet' | 'cod';

const EWALLETS = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'] as const;

interface PaymentPickerProps {
  method: PaymentMethodType;
  onMethodChange: (m: PaymentMethodType) => void;
  ewalletProvider: string;
  onEwalletChange: (p: string) => void;
  voucherCode: string;
  onVoucherChange: (code: string) => void;
  suggestedVoucher?: string;
  phone: string;
  onPhoneChange: (p: string) => void;
  address: string;
  onAddressChange?: (a: string) => void;
  showAddressInput?: boolean;
}

export const PaymentPicker: React.FC<PaymentPickerProps> = ({
  method,
  onMethodChange,
  ewalletProvider,
  onEwalletChange,
  voucherCode,
  onVoucherChange,
  suggestedVoucher,
  phone,
  onPhoneChange,
  address,
  onAddressChange,
  showAddressInput = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Voucher */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-[#0FA958]" />
            <span>Kode Voucher</span>
          </span>
          {suggestedVoucher && voucherCode.toUpperCase() !== suggestedVoucher && (
            <button
              type="button"
              onClick={() => onVoucherChange(suggestedVoucher)}
              className="text-[11px] font-bold text-[#0FA958] hover:underline"
            >
              Pakai {suggestedVoucher}
            </button>
          )}
        </div>
        <input
          type="text"
          value={voucherCode}
          onChange={(e) => onVoucherChange(e.target.value.toUpperCase())}
          placeholder="Contoh: JALAN7K, HEMAT25, MAKAN50"
          className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-semibold uppercase"
        />
      </div>

      {/* Payment method */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
        <span className="text-xs font-bold block">Metode Pembayaran</span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'qris' as const, label: 'QRIS', Icon: QrCode },
            { id: 'ewallet' as const, label: 'E-Wallet', Icon: Wallet },
            { id: 'cod' as const, label: 'COD', Icon: Banknote },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onMethodChange(id)}
              className={`min-h-[48px] rounded-xl border p-2 flex flex-col items-center justify-center gap-1 text-xs font-bold transition-colors ${
                method === id
                  ? 'border-[#0FA958] bg-emerald-50 dark:bg-emerald-950/60 text-[#0FA958]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {method === 'ewallet' && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {EWALLETS.map((ew) => (
              <button
                key={ew}
                type="button"
                onClick={() => onEwalletChange(ew)}
                className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  ewalletProvider === ew
                    ? 'bg-[#0FA958] text-white border-[#0FA958]'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {ew}
              </button>
            ))}
          </div>
        )}

        {method === 'cod' && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
              Pembayaran tunai saat kurir/driver tiba membutuhkan alamat dan nomor HP aktif.
            </p>
            {showAddressInput && onAddressChange && (
              <input
                type="text"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="Alamat lengkap penerima"
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
              />
            )}
            <input
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="Nomor HP aktif (mis. +62812...)"
              className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
};
