import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, Eye, Clock, ChevronLeft, Share2, 
  Tag, User,
  BookOpen, Loader, ArrowRight, Check
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getBlogBySlug } from '../services/blogService';

// Helper to safely get image URL from featuredImage (handles both string and object)
const getImageUrl = (featuredImage) => {
  if (typeof featuredImage === 'string') return featuredImage;
  if (typeof featuredImage === 'object' && featuredImage?.url) return featuredImage.url;
  return 'https://via.placeholder.com/800x400?text=No+Image';
};

const BlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Track which slug we've already loaded to prevent duplicate view counts
  const loadedSlugRef = useRef(null);

  useEffect(() => {
    // Only load if this is a new slug (prevents double-loading in StrictMode)
    if (loadedSlugRef.current !== slug) {
      loadedSlugRef.current = slug;
      loadBlog();
      window.scrollTo(0, 0);
    }
  }, [slug]);

  const loadBlog = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionViewKey = `blog_viewed_${slug}`;
      const hasViewedInSession = sessionStorage.getItem(sessionViewKey) === '1';
      const shouldTrackView = !hasViewedInSession;

      // Lock immediately to avoid duplicate increments from parallel mounts/renders.
      if (shouldTrackView) {
        sessionStorage.setItem(sessionViewKey, '1');
      }

      const response = await getBlogBySlug(slug, { trackView: shouldTrackView });
      setBlog(response.data?.blog || response.blog);
      setRelatedBlogs(response.data?.relatedBlogs || response.relatedBlogs || []);
    } catch (err) {
      console.error('Error loading blog:', err);
      setError('Blog not found');
    } finally {
      setLoading(false);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: blog?.title || 'Blog',
      text: blog?.excerpt || 'Check out this blog post',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await handleCopyLink();
      }
    } catch (error) {
      // User may cancel share sheet; no action needed.
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1800);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Blog Not Found</h2>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist.</p>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  const authorName = blog?.author?.name || 'Admin';
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{blog.metaTitle || blog.title}</title>
        <meta name="description" content={blog.metaDescription || blog.excerpt} />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.excerpt} />
        <meta property="og:image" content={getImageUrl(blog.featuredImage)} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog.title} />
        <meta name="twitter:description" content={blog.excerpt} />
        <meta name="twitter:image" content={getImageUrl(blog.featuredImage)} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Back Button */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <button
            onClick={() => navigate('/blogs')}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Blogs
          </button>
        </div>

        {/* Blog Header */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Reader Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 md:p-10 mb-10 shadow-sm">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-100/60" />
            <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-100/60" />

            <div className="relative">
              {blog.category && (
                <div className="mb-5">
                  <span className="inline-flex items-center px-4 py-2 bg-white/90 border border-indigo-200 text-indigo-700 rounded-full text-xs md:text-sm font-bold tracking-wide uppercase">
                    {blog.category}
                  </span>
                </div>
              )}

              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5 tracking-tight">
                {blog.title}
              </h1>

              {blog.excerpt && (
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-medium mb-7 max-w-3xl">
                  {blog.excerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center">
                    {authorInitial}
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900 leading-none">{authorName}</p>
                    <p className="text-xs text-gray-500 mt-1">Author</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>

                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {blog.readTime} min read
                </span>

                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  {blog.views || 0} views
                </span>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {blog.featuredImage && (
            <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={getImageUrl(blog.featuredImage)}
                alt={blog.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Share Section */}
          <div className="mb-12 pb-8 border-b border-gray-200">
            <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-5 md:p-6 shadow-sm">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-100/60" />
              <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-100/60" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-indigo-100 px-3 py-1.5 mb-2">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-700 tracking-wide">SHARE ARTICLE</span>
                  </div>
                  <p className="text-base md:text-lg font-bold text-gray-900">Found this useful? Share it with your network.</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    {copySuccess ? 'Link copied to clipboard successfully.' : 'One tap to share, or copy the direct link.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all"
                    title="Share article"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Now
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-semibold transition-all ${copySuccess ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                    title="Copy article link"
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : null}
                    {copySuccess ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Blog Content */}
          <div className="mb-12 rounded-3xl border border-gray-100 bg-white p-6 md:p-10 shadow-sm">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold tracking-[0.18em] text-indigo-600 uppercase">Reader Mode</p>
              <p className="text-sm text-gray-500 mt-1">Designed for comfortable long-form reading</p>
            </div>

            <div className="prose prose-lg md:prose-xl max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-800 prose-p:leading-8 prose-strong:text-gray-900 prose-a:text-indigo-700 hover:prose-a:text-indigo-900 prose-blockquote:border-indigo-300 prose-blockquote:bg-indigo-50/60 prose-blockquote:py-2 prose-blockquote:px-4 prose-li:text-gray-800">
            <div 
              className="text-gray-800 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
            </div>
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="pt-8 border-t border-gray-200">
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 md:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Explore More Topics</p>
                    <p className="text-xs text-gray-500">Jump to related stories by tag</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {blog.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/blogs?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center px-3.5 py-2 rounded-full text-sm font-semibold bg-white text-violet-700 border border-violet-200 shadow-sm hover:shadow-md hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Related Blogs */}
        {relatedBlogs && relatedBlogs.length > 0 && (
          <div className="bg-gray-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-8">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <h2 className="text-3xl font-bold text-gray-900">Related Articles</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedBlogs.slice(0, 3).map((relatedBlog) => (
                  <Link
                    key={relatedBlog._id}
                    to={`/blogs/${relatedBlog.slug}`}
                    className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  >
                    {relatedBlog.featuredImage && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={getImageUrl(relatedBlog.featuredImage)}
                          alt={relatedBlog.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {relatedBlog.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {relatedBlog.excerpt}
                      </p>
                      <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm group-hover:gap-4 transition-all">
                        <span>Read More</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Plan Your Perfect Service?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Discover trusted service providers and deliver exceptional outcomes
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-xl"
            >
              Start Planning
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogDetailPage;
