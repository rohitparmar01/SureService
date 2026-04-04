/**
 * Vendor Subscription Manager
 * One-time payment model — no autopay, no auto-renewal
 * Shows current plan, expiry, and separate renew/change-plan options
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Calendar, CheckCircle, TrendingUp, Download,
  AlertCircle, Loader, Crown, Zap, Star, ArrowRight, X, Clock
} from 'lucide-react';
import Button from '../Button';
import { getApiUrl } from '../../config/api';

const API_BASE_URL = getApiUrl();
const YEARLY_DISCOUNT = 0.17;
const getYearlyPrice = (monthlyPrice) => Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT));

const VendorSubscriptionManager = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const vendorToken = localStorage.getItem('authToken') || localStorage.getItem('vendorToken');

  const availablePlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 499,
      icon: Zap,
      color: 'blue',
      features: [
        'Verified vendor badge',
        'Portfolio: Up to 15 media files',
        'Improved placement in search results',
        'Category + location SEO optimization',
        'Profile reviewed & managed by SureService team'
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 999,
      icon: TrendingUp,
      color: 'indigo',
      popular: true,
      features: [
        'Portfolio: Up to 30 media files',
        'Everything in Starter',
        'Higher ranking in category searches',
        'Featured placement in recommended vendors',
        'Portfolio enhancement',
        'Basic social media promotion'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1499,
      icon: Crown,
      color: 'purple',
      features: [
        'Unlimited media uploads',
        'Top-tier visibility in search results',
        'Premium verified badge',
        'Social media shoutouts & promotions',
        'Dedicated profile optimization',
        'Priority placement during high-demand searches'
      ]
    }
  ];

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    if (showPlanModal) {
      setBillingCycle(subscription?.billingCycle || 'monthly');
    }
  }, [showPlanModal, subscription?.billingCycle]);

  const loadSubscription = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/status`, {
        headers: { 'Authorization': `Bearer ${vendorToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
      } else {
        setError(data.message || 'Failed to load subscription');
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (planKey, selectedCycle = billingCycle) => {
    setPurchasing(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planKey, billingCycle: selectedCycle })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to create order');

      if (!window.Razorpay) throw new Error('Razorpay SDK not loaded. Please refresh the page.');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'SureService',
        description: data.hasBonus
          ? `${data.planName} — ${data.baseDays} + ${data.bonusDays} FREE = ${data.totalDays} days`
          : `${data.planName} — ${data.baseDays} days`,
        handler: async function(paymentResponse) {
          await verifyPayment(paymentResponse, planKey, selectedCycle);
        },
        theme: { color: '#4F46E5' },
        modal: {
          ondismiss: function() {
            setPurchasing(false);
            setError('Payment cancelled');
            fetch(`${API_BASE_URL}/subscription/cancel-order-auth`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${vendorToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderId })
            }).catch(() => {});
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response) {
        setError(`Payment failed: ${response.error.description}`);

        const failedOrderId = response?.error?.metadata?.order_id || data.orderId;
        const failedPaymentId = response?.error?.metadata?.payment_id || null;
        fetch(`${API_BASE_URL}/subscription/mark-failed-auth`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${vendorToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: failedOrderId,
            paymentId: failedPaymentId,
            error: {
              code: response?.error?.code,
              description: response?.error?.description,
              source: response?.error?.source,
              reason: response?.error?.reason
            }
          })
        }).catch(() => {});

        setPurchasing(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to initiate payment');
      setPurchasing(false);
    }
  };

  const verifyPayment = async (paymentResponse, planKey, selectedCycle = billingCycle) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/verify-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          planKey,
          billingCycle: selectedCycle
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowPlanModal(false);
        await loadSubscription();
        // Merge fresh data from verify response to ensure lastPayment fields update
        if (data.subscription) {
          setSubscription(prev => ({ ...prev, ...data.subscription }));
        } else if (data.queued) {
          setSubscription(prev => ({
            ...prev,
            lastPaymentId: paymentResponse.razorpay_payment_id,
            lastPaymentDate: new Date().toISOString(),
          }));
        }
        // Check if plan was queued or instantly activated
        if (data.queued && data.upcomingPlan) {
          alert(data.message || `🎉 ${data.upcomingPlan.planName} purchased! It will activate on ${new Date(data.upcomingPlan.scheduledStartDate).toLocaleDateString('en-IN')} when your current plan expires.`);
        } else {
          alert(data.hasBonus
            ? `🎉 ${data.subscription.planName} activated! You got 30 days FREE bonus — ${data.totalDays} days total.`
            : `✅ ${data.subscription.planName} activated for ${data.totalDays} days.`
          );
        }
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setPurchasing(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    if (!paymentId) {
      alert('No payment ID available. Please try again later.');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/receipt/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${vendorToken}` }
      });
      const data = await response.json();
      
      if (!data.success) {
        alert(data.message || 'Failed to generate receipt. Payment may not be found.');
        return;
      }
      
      const r = data.receipt;
      const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
      const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
      const invoiceNo = `INV-${r.paymentId?.slice(-8)?.toUpperCase() || Date.now()}`;
      const logoUrl = window.location.origin + '/logo.png';
      
      const receiptHTML = `<!DOCTYPE html>
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

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Pop-up blocked! Please allow pop-ups for this site to download receipts.');
        return;
      }
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } catch (err) {
      console.error('Download receipt error:', err);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isFree = subscription?.isFree ?? (!subscription?.planKey || subscription?.planKey === 'free');

  // Always recompute from expiryDate client-side — server value can be stale between refreshes
  const daysRemaining = subscription?.expiryDate
    ? Math.max(0, Math.ceil((new Date(subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : (subscription?.daysRemaining ?? 0);

  // Derive isActive/isExpired from live daysRemaining, not just server flags
  const isActive = !isFree && (subscription?.isActive || subscription?.status === 'active') && daysRemaining > 0;
  const isExpired = !isFree && !isActive && (subscription?.isExpired || subscription?.status === 'expired' || (subscription?.expiryDate && daysRemaining <= 0));
  const currentPlan = availablePlans.find(p => p.id === subscription?.planKey);
  const bonusUsed = subscription?.firstPaidBonusUsed;

  return (
    <div className="vendor-subscription-manager space-y-6">
      {/* Main Card */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-5 sm:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 text-white mb-2">
                <Crown className="w-7 h-7" />
                <h2 className="text-2xl font-bold">My Plan</h2>
              </div>
              <p className="text-indigo-100 text-sm">Manage your subscription and billing</p>
            </div>
            <div>
              <span
                role="status"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-lg ${
                  isExpired ? 'bg-red-500 text-white' : 'text-white'
                }`}
                style={isActive ? { backgroundColor: 'rgba(255,255,255,0.16)', color: '#ffffff' } : undefined}
              >
                {isActive ? '✅ ACTIVE' : isExpired ? '⏰ EXPIRED' : 'FREE PLAN'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* ===== ACTIVE PAID PLAN ===== */}
          {isActive && currentPlan && (
            <>
              {/* Countdown Banner */}
              <div className={`relative rounded-2xl p-6 text-white shadow-xl`} style={{ background: daysRemaining <= 7 ? 'linear-gradient(90deg, #d9534f 0%, #f6a623 100%)' : 'linear-gradient(90deg, var(--premium-blue) 0%, #24496f 100%)' }}>
                <div className="relative sm:absolute sm:top-3 sm:right-3 mb-3 sm:mb-0 self-start sm:self-auto">
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: '#ffffff' }} className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border-2" aria-hidden>
                    <span className="font-black text-lg sm:text-2xl tracking-tight whitespace-nowrap">
                      {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.16)' }} className="p-3 rounded-xl">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-0 sm:pr-32">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2">
                      {daysRemaining <= 7 ? '⚠️ Plan Expiring Soon!' : `${subscription.planName} Plan Active`}
                    </h3>
                    <p className="text-white text-opacity-95 leading-relaxed">
                      {daysRemaining <= 7
                        ? `Your ${subscription.planName} plan expires on ${formatDate(subscription.expiryDate)}. Renew now to keep all your features.`
                        : `You have ${daysRemaining} days remaining. Plan expires on ${formatDate(subscription.expiryDate)}.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Plan Card */}
              <div className="bg-white rounded-xl border-2 border-indigo-300 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b-2 border-indigo-200">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {React.createElement(currentPlan.icon, { className: `w-6 h-6 text-${currentPlan.color}-600` })}
                    Current Plan — {subscription.planName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">One-time purchase · No auto-renewal</p>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plan</div>
                      <div className="text-2xl font-bold text-gray-900">{subscription.planName}</div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mt-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" /> Active
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount Paid</div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        ₹{subscription.lastPaymentAmount}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">One-time payment</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</div>
                      <div className="text-xl font-bold text-gray-900">{formatDate(subscription.startDate)}</div>
                      <div className="text-sm text-gray-600 mt-1">Activation date</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expiry Date</div>
                      <div className={`text-xl font-bold ${daysRemaining <= 7 ? 'text-red-600' : 'text-purple-600'}`}>
                        {formatDate(subscription.expiryDate)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{daysRemaining} days remaining</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Active Features:</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {currentPlan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* No auto-renewal notice */}
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span className="font-bold text-amber-900">No Auto-Renewal</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      Your plan will expire on <strong>{formatDate(subscription.expiryDate)}</strong>. 
                      After expiry, your profile will be downgraded to the Free plan. 
                      You can renew or upgrade anytime before or after expiry.
                    </p>
                  </div>
                </div>
              </div>

              {/* ===== UPCOMING PLAN (QUEUED) ===== */}
              {subscription.hasUpcomingPlan && subscription.upcomingPlan && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-xl">
                  <div className="flex items-start gap-4">
                    <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-xl">
                      <Clock className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">🎉 Upcoming Plan Queued</h3>
                        <span className="bg-white bg-opacity-20 text-xs font-bold px-2 py-1 rounded-full">PAID</span>
                      </div>
                      <p className="text-emerald-100 text-sm leading-relaxed">
                        Your <strong>{subscription.upcomingPlan.planName}</strong> plan (₹{subscription.upcomingPlan.amount}) is queued and will 
                        automatically activate on <strong>{new Date(subscription.upcomingPlan.scheduledStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> when 
                        your current plan expires.
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                          📅 Duration: {subscription.upcomingPlan.totalDays} days
                          {subscription.upcomingPlan.bonusDays > 0 && ` (includes ${subscription.upcomingPlan.bonusDays} bonus)`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Renew / Change Plan Buttons — hide if already have upcoming plan */}
              {!subscription.hasUpcomingPlan && (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      {daysRemaining <= 7 ? '⚠️ Renew or Switch Before Expiry!' : 'Manage Your Paid Plan'}
                    </h3>
                    <p className="text-indigo-100 text-sm">
                      {daysRemaining <= 7
                        ? 'Your plan is about to expire. Renew or switch plans now to avoid losing features.'
                        : 'Renew your current plan, or switch to any other paid plan (upgrade or downgrade).'
                      }
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handlePurchase(subscription.planKey, subscription?.billingCycle || 'monthly')}
                      disabled={purchasing}
                      size="lg"
                      variant="outline"
                      className="bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:!text-white hover:[&_svg]:text-white hover:!border-white transition-all duration-200 ease-in-out flex items-center gap-2 shadow-lg"
                    >
                      <CreditCard className="w-5 h-5" />
                      Renew ₹{subscription.lastPaymentAmount}
                    </Button>
                    <Button
                      onClick={() => setShowPlanModal(true)}
                      size="lg"
                      variant="outline"
                      className="bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:!text-white hover:[&_svg]:text-white hover:!border-white transition-all duration-200 ease-in-out flex items-center gap-2 shadow-lg"
                    >
                      <Star className="w-5 h-5" />
                      Change Plan
                    </Button>
                  </div>
                </div>
              </div>
              )}
            </>
          )}

          {/* ===== EXPIRED PLAN ===== */}
          {isExpired && (
            <>
              <div className="relative bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-xl">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">⏰ Plan Expired</h3>
                    <p className="text-white text-opacity-95 leading-relaxed">
                      Your <strong>{subscription.planName}</strong> plan expired on <strong>{formatDate(subscription.expiryDate)}</strong>. 
                      Your profile has been downgraded to the Free plan. Renew or choose a new plan to restore all features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Previous Plan Info */}
              <div className="bg-white rounded-xl border-2 border-red-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b-2 border-red-200">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    Previous Plan — {subscription.planName} (Expired)
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plan</div>
                      <div className="text-2xl font-bold text-gray-900">{subscription.planName}</div>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold mt-2">
                        <AlertCircle className="w-4 h-4" /> Expired
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Was Active From</div>
                      <div className="text-xl font-bold text-gray-900">{formatDate(subscription.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expired On</div>
                      <div className="text-xl font-bold text-red-600">{formatDate(subscription.expiryDate)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Re-subscribe CTA */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Reactivate Your Plan</h3>
                    <p className="text-indigo-100 text-sm">Choose a plan to restore all your features and visibility</p>
                  </div>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Star className="w-5 h-5" />
                    Choose a Plan
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== FREE PLAN ===== */}
          {isFree && !isExpired && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 border-b-2 border-gray-300">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-gray-600" />
                  Free Plan — Unlisted Vendor
                </h3>
              </div>
              <div className="p-8">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Free Plan</h3>
                  <p className="text-gray-600 mb-6 text-center">Entry-level presence with organic discovery</p>

                  <div className="bg-green-50 rounded-lg p-5 mb-4">
                    <div className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Included:
                    </div>
                    <ul className="space-y-2.5">
                      {['Platform registration', 'Service & city listing', 'Portfolio: Up to 5 images (no videos)', 'Appears in general search results', 'Discoverable via category & location'].map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-50 rounded-lg p-5 mb-6">
                    <div className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <X className="w-5 h-5" /> Not Included:
                    </div>
                    <ul className="space-y-2.5">
                      {['Verified badge', 'Priority visibility', 'Marketing push'].map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bonus Banner */}
                  {!bonusUsed && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500 rounded-full p-2">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-green-900">🎁 First Purchase Bonus: 30 Days FREE!</h4>
                          <p className="text-sm text-green-700">
                            On your first paid purchase, get <strong>30 extra days FREE</strong>. Monthly becomes 60 days total, yearly becomes 395 days total.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Star className="w-5 h-5" />
                    Choose a Plan & Get Started
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== PAYMENT RECEIPT ===== */}
          {subscription?.lastPaymentId && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
              <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, var(--premium-blue) 0%, #24496f 100%)' }}>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white" /> Last Payment
                </h3>
                <button
                  onClick={() => downloadReceipt(subscription.lastPaymentId)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out shadow-md hover:[&_svg]:text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: '#ffffff' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)')}
                >
                  <Download className="w-4 h-4 text-white" />
                  Download Receipt
                </button>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Transaction ID</div>
                    <div className="font-mono text-sm font-bold text-gray-900 break-all">
                      {subscription.lastPaymentId.length > 20 ? subscription.lastPaymentId.substring(0, 20) + '...' : subscription.lastPaymentId}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Amount Paid</div>
                    <div className="text-2xl font-bold text-blue-600">₹{subscription.lastPaymentAmount}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Payment Date</div>
                    <div className="text-sm font-bold text-gray-900">{formatDate(subscription.lastPaymentDate)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Status</div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--premium-blue)] text-white rounded-full text-sm font-bold shadow-sm">
                      <CheckCircle className="w-4 h-4 text-white" /> PAID
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== PLAN SELECTION MODAL ===== */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 flex items-center justify-between z-10 page-subheader">
              <div>
                <h2 className="text-3xl font-bold text-white">Choose Your Plan</h2>
                <p className="text-indigo-100 mt-1">
                  {!bonusUsed
                    ? '🎁 Get 30 days FREE bonus with your first purchase!'
                    : 'Select monthly or yearly billing — no auto-renewal'
                  }
                </p>
              </div>
              <button
                onClick={() => { setShowPlanModal(false); setError(''); }}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Bonus Banner */}
            {!bonusUsed && (
              <div className="mx-8 mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-green-900">🎁 First Purchase Bonus: 30 Days FREE!</h4>
                    <p className="text-sm text-green-700">
                      Applies on your first paid plan for both monthly and yearly billing. You get <strong>+30 days FREE</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-8 mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3 text-red-800">
                  <AlertCircle className="w-6 h-6" />
                  <span className="font-semibold">{error}</span>
                </div>
              </div>
            )}

            <div className="mx-8 mt-6 inline-flex items-center gap-1 p-1 bg-gray-100 rounded-full border border-gray-200">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
              </button>
              <span className="ml-1 px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                Save 17%
              </span>
            </div>

            {/* Plans Grid */}
            <div className="p-8 grid md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => {
                const Icon = plan.icon;
                const currentBillingCycle = subscription?.billingCycle || 'monthly';
                const isSamePlanAndCycle = plan.id === subscription?.planKey && currentBillingCycle === billingCycle;
                const isCurrentPlan = isSamePlanAndCycle && isActive;
                const canPurchase = !isCurrentPlan;
                const isRenewal = isSamePlanAndCycle;
                const effectivePrice = billingCycle === 'yearly' ? getYearlyPrice(plan.price) : plan.price;
                const baseDays = billingCycle === 'yearly' ? 365 : 30;
                const bonusDays = !bonusUsed ? 30 : 0;
                const totalDays = baseDays + bonusDays;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-6 transition-all transform hover:scale-105 ${
                      plan.popular
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl scale-105 border-4 border-yellow-400'
                        : isCurrentPlan
                        ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-400'
                        : 'bg-white border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-yellow-400 text-gray-900 px-4 py-1.5 rounded-full text-xs font-black shadow-lg animate-pulse flex items-center gap-1">
                          <Star className="w-3 h-3" /> MOST POPULAR
                        </span>
                      </div>
                    )}

                    {isCurrentPlan && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> YOUR PLAN
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                        plan.popular ? 'bg-white bg-opacity-20' : isCurrentPlan ? 'bg-green-500' : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                      }`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`text-2xl font-bold mb-3 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.name}
                      </h3>
                      <div className={`mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                        <span className="text-4xl font-black">₹{effectivePrice}</span>
                        <span className={`text-base ml-2 ${plan.popular ? 'text-white text-opacity-90' : 'text-gray-600'}`}>
                          /{billingCycle === 'yearly' ? 'year' : '30 days'}
                        </span>
                      </div>

                      {billingCycle === 'yearly' && (
                        <p className={`text-xs ${plan.popular ? 'text-white text-opacity-90' : 'text-green-700'} font-semibold mb-2`}>
                          Monthly equivalent: ₹{Math.round(effectivePrice / 12)}/month
                        </p>
                      )}
                      
                      {!bonusUsed && canPurchase && billingCycle === 'monthly' && (
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                          plan.popular ? 'bg-yellow-400 text-gray-900' : 'bg-green-500 text-white'
                        }`}>
                          🎁 Get {totalDays} days (30 + 30 FREE)
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-2 text-sm ${plan.popular ? 'text-white' : 'text-gray-700'}`}>
                          <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-yellow-300' : 'text-green-500'}`} />
                          <span className="font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => canPurchase && handlePurchase(plan.id, billingCycle)}
                      disabled={!canPurchase || purchasing}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isCurrentPlan
                          ? 'bg-green-600 text-white cursor-default'
                          : canPurchase
                          ? plan.popular
                            ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {purchasing ? (
                        <><Loader className="w-5 h-5 animate-spin" /> Processing...</>
                      ) : isCurrentPlan ? (
                        <><CheckCircle className="w-5 h-5" /> Current Plan</>
                      ) : isRenewal ? (
                        <><CreditCard className="w-5 h-5" /> Renew — ₹{effectivePrice}</>
                      ) : canPurchase ? (
                        <>
                          <ArrowRight className="w-5 h-5" />
                          {isActive
                            ? `Switch Plan — ₹${effectivePrice}`
                            : !bonusUsed && billingCycle === 'monthly'
                              ? `Get ${totalDays} Days — ₹${effectivePrice}`
                              : `Buy — ₹${effectivePrice}`}
                        </>
                      ) : (
                        'Not Available'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Info Note */}
            <div className="px-8 pb-8">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  <strong>How it works:</strong> Each plan is a one-time payment for its selected term (monthly or yearly). 
                  No auto-renewal — you manually renew when you want. 
                  {!bonusUsed && ' First-time buyers get 30 extra days FREE on their first paid purchase.'}
                  {' '}After expiry, your profile will be downgraded to the Free plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSubscriptionManager;
