const Transaction = require('../models/Transaction');
const { razorpay } = require('../config/razorpay');

const mapRazorpayStatusToUiStatus = (payment) => {
  const rawStatus = payment?.status;

  if (rawStatus === 'captured') return 'success';
  if (rawStatus === 'refunded') return 'refunded';

  if (rawStatus === 'failed') {
    const reason = `${payment?.error_reason || ''}`.toLowerCase();
    const description = `${payment?.error_description || ''}`.toLowerCase();
    if (reason.includes('cancel') || description.includes('cancel')) return 'cancelled';
    return 'failed';
  }

  return rawStatus || 'unknown';
};

/**
 * Get All Transactions (dynamic filters, search, pagination, sorting)
 * GET /api/admin/transactions
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const {
      status, type, planKey, vendorEmail, method,
      from, to, search,
      page = 1, limit = 50,
      sort = 'createdAt', order = 'desc'
    } = req.query;

    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;
    if (planKey && planKey !== 'all') filter.planKey = planKey;
    if (method && method !== 'all') filter.method = method;
    if (vendorEmail) filter.vendorEmail = { $regex: vendorEmail, $options: 'i' };

    // Date range
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    // Free-text search across key fields
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } },
        { vendorEmail: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { planName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));
    const sortDir = order === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ [sort]: sortDir })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('vendor', 'businessName contact.email vendorId city subscription.planKey subscription.planName subscription.status subscription.startDate subscription.expiryDate subscription.lastPaymentId subscription.lastOrderId subscription.upcomingPlan')
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

/**
 * Get Transaction Stats (aggregated summary)
 * GET /api/admin/transactions/stats
 */
exports.getTransactionStats = async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const [statusAgg, planAgg, methodAgg, typeAgg] = await Promise.all([
      // Count & revenue by status
      Transaction.aggregate([
        { $match: dateFilter },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }}
      ]),
      // Count & revenue by plan
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'paid' } },
        { $group: {
          _id: '$planKey',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }}
      ]),
      // Count by payment method (only paid)
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'paid', method: { $ne: null } } },
        { $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }}
      ]),
      // Count by type
      Transaction.aggregate([
        { $match: dateFilter },
        { $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }}
      ])
    ]);

    // Build summary object from aggregation results
    const byStatus = {};
    let totalRevenue = 0;
    let totalTransactions = 0;
    for (const s of statusAgg) {
      byStatus[s._id] = { count: s.count, amount: s.totalAmount };
      totalTransactions += s.count;
      if (s._id === 'paid') totalRevenue = s.totalAmount;
    }

    const byPlan = {};
    for (const p of planAgg) byPlan[p._id] = { count: p.count, amount: p.totalAmount };

    const byMethod = {};
    for (const m of methodAgg) byMethod[m._id] = { count: m.count, amount: m.totalAmount };

    const byType = {};
    for (const t of typeAgg) byType[t._id] = { count: t.count, amount: t.totalAmount };

    res.json({
      success: true,
      data: {
        totalTransactions,
        totalRevenue,
        byStatus,
        byPlan,
        byMethod,
        byType
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transaction stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transaction stats' });
  }
};

/**
 * Get Single Transaction (full detail including raw Razorpay data)
 * GET /api/admin/transactions/:id
 */
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('vendor', 'businessName contact.email contact.phone vendorId serviceType city subscription.planKey subscription.status')
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transaction' });
  }
};

/**
 * Get Live Transactions directly from Razorpay API (enriched with local metadata when available)
 * GET /api/admin/transactions/razorpay
 */
