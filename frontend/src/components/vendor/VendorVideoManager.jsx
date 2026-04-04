import React, { useState, useEffect } from 'react';
import { Video, Upload, Trash2, Eye, EyeOff, PlayCircle, Clock, Film, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api';
import { uploadVendorVideoDirect } from '../../services/cloudinaryUploadService';

/**
 * VendorVideoManager Component
 * Instagram Reels-style video content management for vendor dashboard
 * Upload, manage visibility, and delete video content
 */
const VendorVideoManager = () => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState(null);
  const [planType, setPlanType] = useState('free');
  const [currentUsage, setCurrentUsage] = useState({ portfolioCount: 0, videoCount: 0 });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vendor-profile/dashboard/me');

      if (response.success) {
        setVideos(response.data.videos || []);
        setLimits(response.data.limits);
        setPlanType(response.data.planKey || 'free');
        setCurrentUsage(response.data.currentUsage || { portfolioCount: 0, videoCount: 0 });
      }
    } catch (error) {
      console.error('Fetch videos error:', error);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  // Check if video uploads are allowed - Uses COMBINED portfolio limit
  const canUploadVideo = () => {
    if (!limits) return false;
    if (!limits.allowVideos) return false; // Free plan check
    if (limits.portfolioLimit === -1) return true; // Unlimited
    return currentUsage.portfolioCount < limits.portfolioLimit; // Combined count
  };

  const getErrorMessage = (err, fallback = 'Upload failed') => {
    const apiMessage = err?.response?.data?.message || err?.response?.data?.error?.message;
    const status = err?.response?.status;

    if (apiMessage) return apiMessage;
    if (status === 413) return 'File is too large for server limit.';
    if (status === 403) return 'Upload blocked by current plan limit.';
    if (status === 415) return 'Unsupported file type.';
    return err?.message || fallback;
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check if videos are allowed (Free plan restriction)
    if (!limits?.allowVideos) {
      setError(
        '📹 Video uploads are not available in the Free Plan. ' +
        'Upgrade to Starter Plan (₹499) or higher to upload videos.'
      );
      alert(
        `🚨 Video Upload Not Available\n\n` +
        `Video uploads are disabled in the Free Plan.\n\n` +
        `⬆️ Upgrade to Starter Plan (₹499) to unlock video uploads!`
      );
      e.target.value = '';
      return;
    }

    if (!canUploadVideo()) {
      const suggestedPlan = planType === 'starter' ? 'Growth Plan (₹999)' : 'Premium Plan (₹1499)';
      setError(
        `Portfolio limit reached (${currentUsage.portfolioCount}/${limits.portfolioLimit} media used). ` +
        `Upgrade to ${suggestedPlan} for more storage.`
      );
      e.target.value = '';
      return;
    }

    // Validate and filter files
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'];
    const maxSize = 200 * 1024 * 1024; // 200 MB (aligned with backend)
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      // Reject images - they should be uploaded in Photos section
      if (file.type.startsWith('image/')) {
        errors.push(`${file.name}: Images must be uploaded in the "Portfolio Photos" section above`);
        continue;
      }

      if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
        errors.push(`${file.name}: Only video files (MP4, MOV, etc.) are allowed in Videos section`);
        continue;
      }
      if (file.size > maxSize) {
        errors.push(`${file.name}: exceeds 200 MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    // Cap at remaining quota
    const remaining = limits.portfolioLimit === -1
      ? validFiles.length
      : Math.max(0, limits.portfolioLimit - currentUsage.portfolioCount);
    const toUpload = validFiles.slice(0, remaining);
    const skippedByLimit = validFiles.length - toUpload.length;

    if (!toUpload.length) {
      const msg = errors.length
        ? `Could not upload:\n${errors.join('\n')}`
        : `Portfolio limit reached. Upgrade your plan for more storage.`;
      setError(msg);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const failedFiles = [];
      let successCount = 0;

      // Controlled concurrency keeps large video uploads stable.
      const concurrency = 2;
      let currentIndex = 0;
      let completed = 0;

      const worker = async () => {
        while (currentIndex < toUpload.length) {
          const idx = currentIndex;
          currentIndex += 1;

          const file = toUpload[idx];
          setUploadStatus(`Uploading video ${idx + 1} of ${toUpload.length}…`);
          setUploadProgress(0);

          try {
            await uploadVideo(file);
            successCount += 1;
          } catch (err) {
            const reason = getErrorMessage(err);
            failedFiles.push(`${file.name}: ${reason}`);
            console.error(`Failed to upload ${file.name}:`, reason);
          }

          completed += 1;
          setUploadStatus(`Processed ${completed} of ${toUpload.length} videos…`);
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, toUpload.length) }, () => worker()));

      // Final refresh to ensure accurate counts after all uploads
      await fetchVideos();

      const parts = [];
      if (successCount) parts.push(`✅ ${successCount} video${successCount > 1 ? 's' : ''} uploaded — pending admin approval.`);
      if (failedFiles.length) {
        parts.push(`❌ ${failedFiles.length} failed to upload.`);
        parts.push(`Failed files:\n- ${failedFiles.slice(0, 5).join('\n- ')}`);
      }
      if (skippedByLimit) parts.push(`⚠️ ${skippedByLimit} skipped — plan limit reached.`);
      if (errors.length) parts.push(`⚠️ ${errors.length} invalid file${errors.length > 1 ? 's' : ''} skipped.`);
      if (parts.length) alert(parts.join('\n'));
    } finally {
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const uploadVideo = async (file, attempt = 1) => {
    setUploadProgress(0);

    try {
      const uploaded = await uploadVendorVideoDirect(file, (progress) => {
        setUploadProgress(progress);
      });

      await apiClient.post('/vendor-profile/videos', {
        url: uploaded.url,
        publicId: uploaded.publicId,
        description: '',
        thumbnail: uploaded.thumbnail,
        duration: uploaded.duration,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        size: uploaded.size
      });

      setUploadProgress(100);
    } catch (err) {
      const status = err?.response?.status;

      // Backward compatibility: if live backend doesn't have signed upload endpoint yet,
      // fall back to legacy multipart upload route.
      if (status === 404) {
        const formData = new FormData();
        formData.append('media', file);
        formData.append('description', '');

        await apiClient.post('/vendor-profile/videos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 10 * 60 * 1000,
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
          }
        });

        setUploadProgress(100);
        return;
      }

      const shouldRetry = attempt < 2 && (!status || status >= 500 || status === 429);
      if (shouldRetry) {
        return uploadVideo(file, attempt + 1);
      }
      throw err;
    }
  };

  const toggleVisibility = async (videoId, currentVisibility) => {
    try {
      const response = await apiClient.patch(
        `/vendor-profile/videos/${videoId}/toggle-visibility`,
        { visibility: currentVisibility === 'public' ? 'hidden' : 'public' }
      );

      if (response.success) {
        setVideos(videos.map(v =>
          v._id === videoId ? { ...v, visibility: response.data.visibility } : v
        ));
      }
    } catch (error) {
      console.error('Toggle visibility error:', error);
      setError('Failed to update visibility');
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/vendor-profile/videos/${videoId}`);

      if (response.success) {
        setVideos(videos.filter(v => v._id !== videoId));
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete video');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
  };

  const getVideoThumbnailSrc = (video) => {
    const transformedFromUrl = video.videoUrl
      ?.replace(/\/video\/upload\//, '/video/upload/so_auto,f_jpg,w_640,h_360,c_fill,q_auto/')
      ?.replace(/\.(mp4|mov|avi|webm|m4v|qt|mkv)(\?.*)?$/i, '.jpg');

    return video.thumbnail?.url || video.thumbnail || transformedFromUrl || '';
  };

  const ApprovalBadge = ({ status }) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          Approved
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
        Pending Approval
      </span>
    );
  };

  return (
    <div className="vendor-video-manager bg-white rounded-xl shadow-sm p-6">
      {/* Free Plan Warning Banner */}
      {limits && !limits.allowVideos && (
        <div className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                📹 Video Uploads Not Available in Free Plan
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Video content is a premium feature. Upgrade your plan to start uploading videos and showcase your work more effectively.
              </p>
              <a 
                href="#upgrade" 
                className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm"
              >
                Upgrade to Starter Plan (₹499) →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Plan Info Banner (for paid plans) */}
      {limits && limits.allowVideos && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          limits.portfolioLimit === -1 
            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
            : canUploadVideo()
            ? 'bg-blue-50 border-blue-200'
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                {limits.planName} {limits.planPrice && `(${limits.planPrice})`}
              </h3>
              <p className="text-sm text-gray-700">
                {limits.portfolioLimit === -1 ? (
                  <span className="flex items-center gap-1">
                    <Film className="w-4 h-4 text-purple-600" />
                    <strong>Unlimited</strong> media uploads
                  </span>
                ) : (
                  <span>
                    <strong>{currentUsage.portfolioCount}</strong> of <strong>{limits.portfolioLimit}</strong> media used
                    {(limits.portfolioLimit - currentUsage.portfolioCount) > 0 && (
                      <span className="ml-2 text-gray-600">
                        ({limits.portfolioLimit - currentUsage.portfolioCount} remaining)
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            {!canUploadVideo() && (
              <a 
                href="#upgrade" 
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm"
              >
                Upgrade Plan
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Video Content</h2>
          <p className="text-sm text-gray-600">
            {limits?.allowVideos 
              ? 'Showcase your work with video content (Instagram Reels style)'
              : 'Upgrade to unlock video uploads'
            }
          </p>
        </div>
        <label
          className={`w-full sm:w-auto relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
            canUploadVideo() && !uploading
              ? 'bg-[linear-gradient(120deg,#1b3958_0%,#1f3c5d_52%,#24496f_100%)] text-white shadow-md hover:brightness-105 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Upload className="w-5 h-5 text-white" />
      {uploading ? 'Uploading…' : !limits?.allowVideos ? 'Videos Locked' : !canUploadVideo() ? 'Limit Reached' : 'Upload Videos'}
          <input
            type="file"
            accept="video/mp4,video/mov,video/avi,video/webm,video/quicktime"
            multiple
            onChange={handleFileSelect}
            disabled={uploading || !canUploadVideo()}
            className="hidden"
          />
        </label>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-900">{uploadStatus || 'Uploading…'}</span>
            <span className="text-sm font-bold text-purple-600">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Videos Yet</h3>
          <p className="text-gray-600 mb-4">Upload videos to showcase your work. You can select multiple files at once.</p>
          <label className="inline-flex items-center gap-2 px-6 py-3 relative overflow-hidden bg-[linear-gradient(120deg,#1b3958_0%,#1f3c5d_52%,#24496f_100%)] text-white rounded-lg font-semibold hover:brightness-105 cursor-pointer">
            <Upload className="w-5 h-5 text-white" />
            Upload Your First Videos
            <input
              type="file"
              accept="video/mp4,video/mov,video/avi,video/webm,video/quicktime"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video, index) => {
            const displayTitle = `Portfolio Video ${index + 1}`;
            return (
            <div
              key={video._id}
              className="group relative min-w-0 bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-black">
                <img
                  src={getVideoThumbnailSrc(video)}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const fallback = video.videoUrl
                      ?.replace('/video/upload/', '/video/upload/so_2,f_jpg,w_640,h_360,c_fill,q_auto/')
                      ?.replace('/upload/', '/upload/so_2,f_jpg,w_640,h_360,c_fill,q_auto/')
                      ?.replace(/\.(mp4|mov|avi|webm|mkv|m4v|qt)(\?.*)?$/i, '.jpg');

                    if (fallback && e.target.src !== fallback) {
                      e.target.src = fallback;
                      return;
                    }

                    e.target.style.display = 'none';
                  }}
                />
                {/* Fallback icon shows through if img fails */}
                <div className="absolute inset-0 flex items-center justify-center -z-0">
                  <Video className="w-10 h-10 text-gray-600" />
                </div>
                
                {/* Play Overlay */}
                <button
                  type="button"
                  onClick={() => setSelectedVideo(video)}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                </button>

                {/* Duration Badge */}
                {video.duration > 0 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                  </div>
                )}

                {/* Visibility Badge */}
                {video.visibility === 'hidden' && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                    <EyeOff className="w-3 h-3" />
                    Hidden
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                  {displayTitle}
                </h3>
                <div className="mb-2">
                  <ApprovalBadge status={video.approvalStatus} />
                </div>
                {video.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViews(video.views || 0)} views
                  </span>
                  {video.metadata?.fileSize && (
                    <span>{formatFileSize(video.metadata.fileSize)}</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="min-w-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => toggleVisibility(video._id, video.visibility)}
                    className={`min-w-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      video.visibility === 'public'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {video.visibility === 'public' ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Public
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hidden
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => deleteVideo(video._id)}
                    className="inline-flex items-center justify-center w-full sm:w-10 sm:h-10 px-4 sm:px-0 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload Date */}
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  Uploaded {new Date(video.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Plan Upgrade Hint */}
      {limits && currentUsage.portfolioCount >= limits.portfolioLimit && limits.portfolioLimit !== -1 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-1">Portfolio Limit Reached</h4>
          <p className="text-sm text-yellow-800">
            You've reached your plan limit of {limits.portfolioLimit} media files. 
            <a href="/vendor/plans" className="font-semibold underline ml-1">Upgrade your plan</a> to upload more content.
          </p>
        </div>
      )}

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white text-gray-900 shadow"
              title="Close preview"
            >
              ✕
            </button>
            <video
              src={selectedVideo.videoUrl}
              controls
              autoPlay
              className="w-full max-h-[85vh] bg-black rounded-xl"
            />
            <p className="text-white text-sm mt-2 text-center font-medium">
              {selectedVideo.title || 'Portfolio Video'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorVideoManager;
