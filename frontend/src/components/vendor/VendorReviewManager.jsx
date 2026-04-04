import React, { useState, useEffect } from 'react';
import {
  Star, MessageSquare, CheckCircle, Clock, Send, Loader2,
  Edit3, AlertCircle, RefreshCw, X, TrendingUp
} from 'lucide-react';
import apiClient from '../../services/api';

/**
 * VendorReviewManager
 * Dashboard tab for vendors to read and respond to approved customer reviews.
 */
const VendorReviewManager = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // reviewId currently open
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/vendor-profile/reviews');
      if (res.success) {
        setReviews(res.data || []);
      } else {
        setError('Could not load reviews.');
      }
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartReply = (review) => {
    setReplyingTo(review._id);
    setReplyText(review.vendorResponse?.comment || '');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleSubmitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/vendor-profile/reviews/${reviewId}/reply`, {
        comment: replyText.trim()
      });
      if (res.success) {
        setReviews(prev =>
          prev.map(r => (r._id === reviewId ? res.data : r))
        );
        setReplyingTo(null);
        setReplyText('');
      }
    } catch {
      alert('Failed to post reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────

  const renderStars = (rating, size = 'sm') => {
    const cls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`${cls} ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const avatarColor = (name = '') => {
    const colors = [
      'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
      'bg-teal-500', 'bg-blue-500', 'bg-orange-500'
    ];
    return colors[(name.charCodeAt(0) || 0) % colors.length];
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

  // ── derived stats ─────────────────────────────────────────────────────────

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const repliedCount = reviews.filter(r => r.vendorResponse?.comment).length;
  const pendingCount = reviews.length - repliedCount;

  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    stars: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0
  }));

  // ── render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-500 font-medium">Loading reviews…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold mb-4">{error}</p>
        <button
          onClick={fetchReviews}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-10 h-10 text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Reviews Yet</h3>
        <p className="text-gray-500 max-w-xs mx-auto">
          Once customers leave reviews and they are approved, they will appear here for you to read and respond.
        </p>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────

  return (
    <div className="vendor-review-manager space-y-6">

      {/* ── Summary header ── */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* Big average rating */}
          <div className="flex flex-col items-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl px-8 py-5 border border-indigo-100 min-w-[140px]">
            <span className="text-5xl font-black text-indigo-700 leading-none mb-1">{avgRating}</span>
            {renderStars(Math.round(Number(avgRating)), 'lg')}
            <span className="mt-2 text-xs text-gray-500 font-medium">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Rating distribution bars */}
          <div className="flex-1 space-y-2 min-w-0">
            {ratingDist.map(({ stars, count, pct }) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 w-4 text-right">{stars}</span>
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-7 text-right">{count}</span>
              </div>
            ))}
          </div>

          {/* Quick stat chips */}
          <div className="flex sm:flex-col gap-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-green-700 leading-none">{repliedCount}</p>
                <p className="text-xs text-green-600">Replied</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-amber-700 leading-none">{pendingCount}</p>
                <p className="text-xs text-amber-600">Awaiting reply</p>
              </div>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Responding to reviews builds trust — you have <strong>{pendingCount}</strong> unanswered review{pendingCount !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
      </div>

      {/* ── Review cards ── */}
      <div className="space-y-4">
        {reviews.map(review => {
          const userName = review.userId?.name || review.userName || 'Anonymous';
          const isReplying = replyingTo === review._id;
          const hasReply = !!review.vendorResponse?.comment;

          return (
            <div
              key={review._id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              {/* Review body */}
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">

                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${avatarColor(userName)}`}>
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{userName}</span>
                      {review.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>

                    {/* Stars + date */}
                    <div className="flex items-center gap-3 mb-3">
                      {renderStars(review.rating)}
                      <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                    </div>

                    {/* Comment */}
                    <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                </div>

                {/* Existing vendor response (read-only when not editing) */}
                {hasReply && !isReplying && (
                  <div className="mt-4 ml-0 sm:ml-15 pl-4 border-l-4 border-indigo-300 bg-indigo-50 rounded-r-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Your Response</span>
                      <span className="text-xs text-indigo-500">
                        {review.vendorResponse.respondedAt && formatDate(review.vendorResponse.respondedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{review.vendorResponse.comment}</p>
                  </div>
                )}

                {/* Reply textarea (open state) */}
                {isReplying && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      {hasReply ? 'Edit Your Response' : 'Write Your Response'}
                    </label>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="Write a professional, helpful response to this customer's review…"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                    <div className="flex items-center justify-between mt-1 mb-3">
                      <span className="text-xs text-gray-400">{replyText.length}/500 characters</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitReply(review._id)}
                        disabled={!replyText.trim() || submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {hasReply ? 'Update Response' : 'Post Response'}
                      </button>
                      <button
                        onClick={handleCancelReply}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-semibold text-sm transition-all"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action bar */}
                {!isReplying && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasReply ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-full px-3 py-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Responded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-3 py-1">
                          <Clock className="w-3.5 h-3.5" /> No response yet
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleStartReply(review)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        hasReply
                          ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                          : 'text-white bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {hasReply ? (
                        <><Edit3 className="w-4 h-4" /> Edit Response</>
                      ) : (
                        <><MessageSquare className="w-4 h-4" /> Reply</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorReviewManager;
