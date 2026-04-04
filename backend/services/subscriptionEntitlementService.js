const VendorMedia = require('../models/VendorMedia');
const VendorVideo = require('../models/VendorVideo');

const PLAN_ENTITLEMENTS = {
  free: {
    portfolioLimit: 5,
    allowVideos: false
  },
  starter: {
    portfolioLimit: 15,
    allowVideos: true
  },
  growth: {
    portfolioLimit: 30,
    allowVideos: true
  },
  premium: {
    portfolioLimit: -1,
    allowVideos: true
  }
};

const getPlanEntitlements = (planKey) => {
  const normalizedPlanKey = String(planKey || 'free').toLowerCase();
  return PLAN_ENTITLEMENTS[normalizedPlanKey] || PLAN_ENTITLEMENTS.free;
};

const sortMediaForPriority = (a, b) => {
  const featuredDiff = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
  if (featuredDiff !== 0) return featuredDiff;

  const orderA = Number.isFinite(a.orderIndex) ? a.orderIndex : 0;
  const orderB = Number.isFinite(b.orderIndex) ? b.orderIndex : 0;
  if (orderA !== orderB) return orderA - orderB;

  const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return createdA - createdB;
};

const resolveAllowedMedia = (media, planKey) => {
  const entitlements = getPlanEntitlements(planKey);
  const sorted = [...media].sort(sortMediaForPriority);

  if (entitlements.portfolioLimit === -1) {
    const allIds = new Set(sorted.map((m) => String(m._id)));
    return {
      allowVideos: entitlements.allowVideos,
      allowedMediaIds: allIds
    };
  }

  if (!entitlements.allowVideos) {
    const imageIds = sorted
      .filter((m) => m.type !== 'video')
      .slice(0, entitlements.portfolioLimit)
      .map((m) => String(m._id));

    return {
      allowVideos: false,
      allowedMediaIds: new Set(imageIds)
    };
  }

  const combinedIds = sorted
    .slice(0, entitlements.portfolioLimit)
    .map((m) => String(m._id));

  return {
    allowVideos: true,
    allowedMediaIds: new Set(combinedIds)
  };
};

const applyVendorMediaEntitlements = async (vendorId, planKey) => {
  const media = await VendorMedia.find({ vendorId })
    .select('_id type publicId isFeatured orderIndex createdAt visibility')
    .lean();

  if (!media.length) {
    return {
      success: true,
      updatedMedia: 0,
      updatedVideos: 0,
      planKey: String(planKey || 'free').toLowerCase()
    };
  }

  const { allowVideos, allowedMediaIds } = resolveAllowedMedia(media, planKey);

  const mediaBulkOps = media.map((m) => ({
    updateOne: {
      filter: { _id: m._id },
      update: {
        $set: {
          visibility: allowedMediaIds.has(String(m._id)) ? 'public' : 'hidden'
        }
      }
    }
  }));

  const mediaBulkResult = mediaBulkOps.length
    ? await VendorMedia.bulkWrite(mediaBulkOps, { ordered: false })
    : null;

  const allowedVideoPublicIds = media
    .filter((m) => m.type === 'video' && allowedMediaIds.has(String(m._id)) && m.publicId)
    .map((m) => m.publicId);

  let updatedVideos = 0;

  const hideVideosResult = await VendorVideo.updateMany(
    { vendorId },
    { $set: { visibility: 'hidden' } }
  );
  updatedVideos += hideVideosResult.modifiedCount || 0;

  if (allowVideos && allowedVideoPublicIds.length) {
    const showVideosResult = await VendorVideo.updateMany(
      { vendorId, publicId: { $in: allowedVideoPublicIds } },
      { $set: { visibility: 'public' } }
    );
    updatedVideos += showVideosResult.modifiedCount || 0;
  }

  return {
    success: true,
    planKey: String(planKey || 'free').toLowerCase(),
    updatedMedia: mediaBulkResult?.modifiedCount || 0,
    updatedVideos
  };
};

module.exports = {
  getPlanEntitlements,
  applyVendorMediaEntitlements
};
