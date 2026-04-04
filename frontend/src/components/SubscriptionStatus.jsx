import React from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock
} from 'lucide-react';

const SubscriptionStatus = ({ vendor }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!vendor?.subscription) {
    return null;
  }

  const { subscription } = vendor;
  const isFree = !subscription.planKey || subscription.planKey === 'free';

  // Always compute from expiryDate client-side — vendor profile endpoint does not auto-downgrade
  const daysRemaining = subscription.expiryDate
    ? Math.max(0, Math.ceil((new Date(subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Derive active/expired from live daysRemaining, not stale status field
  const isActive = !isFree && subscription.status === 'active' && daysRemaining > 0;
  const isExpired = !isFree && !isActive && (subscription.status === 'expired' || (subscription.expiryDate && daysRemaining <= 0));

  const getStatusColor = () => {
    if (isActive) return 'text-green-600 bg-green-50';
    if (isExpired) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusIcon = () => {
    if (isActive) return <CheckCircle className="w-5 h-5" />;
    if (isExpired) return <XCircle className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  const getStatusLabel = () => {
    if (isActive) return 'ACTIVE';
    if (isExpired) return 'EXPIRED';
    return 'FREE';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Subscription Status
        </h2>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-semibold uppercase text-sm">{getStatusLabel()}</span>
        </div>
      </div>

      {/* Expiry Warning */}
      {isActive && daysRemaining <= 7 && (
        <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3" />
            <div>
              <p className="font-semibold text-orange-800">Plan Expiring Soon</p>
              <p className="text-sm text-orange-600 mt-1">
                {daysRemaining > 0
                  ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining. Renew from your dashboard to keep features.`
                  : 'Your plan expires today. Renew now to avoid losing features.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expired Banner */}
      {isExpired && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <p className="font-semibold text-red-800">Plan Expired</p>
              <p className="text-sm text-red-600 mt-1">
                Your {subscription.planName} plan expired on {formatDate(subscription.expiryDate)}. Renew from your dashboard to restore features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Plan</p>
          <p className="font-semibold text-gray-800">{subscription.planName || 'Free'}</p>
        </div>

        {isActive && (
          <>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
              <p className="font-semibold text-gray-800">
                ₹{subscription.lastPaymentAmount ? subscription.lastPaymentAmount.toLocaleString('en-IN') : '0'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="font-semibold text-gray-800">{formatDate(subscription.startDate)}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Expiry Date</p>
              <p className={`font-semibold ${daysRemaining <= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatDate(subscription.expiryDate)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
              <p className={`font-semibold ${daysRemaining <= 7 ? 'text-red-600' : 'text-green-600'}`}>
                {daysRemaining} days
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Auto Renewal</p>
              <p className="font-semibold text-gray-600">No auto-renewal</p>
            </div>
          </>
        )}

        {isFree && !isExpired && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="font-semibold text-gray-800">Free plan — upgrade from your dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatus;
