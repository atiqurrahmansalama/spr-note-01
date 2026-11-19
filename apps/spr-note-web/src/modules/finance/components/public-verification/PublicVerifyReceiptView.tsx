import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { financeApi } from '../../../../api/financeApi';
import { ShieldCheckIcon, BanknotesIcon, BuildingLibraryIcon } from '../../../../components/ui/Icons';

export const PublicVerifyReceiptView: React.FC = () => {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptNumber) return;
    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await financeApi.verifyReceiptPublic(receiptNumber, token);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Verification failed. Record not found.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [receiptNumber, token]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Banner Header */}
        <div className={`p-6 text-center text-white ${
          data?.is_valid ? 'bg-emerald-600/90' : 'bg-rose-600/90'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">
            {loading ? 'Verifying Receipt Authenticity...' : data?.is_valid ? 'Verified Genuine Money Receipt' : 'Unverified or Invalid Record'}
          </h2>
          <p className="text-xs text-white/80 mt-1">
            SPR Note Institutional Public Verification Network
          </p>
        </div>

        {/* Verification Body */}
        <div className="p-6 space-y-4 text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-400">Verifying cryptographic signature against database...</span>
            </div>
          ) : error || !data?.is_valid ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center space-y-2">
              <p className="font-semibold">{error || data?.message || 'Invalid or Tampered Receipt'}</p>
              <p className="text-[11px] text-zinc-400">
                The receipt number or security verification token could not be verified in the institutional database.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Receipt Number:</span>
                  <span className="font-mono font-bold text-emerald-400">{data.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Institution:</span>
                  <span className="font-semibold text-zinc-200">{data.institution_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Student Name:</span>
                  <span className="font-bold text-zinc-100">{data.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Student ID / Roll:</span>
                  <span className="font-mono text-zinc-300">{data.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Class:</span>
                  <span className="text-zinc-300">{data.class_name}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Verified Amount Paid</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ৳ {Number(data.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block">Payment Date</span>
                  <span className="font-semibold text-zinc-200">{data.payment_date}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800 text-[10px] text-zinc-500 space-y-1">
                <div className="font-mono truncate">Cryptographic Hash: {data.security_hash}</div>
                <div>Method: {data.payment_method} {data.transaction_ref ? `(${data.transaction_ref})` : ''}</div>
                <div>Status: Genuine Record on Secure Ledger</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 text-center text-[11px] text-zinc-500">
          SPR Note Enterprise Security Engine • Verification ID #{receiptNumber}
        </div>
      </div>
    </div>
  );
};
export default PublicVerifyReceiptView;
