import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Download, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Calendar,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { getApiUrl } from '../../config/api';

/**
 * PaymentHistory Component
 * Displays all payment transactions for vendor
 */
const PaymentHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentsPerPage = 10;

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('vendorToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getApiUrl('subscription/payment-history'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch payment history');
      }

      setPaymentData(data.data);
    } catch (err) {
      console.error('Payment history fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    if (!paymentId) {
      alert('No payment ID available.');
      return;
    }
    
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetch(getApiUrl(`subscription/receipt/${paymentId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!data.success) {
        alert(data.message || 'Failed to generate receipt.');
        return;
      }
      
      const r = data.receipt;
      const receiptHTML = generateReceiptHTML(r);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Pop-up blocked! Please allow pop-ups for this site.');
        return;
      }
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } catch (err) {
      console.error('Receipt download error:', err);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const generateReceiptHTML = (r) => {
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
    const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    const invoiceNo = `INV-${r.paymentId?.slice(-8)?.toUpperCase() || Date.now()}`;
    const logoUrl = window.location.origin + '/logo.png';
    
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${invoiceNo} - SureService</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#f3f4f6;padding:20px;color:#1f2937;line-height:1.6}
.invoice-container{max-width:800px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);overflow:hidden}
.header{background:linear-gradient(135deg,#1f3c5d 0%,#24496f 100%);color:#fff;display:flex;justify-content:space-between;align-items:stretch}
.brand{display:flex;width:50%}
.logo-box{background:#ffffff;padding:40px;width:100%;display:flex;align-items:center;justify-content:center;}
.logo-box img{width:95%;height:auto;max-height:180px;object-fit:contain;display:block;}
.invoice-meta{text-align:right;padding:40px;display:flex;flex-direction:column;justify-content:center;}
.invoice-meta h2{font-size:14px;text-transform:uppercase;letter-spacing:2px;opacity:.9;margin-bottom:8px}
.invoice-meta .invoice-number{font-size:22px;font-weight:700}
.invoice-meta .invoice-date{font-size:14px;opacity:.9;margin-top:8px}
.status-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-top:12px}
.status-badge.success{background:#10b981}
.status-badge::before{content:'';width:8px;height:8px;background:#fff;border-radius:50%}
.content{padding:40px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:40px}
.party{padding:24px;background:#f0f4f8;border-radius:10px;border:1px solid #bfd4e4}
.party h3{font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#1f3c5d;margin-bottom:16px;font-weight:600}
.party p{font-size:15px;margin-bottom:8px}
.party .name{font-weight:600;font-size:17px;color:#1f3c5d}
.table-container{margin-bottom:40px}
.table-header{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;background:#e8f0f8;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#1f3c5d}
.table-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:20px;border-bottom:1px solid #d4dfe8;align-items:center}
.table-row .plan-name{font-weight:600;color:#1f3c5d;font-size:16px}
.table-row .plan-id{font-size:13px;color:#4b5c73;margin-top:4px}
.summary{background:#f0f4f8;border-radius:10px;padding:24px;margin-bottom:40px}
.summary-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #d4dfe8;font-size:15px}
.summary-row:last-child{border:none}
.summary-row.total{border:none;padding-top:16px;margin-top:8px;border-top:2px solid #1f3c5d}
.summary-row.total span:first-child{font-weight:700;font-size:18px;color:#1f3c5d}
.summary-row.total span:last-child{font-weight:700;font-size:24px;color:#1f3c5d}
.bonus-tag{display:inline-block;background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-left:8px}
.payment-info{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:40px}
.payment-item{padding:20px;background:#f0f4f8;border-radius:10px;text-align:center;border:1px solid #bfd4e4}
.payment-item .label{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#1f3c5d;margin-bottom:8px}
.payment-item .value{font-size:15px;font-weight:600;color:#1f3c5d;word-break:break-all}
.footer{background:#f0f4f8;padding:30px 40px;border-top:1px solid #bfd4e4}
.footer-content{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.footer-brand h4{font-size:18px;font-weight:700;color:#1f3c5d;margin-bottom:8px}
.footer-brand p{font-size:13px;color:#4b5c73}
.footer-contact p{font-size:13px;color:#4b5c73;text-align:right}
.footer-note{text-align:center;padding-top:20px;border-top:1px solid #bfd4e4;color:#6b7a8f;font-size:12px}
.actions{display:flex;justify-content:center;gap:16px;margin-bottom:20px}
.btn{padding:12px 32px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .2s}
.btn-primary{background:#1f3c5d;color:#fff}
.btn-primary:hover{background:#173047}
.btn-secondary{background:#fff;color:#1f3c5d;border:2px solid #1f3c5d}
.btn-secondary:hover{background:#f0f4f8}
@media print{body{background:#fff;padding:0}.invoice-container{box-shadow:none}.actions{display:none}.footer-note{margin-top:20px}}
</style></head><body>
<div class="invoice-container">
  <div class="header">
    <div class="brand">
      <div class="logo-box"><img src="${logoUrl}" alt="SureService"></div>
    </div>
    <div class="invoice-meta">
      <h2>Tax Invoice</h2>
      <div class="invoice-number">${invoiceNo}</div>
      <div class="invoice-date">${formatDate(r.date)} at ${formatTime(r.date)}</div>
      <div class="status-badge success">PAID</div>
    </div>
  </div>
  
  <div class="content">
    <div class="parties">
      <div class="party">
        <h3>From</h3>
        <p class="name">SURESERVICE PRIVATE LIMITED</p>
        <p>info@sureservice.com</p>
      </div>
      <div class="party">
        <h3>Bill To</h3>
        <p class="name">${r.vendorName || 'Vendor'}</p>
        <p>${r.vendorEmail || 'N/A'}</p>
        <p>Registered Vendor</p>
      </div>
    </div>
    
    <div class="table-container">
      <div class="table-header">
        <span>Description</span>
        <span>Duration</span>
        <span>Type</span>
        <span style="text-align:right">Amount</span>
      </div>
      <div class="table-row">
        <div>
          <div class="plan-name">${r.planName || 'Subscription Plan'}</div>
          <div class="plan-id">Plan: ${r.planKey || 'N/A'}</div>
        </div>
        <div>${r.durationDays || 30} days${r.bonusDays ? '<span class="bonus-tag">+' + r.bonusDays + ' bonus</span>' : ''}</div>
        <div>${r.type === 'first-purchase' ? 'First Purchase' : r.type === 'renewal' ? 'Renewal' : r.type === 'upgrade' ? 'Upgrade' : 'Purchase'}</div>
        <div style="text-align:right;font-weight:600;font-size:17px">₹${(r.amount || 0).toLocaleString('en-IN')}</div>
      </div>
    </div>
    
    <div class="summary">
      <div class="summary-row"><span>Subtotal</span><span>₹${(r.amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="summary-row"><span>Tax (Inclusive)</span><span>₹0.00</span></div>
      <div class="summary-row"><span>Discount</span><span>₹0.00</span></div>
      <div class="summary-row total"><span>Total Amount</span><span>₹${(r.amount || 0).toLocaleString('en-IN')}</span></div>
    </div>
    
    <div class="payment-info">
      <div class="payment-item">
        <div class="label">Payment ID</div>
        <div class="value">${r.paymentId || 'N/A'}</div>
      </div>
      <div class="payment-item">
        <div class="label">Order ID</div>
        <div class="value">${r.orderId || 'N/A'}</div>
      </div>
      <div class="payment-item">
        <div class="label">Payment Method</div>
        <div class="value">Razorpay</div>
      </div>
    </div>
    
    <div class="actions">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
        Print Invoice
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
  
  <div class="footer">
    <div class="footer-content">
      <div class="footer-brand">
        <h4>SURESERVICE PLATFORM PVT. LTD.</h4>
        <p>Your trusted service provider marketplace</p>
      </div>
      <div class="footer-contact">
        <p>info@sureservice.com</p>
        <p>www.sureservice.com</p>
      </div>
    </div>
    <div class="footer-note">
      <p>This is a computer-generated invoice and does not require a physical signature.</p>
      <p style="margin-top:8px">Thank you for choosing SureService Platform!</p>
    </div>
  </div>
</div>
</body></html>`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const styles = {
      registration: 'bg-blue-100 text-blue-800',
      upgrade: 'bg-purple-100 text-purple-800',
      renewal: 'bg-indigo-100 text-indigo-800'
    };

    const icons = {
      registration: <CreditCard className="w-3 h-3 mr-1" />,
      upgrade: <TrendingUp className="w-3 h-3 mr-1" />,
      renewal: <RefreshCw className="w-3 h-3 mr-1" />
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {icons[type]}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const paymentHistory = paymentData?.paymentHistory || [];
  const paymentTotalPages = Math.max(1, Math.ceil(paymentHistory.length / paymentsPerPage));
  const safePaymentPage = Math.min(paymentPage, paymentTotalPages);
  const paymentStartIndex = (safePaymentPage - 1) * paymentsPerPage;
  const paginatedPayments = paymentHistory.slice(paymentStartIndex, paymentStartIndex + paymentsPerPage);

  useEffect(() => {
    setPaymentPage(1);
  }, [paymentData?.paymentHistory?.length]);

  useEffect(() => {
    if (paymentPage > paymentTotalPages) {
      setPaymentPage(paymentTotalPages);
    }
  }, [paymentPage, paymentTotalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <p className="text-red-800 font-medium mb-2">Failed to load payment history</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={fetchPaymentHistory}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!paymentData || paymentData.paymentHistory.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment History</h3>
        <p className="text-gray-600">You haven't made any payments yet</p>
      </div>
    );
  }

  return (
    <div className="vendor-payment-history space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 text-sm font-medium">Total Payments</span>
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{paymentData.totalPayments}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-600 text-sm font-medium">Total Amount Paid</span>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">₹{paymentData.totalAmountPaid.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-600 text-sm font-medium">Business Name</span>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-blue-900 truncate">{paymentData.businessName}</p>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Payment History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.map((payment, index) => (
                <tr key={payment.paymentId || index} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-gray-900">
                    {paymentStartIndex + index + 1}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center text-xs text-gray-900">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                      {formatDate(payment.paymentDate)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{payment.planName}</div>
                    <div className="text-xs text-gray-500">{payment.planKey}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getTypeBadge(payment.type)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-xs font-semibold text-gray-900">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      {payment.paymentId?.substring(0, 16)}...
                    </code>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                    {payment.status === 'success' && (
                      <button
                        onClick={() => downloadReceipt(payment.paymentId)}
                        className="inline-flex items-center px-2.5 py-1 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition text-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paymentHistory.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-600">
              Showing {paymentStartIndex + 1} to {Math.min(paymentStartIndex + paymentsPerPage, paymentHistory.length)} of {paymentHistory.length} payments
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                disabled={safePaymentPage === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: paymentTotalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (paymentTotalPages <= 7) return true;
                    return page === 1 || page === paymentTotalPages || Math.abs(page - safePaymentPage) <= 1;
                  })
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-1 text-gray-400 text-xs">...</span>
                      )}
                      <button
                        onClick={() => setPaymentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          safePaymentPage === page
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button
                onClick={() => setPaymentPage((p) => Math.min(paymentTotalPages, p + 1))}
                disabled={safePaymentPage === paymentTotalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Notes Section */}
        {paymentHistory.some(p => p.notes) && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Notes</h3>
            <div className="space-y-2">
              {paymentHistory
                .filter(p => p.notes)
                .map((payment, index) => (
                  <div key={index} className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-medium text-gray-900">{formatDate(payment.paymentDate)}:</span> {payment.notes}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
