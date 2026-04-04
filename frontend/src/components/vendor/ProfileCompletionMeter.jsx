import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, TrendingUp, Award, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api';

/**
 * ProfileCompletionMeter Component
 * Shows vendor profile completion percentage with actionable tips
 * Gamified approach to encourage profile completion
 */
const ProfileCompletionMeter = () => {
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfileCompletion();
  }, []);

  const fetchProfileCompletion = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vendor-profile/dashboard/me');

      if (response.success) {
        setCompletion(response.data.profileCompletion);
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Fetch profile completion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 50) return 'from-[var(--premium-blue)] to-[#24496f]';
    return 'from-red-500 to-pink-500';
  };

  const getCompletionMessage = (percentage) => {
    if (percentage >= 90) return { title: 'Excellent!', message: 'Your profile is nearly complete', icon: Award };
    if (percentage >= 70) return { title: 'Great Progress!', message: 'Keep going to maximize visibility', icon: TrendingUp };
    if (percentage >= 40) return { title: 'Good Start!', message: 'Complete more sections to boost discovery', icon: CheckCircle };
    return { title: 'Let\'s Get Started!', message: 'Complete your profile to attract customers', icon: AlertCircle };
  };

  const completionInfo = getCompletionMessage(completion);
  const Icon = completionInfo.icon;

  const checklistItems = [
    {
      key: 'basicInfo',
      label: 'Complete Business Information',
      completed: profile?.vendor?.businessName && profile?.vendor?.serviceType && profile?.vendor?.city,
      weight: 20
    },
    {
      key: 'contact',
      label: 'Add Contact Details',
      completed: profile?.vendor?.contact?.email && profile?.vendor?.contact?.phone,
      weight: 15
    },
    {
      key: 'description',
      label: 'Write Business Description (50+ words)',
      completed: profile?.vendor?.description && profile?.vendor?.description.length > 50,
      weight: 10
    },
    {
      key: 'pricing',
      label: 'Set Pricing Information',
      completed: profile?.vendor?.pricing?.min && profile?.vendor?.pricing?.max,
      weight: 10
    },
    {
      key: 'media',
      label: 'Upload 3+ Portfolio Images',
      completed: profile?.media && profile.media.length >= 3,
      weight: 25
    },
    {
      key: 'blogs',
      label: 'Publish Your First Blog Post',
      completed: profile?.blogs && profile.blogs.some(b => b.status === 'published'),
      weight: 10
    },
    {
      key: 'videos',
      label: 'Add Video Content',
      completed: profile?.videos && profile.videos.length > 0,
      weight: 10
    }
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const pendingItems = checklistItems.filter((item) => !item.completed);

  const statusStyles = {
    high: {
      icon: 'text-green-600',
      badge: 'bg-green-50 text-green-700 border-green-200'
    },
    medium: {
      icon: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    low: {
      icon: 'text-red-600',
      badge: 'bg-red-50 text-red-700 border-red-200'
    }
  };

  const statusKey = completion >= 80 ? 'high' : completion >= 50 ? 'medium' : 'low';
  const progressDegrees = Math.max(0, Math.min(100, completion)) * 3.6;
  const ringColor = completion >= 80 ? '#10b981' : completion >= 50 ? '#24496f' : '#ef4444';

  return (
    <div className="vendor-profile-completion bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Profile Strength</h2>
          <p className="text-sm text-gray-600 mt-1">A compact score of your profile readiness</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${statusStyles[statusKey].badge}`}>
              <Icon className={`w-3.5 h-3.5 ${statusStyles[statusKey].icon}`} />
              {completionInfo.title}
            </span>
            <span className="text-xs text-gray-500">{completedCount}/{checklistItems.length} sections complete</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${ringColor} ${progressDegrees}deg, #e5e7eb 0deg)`
            }}
          >
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-inner">
              <span className="text-sm font-bold text-gray-900">{loading ? '...' : `${completion}%`}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 max-w-[140px] leading-relaxed">{completionInfo.message}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getCompletionColor(completion)} transition-all duration-500 ease-out relative`}
            style={{ width: `${completion}%` }}
          >
            <div className="absolute inset-0 bg-white/20"></div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {checklistItems.map((item) => (
          <div
            key={item.key}
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
              item.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {item.completed ? (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium truncate ${item.completed ? 'text-green-900' : 'text-gray-700'}`}>
                {item.label}
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 flex-shrink-0">+{item.weight}%</span>
          </div>
        ))}
      </div>

      {completion < 100 && pendingItems.length > 0 && (
        <div className="mt-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Next Best Actions
          </h4>
          <ul className="space-y-1 text-sm text-indigo-800">
            {pendingItems.slice(0, 3).map((item) => (
              <li key={item.key}>• {item.label}</li>
            ))}
          </ul>
        </div>
      )}

      {completion === 100 && (
        <div className="mt-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-green-600" />
            <div>
              <h4 className="font-bold text-green-900">Profile Complete! 🎉</h4>
              <p className="text-sm text-green-700">
                Your profile is fully optimized for maximum visibility and customer reach!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletionMeter;
