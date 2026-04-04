import React, { useState, useEffect } from 'react';
import {
  Upload, X, Star, Eye, EyeOff, Image as ImageIcon,
  Move, Check, Sparkles, AlertCircle, Clock
} from 'lucide-react';
import apiClient from '../../services/api';
import { uploadVendorImageDirect } from '../../services/cloudinaryUploadService';

/**
 * VendorMediaManager Component
 * Portfolio management — supports multi-file upload of PHOTOS only (images: JPG, PNG, etc.).
 * Videos are managed separately in VendorVideoManager component.
 * All uploads are gated behind admin approval before appearing publicly.
 */
const VendorMediaManager = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [limits, setLimits] = useState(null);
  const [planType, setPlanType] = useState('free');
  const [currentUsage, setCurrentUsage] = useState({ portfolioCount: 0 });
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vendor-profile/dashboard/me');
      if (response.success) {
        // IMPORTANT: Filter to only show IMAGES in this section (exclude videos)
        const imagesOnly = (response.data.media || []).filter(item => item.type === 'image');
        setMedia(imagesOnly);
        setLimits(response.data.limits);
        setPlanType(response.data.planKey || 'free');
        setCurrentUsage(response.data.currentUsage || { portfolioCount: 0 });
      }
    } catch (error) {
      console.error('Fetch media error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingUploads = () => {
    if (!limits) return 0;
    if (limits.portfolioLimit === -1) return Infinity;
    return Math.max(0, limits.portfolioLimit - currentUsage.portfolioCount);
  };

  const canUpload = () => {
    const remaining = getRemainingUploads();
    return remaining === Infinity || remaining > 0;
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

  const uploadSingleImage = async (file, attempt = 1) => {
    try {
      const uploaded = await uploadVendorImageDirect(file);

      await apiClient.post('/vendor-profile/media', {
        url: uploaded.url,
        publicId: uploaded.publicId,
        type: 'image'
      });

      return { success: true };
    } catch (err) {
      const status = err?.response?.status;

      // Backward compatibility: if live backend doesn't have signed upload endpoint yet,
      // use legacy multipart route.
      if (status === 404) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'image');

          await apiClient.post('/vendor-profile/media', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
          });

          return { success: true };
        } catch (legacyErr) {
          return {
            success: false,
            reason: getErrorMessage(legacyErr)
          };
        }
      }

      const shouldRetry = attempt < 2 && (!status || status >= 500 || status === 429);

      if (shouldRetry) {
        return uploadSingleImage(file, attempt + 1);
      }

      return {
        success: false,
        reason: getErrorMessage(err)
      };
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate each file - PHOTOS ONLY in this section
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      // Reject videos - they should be uploaded in Video section
      if (isVideo) {
        errors.push(`${file.name}: Videos must be uploaded in the "Video Content" section below`);
        continue;
      }

      if (!isImage) {
        errors.push(`${file.name}: Only image files (JPG, PNG, etc.) are allowed in Photos section`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: Image exceeds 10 MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    // Cap at remaining quota
    const remaining = getRemainingUploads();
    const toUpload = remaining === Infinity ? validFiles : validFiles.slice(0, remaining);
    const skippedByLimit = validFiles.length - toUpload.length;

    if (!toUpload.length) {
      const msg = errors.length
        ? `Could not upload:\n${errors.join('\n')}`
        : `Portfolio limit reached. Upgrade your plan for more storage.`;
      alert(msg);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const failedFiles = [];
      let completed = 0;
      let successCount = 0;

      // Controlled concurrency keeps uploads stable without overwhelming network/server.
      const concurrency = 2;
      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < toUpload.length) {
          const idx = currentIndex;
          currentIndex += 1;

          const file = toUpload[idx];
          setUploadProgress(`${idx + 1} / ${toUpload.length}`);

          const result = await uploadSingleImage(file);
          if (result.success) {
            successCount += 1;
          } else {
            failedFiles.push(`${file.name}: ${result.reason}`);
            console.error(`Upload failed for ${file.name}:`, result.reason);
          }

          completed += 1;
          setUploadProgress(`${completed} / ${toUpload.length}`);
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, toUpload.length) }, () => worker()));

      await fetchMedia();

      const parts = [];
      if (successCount) parts.push(`✅ ${successCount} file${successCount > 1 ? 's' : ''} uploaded — pending admin approval.`);
      if (failedFiles.length) {
        parts.push(`❌ ${failedFiles.length} failed to upload.`);
        parts.push(`Failed files:\n- ${failedFiles.slice(0, 5).join('\n- ')}`);
      }
      if (skippedByLimit) parts.push(`⚠️ ${skippedByLimit} skipped — plan limit reached.`);
      if (errors.length) parts.push(`⚠️ ${errors.length} invalid file${errors.length > 1 ? 's' : ''} skipped.`);
      alert(parts.join('\n'));
    } finally {
      setUploading(false);
      setUploadProgress('');
      e.target.value = '';
    }
  };

  const handleDelete = async (mediaId) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      await apiClient.delete(`/vendor-profile/media/${mediaId}`);
      await fetchMedia();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete media');
    }
  };

  const handleToggleVisibility = async (mediaId) => {
    try {
      const response = await apiClient.patch(
        `/vendor-profile/media/${mediaId}/toggle-visibility`,
        {}
      );
      if (response.success) {
        setMedia(media.map(m => m._id === mediaId ? response.data : m));
      }
    } catch (error) {
      console.error('Toggle visibility error:', error);
    }
  };

  const handleToggleFeatured = async (mediaId) => {
    try {
      const response = await apiClient.patch(
        `/vendor-profile/media/${mediaId}/feature`,
        {}
      );
      if (response.success) {
        setMedia(media.map(m => m._id === mediaId ? response.data : m));
      }
    } catch (error) {
      console.error('Toggle featured error:', error);
    }
  };

  const handleDragStart = (item) => setDraggedItem(item);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (targetItem) => {
    if (!draggedItem || draggedItem._id === targetItem._id) return;

    const newMedia = [...media];
    const draggedIndex = newMedia.findIndex(m => m._id === draggedItem._id);
    const targetIndex = newMedia.findIndex(m => m._id === targetItem._id);
    newMedia.splice(draggedIndex, 1);
    newMedia.splice(targetIndex, 0, draggedItem);

    const mediaOrder = newMedia.map((m, index) => ({ mediaId: m._id, orderIndex: index }));
    setMedia(newMedia);

    try {
      await apiClient.put('/vendor-profile/media/reorder', { mediaOrder });
    } catch (error) {
      console.error('Reorder error:', error);
      fetchMedia();
    }
    setDraggedItem(null);
  };

  const StatusBadge = ({ status }) => {
    if (status === 'approved') {
      return (
        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  const uploadLabel = uploading
    ? `Uploading ${uploadProgress}…`
    : !canUpload()
    ? 'Limit Reached'
    : 'Upload Photos';

  const formatFileSize = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return null;
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="vendor-media-manager bg-white rounded-xl shadow-sm p-6">
      {/* Plan Info Banner */}
      {limits && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          limits.portfolioLimit === -1
            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
            : getRemainingUploads() === 0
            ? 'bg-red-50 border-red-300'
            : getRemainingUploads() <= 2
            ? 'bg-yellow-50 border-yellow-300'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                {limits.planName} {limits.planPrice && `(${limits.planPrice})`}
              </h3>
              <p className="text-sm text-gray-700">
                {limits.portfolioLimit === -1 ? (
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <strong>Unlimited</strong> portfolio uploads
                  </span>
                ) : (
                  <span>
                    <strong>{currentUsage.portfolioCount}</strong> of{' '}
                    <strong>{limits.portfolioLimit}</strong> media used
                    {getRemainingUploads() > 0 && (
                      <span className="ml-2 text-gray-600">
                        ({getRemainingUploads()} remaining)
                      </span>
                    )}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                📷 Photos only (images: JPG, PNG, etc.) · Videos go in "Video Content" section · All uploads require admin approval
              </p>
            </div>
            {getRemainingUploads() === 0 && (
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

      {/* Header + Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Portfolio Photos</h2>
          <p className="text-sm text-gray-600">
            {media.length} photo{media.length !== 1 ? 's' : ''} · Images only
          </p>
        </div>
        <label className={`w-full sm:w-auto px-6 py-3 font-semibold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap ${
          canUpload() && !uploading
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
        }`}>
          <Upload className="w-5 h-5" />
          <span>{uploadLabel}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading || !canUpload()}
            className="hidden"
          />
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading media…</p>
        </div>
      ) : media.length > 0 ? (
        <>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Tip:</strong> You can select multiple files at once.
                Drag thumbnails to reorder. New uploads are <strong>pending admin approval</strong> before appearing publicly.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {media.map((item, index) => {
              const displayCaption = `Portfolio Image ${index + 1}`;
              const fileSize = formatFileSize(item.metadata?.size);
              return (
              <div
                key={item._id}
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(item)}
                className="group relative min-w-0 bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-move"
              >
                <div
                  className="relative aspect-video bg-gray-100"
                  onClick={() => setSelectedImage(item)}
                >
                  <img
                    src={item.url}
                    alt={displayCaption}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(item);
                      }}
                      className="px-3 py-1.5 bg-white text-gray-900 text-xs font-semibold rounded-lg shadow"
                    >
                      View Photo
                    </button>
                  </div>
                </div>

                {/* Status badge (top-left) */}
                <div className="absolute top-2 left-2">
                  <StatusBadge status={item.approvalStatus} />
                </div>

                {/* Featured + hidden badges (top-right) */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  {item.isFeatured && (
                    <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Featured
                    </span>
                  )}
                  {item.visibility === 'hidden' && (
                    <span className="px-2 py-1 bg-gray-700 text-white text-xs font-semibold rounded-full">
                      Hidden
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{displayCaption}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                    {fileSize && <span>{fileSize}</span>}
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                    <button
                      onClick={() => setSelectedImage(item)}
                      className="flex-1 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-semibold"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(item._id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        item.visibility === 'public'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {item.visibility === 'public' ? 'Public' : 'Hidden'}
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 self-stretch sm:self-auto"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleFeatured(item._id)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      item.isFeatured
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.isFeatured ? 'Featured Photo' : 'Mark as Featured'}
                  </button>

                  <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-500">
                    <Move className="w-3 h-3" />
                    <span>Drag card to reorder</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos uploaded yet</h3>
          <p className="text-gray-600 mb-4">
            Upload photos to build your portfolio. You can select multiple files at once.
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer">
            <Upload className="w-5 h-5" />
            <span>Upload Your First Photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white text-gray-900 shadow"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || 'Portfolio image preview'}
              className="w-full max-h-[90vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorMediaManager;
