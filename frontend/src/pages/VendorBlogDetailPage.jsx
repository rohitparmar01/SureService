import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, ChevronLeft, Clock, Eye, Tag, User } from 'lucide-react';
import apiClient from '../services/api';

const VendorBlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get(`/vendor-blogs/${slug}`);
        if (response?.success && response?.data?.blog) {
          setBlog(response.data.blog);
        } else {
          setError('Blog not found');
        }
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load blog');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchBlog();
  }, [slug]);

  const publishedDate = useMemo(() => {
    if (!blog?.publishedAt) return null;
    const d = new Date(blog.publishedAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [blog?.publishedAt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading blog...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <p className="text-2xl font-bold text-gray-900 mb-2">Unable to load blog</p>
          <p className="text-gray-600 mb-6">{error || 'Blog not found'}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {blog.coverImage && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">
            <img src={blog.coverImage} alt={blog.title} className="w-full h-72 md:h-96 object-cover" />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            {publishedDate && (
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {publishedDate.toLocaleDateString()}
              </span>
            )}
            {typeof blog.readTime === 'number' && (
              <span className="inline-flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {blog.readTime} min read
              </span>
            )}
            {typeof blog.views === 'number' && (
              <span className="inline-flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {blog.views} views
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{blog.title}</h1>

          {blog.vendor?.businessName && (
            <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-6">
              <span className="inline-flex items-center gap-2">
                <User className="w-4 h-4" />
                {blog.vendor.businessName}
              </span>
              {blog.vendor.city && (
                <span className="text-gray-400">•</span>
              )}
              {blog.vendor.city && (
                <span>{blog.vendor.area ? `${blog.vendor.area}, ${blog.vendor.city}` : blog.vendor.city}</span>
              )}
            </div>
          )}

          {blog.excerpt && (
            <p className="text-lg text-gray-700 leading-relaxed mb-8">{blog.excerpt}</p>
          )}

          {blog.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <Tag className="w-4 h-4 text-gray-400" />
              {blog.tags.map((t, idx) => (
                <span key={`${t}-${idx}`} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Vendor blog content is user-generated; render as plain text to avoid XSS */}
          <div className="prose max-w-none">
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{blog.content}</div>
          </div>

          {blog.vendor?.id && (
            <div className="mt-10 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate(`/vendor/${blog.vendor.id}`)}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                View vendor profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorBlogDetailPage;
