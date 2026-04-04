import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Eye, FileText, X,
  Image as ImageIcon, Send, Clock, Tag, AlertCircle, Upload, Loader2
} from 'lucide-react';
import apiClient from '../../services/api';
import { uploadBlogImage } from '../../services/blogService';

/**
 * VendorBlogManager Component
 * LinkedIn-style blog/post management
 * Create, edit, publish, delete blogs
 */
const VendorBlogManager = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [previewBlog, setPreviewBlog] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    tags: '',
    coverImage: null,
    status: 'draft'
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vendor-profile/dashboard/me');

      if (response.success) {
        setBlogs(response.data.blogs);
      }
    } catch (error) {
      console.error('Fetch blogs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBlog(null);
    setFormData({ title: '', excerpt: '', content: '', tags: '', coverImage: null, status: 'draft' });
    setFormErrors({});
    setShowEditor(true);
  };

  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt || '',
      content: blog.content,
      tags: blog.tags?.join(', ') || '',
      coverImage: blog.coverImage?.url ? { url: blog.coverImage.url, publicId: blog.coverImage.publicId || '' } : null,
      status: blog.status
    });
    setFormErrors({});
    setShowEditor(true);
  };

  const getWordCount = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

  const validateForm = (statusToSave) => {
    const errors = {};

    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.excerpt.trim()) errors.excerpt = 'Excerpt is required';
    if (!formData.content.trim()) errors.content = 'Content is required';
    if (!formData.coverImage?.url) errors.coverImage = 'Cover image is required';

    if (formData.title.trim() && formData.title.trim().length < 8) {
      errors.title = 'Title should be at least 8 characters';
    }
    if (formData.excerpt.trim() && formData.excerpt.trim().length < 20) {
      errors.excerpt = 'Excerpt should be at least 20 characters';
    }
    if (formData.content.trim() && getWordCount(formData.content) < 30) {
      errors.content = 'Content should be at least 30 words';
    }

    if (statusToSave === 'published' && Object.keys(errors).length > 0) {
      errors.submit = 'Please complete all required fields before publishing.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (statusToSave) => {
    if (!validateForm(statusToSave)) return;

    try {
      setSaving(true);
      const blogData = {
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim(),
        content: formData.content.trim(),
        coverImage: formData.coverImage,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: statusToSave
      };

      let response;
      if (editingBlog) {
        response = await apiClient.put(
          `/vendor-profile/blogs/${editingBlog._id}`,
          blogData
        );
      } else {
        response = await apiClient.post(
          '/vendor-profile/blogs',
          blogData
        );
      }

      if (response.success) {
        alert(editingBlog ? 'Blog updated successfully!' : 'Blog created successfully!');
        fetchBlogs();
        setShowEditor(false);
      }
    } catch (error) {
      console.error('Save blog error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file for cover image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Cover image must be less than 10 MB');
      return;
    }

    try {
      setUploadingCover(true);
      const result = await uploadBlogImage(file);
      setFormData((prev) => ({ ...prev, coverImage: { url: result.url, publicId: result.publicId } }));
      setFormErrors((prev) => ({ ...prev, coverImage: undefined }));
    } catch (error) {
      console.error('Cover upload error:', error);
      alert(error.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDelete = async (blogId) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      await apiClient.delete(`/vendor-profile/blogs/${blogId}`);

      setBlogs(blogs.filter(b => b._id !== blogId));
      alert('Blog deleted successfully');
    } catch (error) {
      console.error('Delete blog error:', error);
      alert('Failed to delete blog');
    }
  };

  const handlePublish = async (blogId) => {
    try {
      const response = await apiClient.patch(
        `/vendor-profile/blogs/${blogId}/publish`,
        {}
      );

      if (response.success) {
        alert('Blog published successfully!');
        fetchBlogs();
      }
    } catch (error) {
      console.error('Publish blog error:', error);
      alert('Failed to publish blog');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="vendor-blog-manager bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Blog Posts</h2>
          <p className="text-sm text-gray-600">Share your expertise and stories</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          New Blog Post
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading blogs...</p>
        </div>
      ) : (
        <>
          {blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogs.map((blog) => (
                <div key={blog._id} className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all">
                  <div className="relative aspect-video bg-gray-100">
                    {blog.coverImage?.url ? (
                      <img src={blog.coverImage.url} alt={blog.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewBlog(blog)}
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/35 transition-opacity flex items-center justify-center"
                    >
                      <span className="px-3 py-1.5 bg-white text-gray-900 text-xs font-semibold rounded-lg shadow">Preview</span>
                    </button>
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(blog.status)}`}>
                        {blog.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{blog.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{blog.excerpt}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{blog.metadata?.readTime || 0} min</span>
                      <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                    </div>

                    {blog.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {blog.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-medium">#{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setPreviewBlog(blog)}
                        className="flex-1 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-semibold"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleEdit(blog)}
                        className="flex-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {blog.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(blog._id)}
                          className="flex-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold"
                        >
                          <Send className="w-4 h-4 inline mr-1" />
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(blog._id)}
                        className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No blog posts yet</h3>
              <p className="text-gray-600 mb-4">Share your expertise and connect with customers</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-5 h-5" />
                Create Your First Post
              </button>
            </div>
          )}
        </>
      )}

      {/* Blog Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Blog Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter an engaging title..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formErrors.title ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.title && <p className="text-red-600 text-xs mt-1">{formErrors.title}</p>}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Excerpt *
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Write a short summary of your blog..."
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${formErrors.excerpt ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.excerpt && <p className="text-red-600 text-xs mt-1">{formErrors.excerpt}</p>}
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Image *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {formData.coverImage?.url ? (
                    <div className="space-y-3">
                      <img src={formData.coverImage.url} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, coverImage: null }))}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold"
                      >
                        Remove Cover
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700">
                      {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingCover ? 'Uploading...' : 'Upload Cover Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
                {formErrors.coverImage && <p className="text-red-600 text-xs mt-1">{formErrors.coverImage}</p>}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your blog content here..."
                  rows={12}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${formErrors.content ? 'border-red-400' : 'border-gray-300'}`}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {getWordCount(formData.content)} words
                </p>
                {formErrors.content && <p className="text-red-600 text-xs mt-1">{formErrors.content}</p>}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., HVAC, maintenance, plumbing, electrical"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    handleSave('draft');
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => {
                    handleSave('published');
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Publish Now
                </button>
              </div>
              {formErrors.submit && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{formErrors.submit}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewBlog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewBlog(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {previewBlog.coverImage?.url && (
              <img src={previewBlog.coverImage.url} alt={previewBlog.title} className="w-full h-64 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{previewBlog.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{new Date(previewBlog.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setPreviewBlog(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-gray-700 font-medium mb-4">{previewBlog.excerpt}</p>
              <div className="prose prose-sm max-w-none whitespace-pre-line text-gray-700">{previewBlog.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorBlogManager;
