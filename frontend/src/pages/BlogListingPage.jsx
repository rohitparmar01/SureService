import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, Calendar, Eye, Clock, ChevronRight, 
  Filter, Tag, BookOpen, TrendingUp, Loader, ChevronDown 
} from 'lucide-react';
import { fetchPublishedBlogs, getBlogCategories, getBlogTags } from '../services/blogService';

// Helper to safely get image URL from featuredImage (handles both string and object)
const getImageUrl = (featuredImage) => {
  if (typeof featuredImage === 'string') return featuredImage;
  if (typeof featuredImage === 'object' && featuredImage?.url) return featuredImage.url;
  return 'https://via.placeholder.com/800x400?text=No+Image';
};

const normalizeLabel = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const truncateLabel = (value, maxLength = 52) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const splitCompositeTag = (value) => {
  const normalized = normalizeLabel(value);
  if (!normalized) return [];

  // Handle common separators from messy imported tag data.
  const parts = normalized
    .split(/[,;|\n/]+/)
    .map((part) => normalizeLabel(part))
    .filter(Boolean);

  return parts.length ? parts : [normalized];
};

const BlogListingPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || 'all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);
  const tagDropdownRef = useRef(null);

  useEffect(() => {
    loadBlogs();
    loadFilters();
  }, [selectedCategory, selectedTag, pagination.page]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setIsTagDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 9
      };
      
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedTag !== 'all') params.tag = selectedTag;

      const response = await fetchPublishedBlogs(params);
      
      // Backend returns {data: [blogs], pagination: {...}} after response interceptor
      setBlogs(response.data || []);
      setPagination({
        page: response.pagination?.page || 1,
        totalPages: response.pagination?.pages || 1,
        total: response.pagination?.total || 0
      });
    } catch (error) {
      console.error('Error loading blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        getBlogCategories(),
        getBlogTags()
      ]);
      setCategories(categoriesRes.data || categoriesRes || []);
      setTags(tagsRes.data || tagsRes || []);
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setIsCategoryDropdownOpen(false);
    setPagination({ ...pagination, page: 1 });
    if (category !== 'all') {
      searchParams.set('category', category);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
  };

  const handleTagChange = (tag) => {
    setSelectedTag(tag);
    setIsTagDropdownOpen(false);
    setPagination({ ...pagination, page: 1 });
    if (tag !== 'all') {
      searchParams.set('tag', tag);
    } else {
      searchParams.delete('tag');
    }
    setSearchParams(searchParams);
  };

  const filteredBlogs = blogs.filter(blog =>
    searchTerm === '' ||
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const normalizedCategories = [];
  const seenCategories = new Set();
  categories.forEach((category) => {
    const categoryValue = normalizeLabel(typeof category === 'string' ? category : category?.name);
    if (!categoryValue) return;
    const dedupeKey = categoryValue.toLowerCase();
    if (seenCategories.has(dedupeKey)) return;
    seenCategories.add(dedupeKey);
    normalizedCategories.push(categoryValue);
  });

  const normalizedTags = [];
  const seenTags = new Set();
  tags.forEach((tag) => {
    const count = typeof tag === 'object' ? Number(tag.count) : null;
    const rawTag = typeof tag === 'string' ? tag : tag?.name;
    const splitTags = splitCompositeTag(rawTag);

    splitTags.forEach((tagValue) => {
      const dedupeKey = tagValue.toLowerCase();
      if (seenTags.has(dedupeKey)) return;
      seenTags.add(dedupeKey);

      const cleanTag = truncateLabel(tagValue);
      const display = Number.isFinite(count) && count > 0 ? `${cleanTag} (${count})` : cleanTag;

      normalizedTags.push({
        value: tagValue,
        display,
        fullText: Number.isFinite(count) && count > 0 ? `${tagValue} (${count})` : tagValue
      });
    });
  });

  const selectedCategoryLabel = selectedCategory === 'all' ? 'All Categories' : truncateLabel(normalizeLabel(selectedCategory));
  const selectedTagLabel = selectedTag === 'all' ? 'All Tags' : truncateLabel(normalizeLabel(selectedTag));

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-[#8a611f] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Service Planning Blog</h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Expert tips, trends, and practical guidance for your service needs
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 mb-6 sm:mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-5 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_220px_240px] gap-3 sm:gap-4 items-center">
            {/* Search Bar */}
            <div className="min-w-0 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative w-full" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen((prev) => !prev);
                  setIsTagDropdownOpen(false);
                }}
                className="w-full px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-left font-medium bg-white text-sm sm:text-base flex items-center justify-between hover:border-indigo-300 transition-colors"
              >
                <span className="truncate">{selectedCategoryLabel}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[70] max-h-64 overflow-y-auto overflow-x-hidden divide-y divide-gray-100">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('all')}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${selectedCategory === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                  >
                    All Categories
                  </button>
                  {normalizedCategories.map((categoryValue, index) => {
                    return (
                      <button
                        key={`${categoryValue}-${index}`}
                        type="button"
                        onClick={() => handleCategoryChange(categoryValue)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${selectedCategory === categoryValue ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                        title={categoryValue}
                      >
                        {truncateLabel(categoryValue)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tag Filter Dropdown */}
            <div className="relative w-full" ref={tagDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsTagDropdownOpen((prev) => !prev);
                  setIsCategoryDropdownOpen(false);
                }}
                className="w-full px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-left font-medium bg-white text-sm sm:text-base flex items-center justify-between hover:border-indigo-300 transition-colors"
              >
                <span className="truncate">{selectedTagLabel}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTagDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-[70] max-h-64 overflow-y-auto overflow-x-hidden divide-y divide-gray-100">
                  <button
                    type="button"
                    onClick={() => handleTagChange('all')}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${selectedTag === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                  >
                    All Tags
                  </button>
                  {normalizedTags.map((tagOption, index) => {
                    return (
                      <button
                        key={`${tagOption.value}-${index}`}
                        type="button"
                        onClick={() => handleTagChange(tagOption.value)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${selectedTag === tagOption.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}
                        title={tagOption.fullText}
                      >
                        {tagOption.display}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory !== 'all' || selectedTag !== 'all') && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">Active filters:</span>
              {selectedCategory !== 'all' && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {selectedCategory}
                </span>
              )}
              {selectedTag !== 'all' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {selectedTag}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-12 h-12 animate-spin text-indigo-600" />
          </div>
        ) : filteredBlogs.length > 0 ? (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredBlogs.length}</span> of{' '}
                <span className="font-bold text-gray-900">{pagination.total}</span> blogs
              </p>
            </div>

            {/* Blog Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {filteredBlogs.map((blog) => (
                <Link
                  key={blog._id}
                  to={`/blogs/${blog.slug}`}
                  className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Featured Image */}
                  {blog.featuredImage && (
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={getImageUrl(blog.featuredImage)}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-full text-sm font-bold">
                          {blog.category || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {blog.excerpt}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(blog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{blog.readTime} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{blog.views || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {blog.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Read More */}
                    <div className="flex items-center gap-2 text-indigo-600 font-semibold group-hover:gap-4 transition-all">
                      <span>Read More</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-10">
                <div className="flex items-center justify-center gap-2 px-1 flex-wrap">
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  className="px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                >
                  Previous
                </button>
                
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPagination({ ...pagination, page: i + 1 })}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pagination.page === i + 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border-2 border-gray-200 hover:border-indigo-600 hover:text-indigo-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                >
                  Next
                </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No blogs found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogListingPage;