exports.getRazorpayTransactionsLive = async (req, res) => {
  try {
    const {
      status,
      planKey,
      search,
      from,
      to,
      limit = 100,
      skip = 0
    } = req.query;

    const requestedLimit = Math.min(500, Math.max(1, Number(limit)));
    const offset = Math.max(0, Number(skip));

    const razorpayBaseQuery = {};
    if (from) razorpayBaseQuery.from = Math.floor(new Date(from).getTime() / 1000);
    if (to) razorpayBaseQuery.to = Math.floor(new Date(to).getTime() / 1000);

    const razorpayPayments = [];
    let remaining = requestedLimit;
    let currentSkip = offset;

    while (remaining > 0) {
      const batchCount = Math.min(100, remaining);
      const batch = await razorpay.payments.all({
        ...razorpayBaseQuery,
        count: batchCount,
        skip: currentSkip
      });

      const items = batch?.items || [];
      razorpayPayments.push(...items);

      if (items.length < batchCount) {
        break;
      }

      remaining -= items.length;
      currentSkip += items.length;
    }

    const paymentIds = razorpayPayments.map((p) => p.id).filter(Boolean);
    const orderIds = razorpayPayments.map((p) => p.order_id).filter(Boolean);

    const relatedTransactions = await Transaction.find({
      $or: [
        { paymentId: { $in: paymentIds } },
        { orderId: { $in: orderIds } }
      ]
    })
      .populate('vendor', 'businessName contact.email city subscription.planKey subscription.planName subscription.status subscription.startDate subscription.expiryDate subscription.lastPaymentId subscription.lastOrderId subscription.upcomingPlan')
      .lean();

    const txByPaymentId = new Map();
    const txByOrderId = new Map();
    for (const tx of relatedTransactions) {
      if (tx?.paymentId) txByPaymentId.set(tx.paymentId, tx);
      if (tx?.orderId) txByOrderId.set(tx.orderId, tx);
    }

    const normalizedPayments = razorpayPayments.map((payment) => {
      const tx = txByPaymentId.get(payment.id) || txByOrderId.get(payment.order_id);
      const normalizedStatus = mapRazorpayStatusToUiStatus(payment);

      const now = new Date();
      const subscription = tx?.vendor?.subscription || null;
      const expiryDate = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
      const startDate = subscription?.startDate ? new Date(subscription.startDate) : null;
      const daysRemaining = (subscription?.status === 'active' && expiryDate)
        ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const durationDays = Number(tx?.durationDays || 30);
      const bonusDays = Number(tx?.bonusDays || 0);
      const totalDays = durationDays + bonusDays;

      const isLastPaymentForSubscription = Boolean(
        subscription && (
          subscription?.lastPaymentId === payment.id ||
          subscription?.lastOrderId === payment.order_id
        )
      );

      const upcomingPlan = subscription?.upcomingPlan || null;
      const isQueuedPayment = Boolean(
        upcomingPlan && (
          upcomingPlan?.paymentId === payment.id ||
          upcomingPlan?.orderId === payment.order_id
        )
      );

      return {
        transactionId: tx?._id || null,
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount || 0) / 100,
        currency: payment.currency || 'INR',
        status: normalizedStatus,
        razorpayStatus: payment.status,
        paymentDate: payment.created_at ? new Date(payment.created_at * 1000).toISOString() : null,
        method: payment.method || null,
        bank: payment.bank || null,
        wallet: payment.wallet || null,
        vpa: payment.vpa || null,
        errorCode: payment.error_code || null,
        errorDescription: payment.error_description || null,
        errorReason: payment.error_reason || null,
        planKey: tx?.planKey || payment?.notes?.plan_key || tx?.razorpayOrderData?.notes?.plan_key || null,
        planName: tx?.planName || payment?.notes?.plan_name || tx?.razorpayOrderData?.notes?.plan_name || null,
        vendorEmail: tx?.vendorEmail || tx?.vendor?.contact?.email || payment.email || payment?.notes?.vendor_email || null,
        vendorName: tx?.businessName || tx?.vendor?.businessName || payment?.notes?.business_name || null,
        vendorCity: tx?.vendor?.city || null,
        type: tx?.type || payment?.notes?.type || null,
        durationDays,
        bonusDays,
        totalDays,
        planStartDate: startDate ? startDate.toISOString() : null,
        planExpiryDate: expiryDate ? expiryDate.toISOString() : null,
        daysRemaining,
        subscriptionStatus: subscription?.status || null,
        currentPlanKey: subscription?.planKey || null,
        currentPlanName: subscription?.planName || null,
        isLastPaymentForSubscription,
        isQueuedPayment,
        queuedPlan: isQueuedPayment ? {
          planKey: upcomingPlan?.planKey || null,
          planName: upcomingPlan?.planName || null,
          scheduledStartDate: upcomingPlan?.scheduledStartDate || null,
          durationDays: upcomingPlan?.durationDays || null,
          bonusDays: upcomingPlan?.bonusDays || null
        } : null,
        createdAt: tx?.createdAt || null,
        paidAt: tx?.paidAt || null,
        failedAt: tx?.failedAt || null,
        cancelledAt: tx?.cancelledAt || null,
        refundedAt: tx?.refundedAt || null,
        source: 'razorpay'
      };
    });

    let filtered = normalizedPayments;

    if (status && status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }

    if (planKey && planKey !== 'all') {
      filtered = filtered.filter((p) => p.planKey === planKey);
    }

    if (search) {
      const s = String(search).toLowerCase();
      filtered = filtered.filter((p) =>
        `${p.paymentId || ''}`.toLowerCase().includes(s) ||
        `${p.orderId || ''}`.toLowerCase().includes(s) ||
        `${p.vendorEmail || ''}`.toLowerCase().includes(s) ||
        `${p.vendorName || ''}`.toLowerCase().includes(s)
      );
    }

    const summary = filtered.reduce((acc, p) => {
      acc.totalCount += 1;
      if (p.status === 'success') {
        acc.successCount += 1;
        acc.totalRevenue += Number(p.amount || 0);
      } else if (p.status === 'failed') {
        acc.failedCount += 1;
      } else if (p.status === 'cancelled') {
        acc.cancelledCount += 1;
      } else if (p.status === 'refunded') {
        acc.refundedCount += 1;
      } else {
        acc.otherCount += 1;
      }
      return acc;
    }, {
      totalRevenue: 0,
      successCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      refundedCount: 0,
      otherCount: 0,
      totalCount: 0
    });

    res.json({
      success: true,
      data: {
        payments: filtered,
        summary,
        pagination: {
          limit: requestedLimit,
          skip: offset,
          fetched: razorpayPayments.length,
          returned: filtered.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching live Razorpay transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live Razorpay transactions' });
  }
};

/**
 * Export all payments to Excel
 * GET /api/admin/export/payments
 */
exports.exportPayments = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    const transactions = await Transaction.find()
      .populate('vendor', 'businessName city contact.email')
      .sort({ createdAt: -1 })
      .lean();

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: 'No payment records found to export' });
    }

    const safeVal = (v) => (v === undefined || v === null || v === '') ? 'N/A' : v;

    const formatDateTime = (value) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-IN');
    };

    const formatStatus = (value) => {
      if (!value) return 'Unknown';
      const text = String(value).toLowerCase();
      if (text === 'paid') return 'Success';
      if (text === 'failed') return 'Failed';
      if (text === 'cancelled') return 'Cancelled';
      if (text === 'refunded') return 'Refunded';
      return text.charAt(0).toUpperCase() + text.slice(1);
    };

    const TYPE_LABELS = {
      'first-purchase': 'First Purchase',
      'renewal': 'Renewal',
      'upgrade': 'Upgrade'
    };

    const rows = transactions.map((tx, i) => {
      const rpay = tx.razorpayPaymentData || {};
      const rorder = tx.razorpayOrderData || {};
      const notes = rorder.notes || {};

      // Resolve payment date: paidAt -> razorpayPaymentData.created_at (Unix ts) -> createdAt
      const paymentDate = tx.paidAt
        ? formatDateTime(tx.paidAt)
        : (rpay.created_at ? formatDateTime(rpay.created_at * 1000) : formatDateTime(tx.createdAt));

      const amountValue = Number(tx.amount || (rpay.amount ? rpay.amount / 100 : 0));

      return {
        '#': i + 1,
        'Payment ID': safeVal(tx.paymentId || rpay.id),
        'Order ID': safeVal(tx.orderId || rorder.id),
        'Vendor Name': safeVal(tx.businessName || tx.vendor?.businessName || notes.business_name),
        'Vendor Email': safeVal(tx.vendorEmail || tx.vendor?.contact?.email || rpay.email || notes.vendor_email),
        'City': safeVal(tx.vendor?.city || notes.city),
        'Plan': safeVal(tx.planName || notes.plan_name),
        'Plan Key': safeVal(tx.planKey || notes.plan_key),
        'Type': safeVal(TYPE_LABELS[tx.type] || tx.type),
        'Amount (INR)': Number.isFinite(amountValue) ? amountValue.toFixed(2) : '0.00',
        'Currency': safeVal(tx.currency || rpay.currency),
        'Status': formatStatus(tx.status),
        'Payment Method': safeVal(tx.method || rpay.method),
        'Duration (Days)': tx.durationDays || 30,
        'Bonus Days': tx.bonusDays || 0,
        'Total Days': (tx.durationDays || 30) + (tx.bonusDays || 0),
        'Payment Date': paymentDate,
        'Created At': formatDateTime(tx.createdAt)
      };
    });

    const failedRows = transactions
      .filter((tx) => ['failed', 'cancelled', 'refunded'].includes(tx.status))
      .map((tx, i) => {
        const rpay = tx.razorpayPaymentData || {};
        const rorder = tx.razorpayOrderData || {};
        return {
          '#': i + 1,
          'Payment ID': safeVal(tx.paymentId || rpay.id),
          'Order ID': safeVal(tx.orderId || rorder.id),
          'Status': formatStatus(tx.status),
          'Failed At': formatDateTime(tx.failedAt),
          'Cancelled At': formatDateTime(tx.cancelledAt),
          'Refunded At': formatDateTime(tx.refundedAt),
          'Error Code': safeVal(tx.errorCode || rpay.error_code),
          'Error Description': safeVal(tx.errorDescription || rpay.error_description)
        };
      });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 28 }, // Payment ID
      { wch: 28 }, // Order ID
      { wch: 25 }, // Vendor Name
      { wch: 30 }, // Vendor Email
      { wch: 15 }, // City
      { wch: 15 }, // Plan
      { wch: 12 }, // Plan Key
      { wch: 16 }, // Type
      { wch: 14 }, // Amount
      { wch: 10 }, // Currency
      { wch: 12 }, // Status
      { wch: 15 }, // Payment Method
      { wch: 14 }, // Duration
      { wch: 12 }, // Bonus Days
      { wch: 12 }, // Total Days
      { wch: 22 }, // Payment Date
      { wch: 15 }  // Created At
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

    if (failedRows.length > 0) {
      const failedWorksheet = XLSX.utils.json_to_sheet(failedRows);
      failedWorksheet['!cols'] = [
        { wch: 5 },  // #
        { wch: 28 }, // Payment ID
        { wch: 28 }, // Order ID
        { wch: 12 }, // Status
        { wch: 22 }, // Failed At
        { wch: 22 }, // Cancelled At
        { wch: 22 }, // Refunded At
        { wch: 15 }, // Error Code
        { wch: 35 }  // Error Description
      ];
      XLSX.utils.book_append_sheet(workbook, failedWorksheet, 'Payment Issues');
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `payments_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);

  } catch (error) {
    console.error('❌ Error exporting payments:', error);
    res.status(500).json({ success: false, message: 'Failed to export payments' });
  }
};
