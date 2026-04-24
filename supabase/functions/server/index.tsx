import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as security from "./security.tsx";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Security: Add hardened CORS with specific origin validation
app.use(
  "/*",
  cors({
    origin: ["http://localhost:4173", "http://localhost:5173", "http://127.0.0.1:4173", "http://127.0.0.1:5173", "https://sharecrops.app"],
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 600,
    credentials: true,
  }),
);

// Security: Add security headers middleware
app.use('/*', async (c, next) => {
  const headers = security.getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    c.header(key, value as string);
  });
  await next();
});

// Security: Rate limiting middleware
app.use('/*', async (c, next) => {
  const { allowed, remaining, resetTime } = security.rateLimit(c.req);

  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', resetTime.toString());

  if (!allowed) {
    security.logSecurityEvent('rate_limit_exceeded', 'medium', {
      ip: security.getClientIp(c.req),
      path: c.req.path,
      timestamp: new Date().toISOString(),
    });
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  await next();
});

// Supabase clients
const getServiceRoleClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const getAnonClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Initialize storage bucket
const initStorage = async () => {
  const supabase = getServiceRoleClient();
  const bucketName = 'make-dd877831-sharecrops';

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
    console.log(`Created storage bucket: ${bucketName}`);
  }
};

// Initialize on startup
initStorage();

// Helper: Get authenticated user
const getAuthUser = async (authHeader: string | null) => {
  if (!authHeader) {
    security.logSecurityEvent('missing_auth_header', 'medium', { timestamp: new Date().toISOString() });
    return null;
  }

  // Validate token structure
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    security.logSecurityEvent('invalid_auth_format', 'medium', { 
      format: parts[0],
      timestamp: new Date().toISOString() 
    });
    return null;
  }

  const token = parts[1];

  // Validate token structure (basic JWT validation)
  const tokenValidation = security.validateJwtStructure(token);
  if (!tokenValidation.valid) {
    security.logSecurityEvent('invalid_token_structure', 'high', {
      error: tokenValidation.error,
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  try {
    const supabase = getServiceRoleClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      security.logSecurityEvent('auth_error', 'high', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    if (!user) {
      security.logSecurityEvent('no_user_in_token', 'medium', {
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    // Validate user object has required fields
    if (!user.id || !user.email) {
      security.logSecurityEvent('incomplete_user_data', 'high', {
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    return user;
  } catch (error) {
    security.logSecurityEvent('auth_exception', 'critical', {
      error: String(error),
      timestamp: new Date().toISOString(),
    });
    return null;
  }
};

const MAX_LISTING_EXPIRATION_DAYS = 30;

const getCommunityMembershipKey = (userId: string, communityId: string) =>
  `user:${userId}:community_member:${communityId}`;

const addMembership = async (userId: string, communityId: string) => {
  await kv.set(getCommunityMembershipKey(userId, communityId), {
    userId,
    communityId,
    joinedAt: new Date().toISOString(),
  });
};

const getMembershipCommunityIds = async (userId: string): Promise<string[]> => {
  const memberships = await kv.getByPrefix(`user:${userId}:community_member:`);
  if (!Array.isArray(memberships)) return [];

  const ids = memberships
    .map((m: any) => m?.communityId)
    .filter((id: any) => typeof id === 'string');

  return [...new Set(ids)];
};

const getMembershipCommunities = async (userId: string): Promise<any[]> => {
  const communityIds = await getMembershipCommunityIds(userId);
  const communities: any[] = [];

  for (const id of communityIds) {
    const community = await kv.get(`community:id:${id}`);
    if (community) {
      communities.push(community);
    }
  }

  return communities;
};

const isListingExpired = (listing: any): boolean => {
  if (!listing?.expiresAt) return false;
  const expiresAt = new Date(listing.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return Date.now() >= expiresAt;
};

const deleteListingRecords = async (listing: any) => {
  if (!listing?.id) return;

  await kv.del(`listing:${listing.id}`);

  if (listing.communityId) {
    await kv.del(`listing:community:${listing.communityId}:${listing.id}`);
  }

  if (listing.sellerId) {
    await kv.del(`listing:user:${listing.sellerId}:${listing.id}`);
  }
};

const toSerializableObject = (value: any): any | null => {
  if (!value || typeof value !== 'object') return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

// Health check endpoint
app.get("/make-server-dd877831/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== AUTH ROUTES =====

app.post("/make-server-dd877831/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    // Input validation
    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    // Validate email format
    const emailValidation = security.validateInput(email, 'email');
    if (!emailValidation.valid) {
      security.logSecurityEvent('invalid_email_format', 'low', { email });
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Validate name
    const nameValidation = security.validateInput(name, 'string', { minLength: 1, maxLength: 100 });
    if (!nameValidation.valid) {
      security.logSecurityEvent('invalid_name_format', 'low', { name });
      return c.json({ error: "Name must be 1-100 characters" }, 400);
    }

    // Validate password strength (min 8 chars, at least 1 uppercase, 1 number)
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return c.json({ error: "Password must be at least 8 characters with uppercase and numbers" }, 400);
    }

    // Prevent SQL injection patterns
    const sqlSafety = security.validateQuerySafety(email + name);
    if (!sqlSafety.safe) {
      security.logSecurityEvent('sql_injection_attempt', 'high', {
        ip: security.getClientIp(c.req),
        email: email.substring(0, 5),
      });
      return c.json({ error: "Invalid input detected" }, 400);
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (error) {
      console.error("Signup error:", error);
      security.logSecurityEvent('signup_error', 'medium', { error: error.message });
      return c.json({ error: error.message }, 400);
    }

    // Sanitize user data before storing
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email: security.sanitizeString(email),
      name: security.sanitizeString(name),
      bio: '',
      socialUrl: '',
      profilePhotoUrl: '',
      rating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
    });

    security.logSecurityEvent('user_signup', 'low', { userId: data.user.id });
    return c.json({ success: true, userId: data.user.id });
  } catch (error) {
    console.error("Signup error:", error);
    security.logSecurityEvent('signup_exception', 'critical', { error: String(error) });
    return c.json({ error: "Signup failed" }, 500);
  }
});

app.post("/make-server-dd877831/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Input validation
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Validate email format
    const emailValidation = security.validateInput(email, 'email');
    if (!emailValidation.valid) {
      security.logSecurityEvent('invalid_login_email', 'low', { ip: security.getClientIp(c.req) });
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Rate limiting already applied via middleware, but we can add attempt tracking
    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Login error:", error);
      security.logSecurityEvent('login_failed', 'low', {
        ip: security.getClientIp(c.req),
        email: email.substring(0, 5),
      });
      return c.json({ error: "Invalid credentials" }, 401);
    }

    security.logSecurityEvent('user_login', 'low', { userId: data.user.id });
    return c.json({
      success: true,
      accessToken: data.session.access_token,
      userId: data.user.id
    });
  } catch (error) {
    console.error("Login error:", error);
    security.logSecurityEvent('login_exception', 'critical', { error: String(error) });
    return c.json({ error: "Login failed" }, 500);
  }
});

app.get("/make-server-dd877831/auth/me", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await kv.get(`user:${user.id}`);
  return c.json({ user: profile });
});

// ===== COMMUNITY ROUTES =====

app.post("/make-server-dd877831/communities", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { name, zipCode } = await c.req.json();

    if (!name || !zipCode) {
      return c.json({ error: "Name and zip code are required" }, 400);
    }

    // Normalize for duplicate check
    const normalizedName = name.toLowerCase().trim();
    const normalizedZip = zipCode.trim();
    const communityKey = `community:${normalizedZip}:${normalizedName}`;

    // Check for duplicate
    const existing = await kv.get(communityKey);
    if (existing) {
      return c.json({ error: "A community with this name already exists in this zip code", duplicate: true }, 409);
    }

    const communityId = crypto.randomUUID();
    const community = {
      id: communityId,
      name,
      zipCode,
      createdBy: user.id,
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };

    await kv.set(communityKey, community);
    await kv.set(`community:id:${communityId}`, community);
    await kv.set(`user:${user.id}:community`, communityId);
    await addMembership(user.id, communityId);

    return c.json({ success: true, community });
  } catch (error) {
    console.error("Create community error:", error);
    return c.json({ error: "Failed to create community" }, 500);
  }
});

app.post("/make-server-dd877831/communities/join", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { communityId } = await c.req.json();

    if (!communityId) {
      return c.json({ error: "Community ID is required" }, 400);
    }

    const community = await kv.get(`community:id:${communityId}`);
    if (!community) {
      return c.json({ error: "Community not found" }, 404);
    }

    const existingMembership = await kv.get(getCommunityMembershipKey(user.id, communityId));

    // Already a member: make this active community and return success.
    if (existingMembership) {
      await kv.set(`user:${user.id}:community`, communityId);
      return c.json({ success: true, community, alreadyMember: true });
    }

    await kv.set(`user:${user.id}:community`, communityId);
    await addMembership(user.id, communityId);

    // Increment member count
    community.memberCount = (community.memberCount || 1) + 1;
    await kv.set(`community:id:${communityId}`, community);
    await kv.set(`community:${community.zipCode}:${community.name.toLowerCase().trim()}`, community);

    return c.json({ success: true, community });
  } catch (error) {
    console.error("Join community error:", error);
    return c.json({ error: "Failed to join community" }, 500);
  }
});

app.get("/make-server-dd877831/communities/search", async (c) => {
  try {
    const zipCode = c.req.query('zipCode');
    if (!zipCode) {
      return c.json({ error: "Zip code is required" }, 400);
    }

    const communities = await kv.getByPrefix(`community:${zipCode}:`);
    return c.json({ communities });
  } catch (error) {
    console.error("Search communities error:", error);
    return c.json({ error: "Failed to search communities" }, 500);
  }
});

app.get("/make-server-dd877831/communities/my", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    let communityId = await kv.get(`user:${user.id}:community`);

    if (!communityId) {
      const communityIds = await getMembershipCommunityIds(user.id);
      if (communityIds.length > 0) {
        communityId = communityIds[0];
        await kv.set(`user:${user.id}:community`, communityId);
      }
    }

    if (!communityId) {
      return c.json({ community: null });
    }

    const community = await kv.get(`community:id:${communityId}`);

    if (!community) {
      await kv.del(`user:${user.id}:community`);
      return c.json({ community: null });
    }

    return c.json({ community });
  } catch (error) {
    console.error("Get my community error:", error);
    return c.json({ error: "Failed to get community" }, 500);
  }
});

app.get("/make-server-dd877831/communities/mine", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const communities = await getMembershipCommunities(user.id);
    const activeCommunityId = await kv.get(`user:${user.id}:community`);
    return c.json({ communities, activeCommunityId });
  } catch (error) {
    console.error("Get my communities error:", error);
    return c.json({ error: "Failed to get communities" }, 500);
  }
});

app.delete("/make-server-dd877831/communities/mine/:communityId", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const communityId = c.req.param('communityId');
    const membershipKey = getCommunityMembershipKey(user.id, communityId);
    const membership = await kv.get(membershipKey);

    if (!membership) {
      return c.json({ error: "You are not a member of this community" }, 404);
    }

    const community = await kv.get(`community:id:${communityId}`);
    if (community) {
      community.memberCount = Math.max((community.memberCount || 1) - 1, 0);
      await kv.set(`community:id:${communityId}`, community);
      await kv.set(`community:${community.zipCode}:${community.name.toLowerCase().trim()}`, community);
    }

    await kv.del(membershipKey);

    const activeCommunityId = await kv.get(`user:${user.id}:community`);
    if (activeCommunityId === communityId) {
      const remainingIds = await getMembershipCommunityIds(user.id);
      if (remainingIds.length > 0) {
        await kv.set(`user:${user.id}:community`, remainingIds[0]);
      } else {
        await kv.del(`user:${user.id}:community`);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Leave community error:", error);
    return c.json({ error: "Failed to leave community" }, 500);
  }
});

// ===== LISTING ROUTES =====

app.post("/make-server-dd877831/listings", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { title, description, quantity, photos, lookingFor, expiresInDays } = await c.req.json();

    // Input validation
    const titleValidation = security.validateInput(title, 'string', { minLength: 1, maxLength: 200 });
    if (!titleValidation.valid) {
      security.logSecurityEvent('invalid_listing_title', 'low', { userId: user.id });
      return c.json({ error: "Title must be 1-200 characters" }, 400);
    }

    const descValidation = security.validateInput(description, 'string', { minLength: 0, maxLength: 2000 });
    if (!descValidation.valid) {
      return c.json({ error: "Description must be 0-2000 characters" }, 400);
    }

    const quantityValidation = security.validateInput(quantity, 'string', { minLength: 1, maxLength: 100 });
    if (!quantityValidation.valid) {
      return c.json({ error: "Quantity must be specified" }, 400);
    }

    const photosValidation = security.validateInput(photos || [], 'array', { maxItems: 5 });
    if (!photosValidation.valid) {
      security.logSecurityEvent('invalid_photos_array', 'low', { userId: user.id });
      return c.json({ error: "Maximum 5 photos allowed" }, 400);
    }

    const lookingForValidation = security.validateInput(lookingFor || '', 'string', { maxLength: 500 });
    if (!lookingForValidation.valid) {
      return c.json({ error: "Looking for description must be 0-500 characters" }, 400);
    }

    // Validate expiration
    const parsedExpiration = Number(expiresInDays ?? 30);
    if (!Number.isInteger(parsedExpiration) || parsedExpiration < 1 || parsedExpiration > MAX_LISTING_EXPIRATION_DAYS) {
      return c.json({ error: `Expiration must be an integer between 1 and ${MAX_LISTING_EXPIRATION_DAYS} days` }, 400);
    }

    // Prevent SQL injection in text fields
    const sqlSafety = security.validateQuerySafety(title + description + quantity);
    if (!sqlSafety.safe) {
      security.logSecurityEvent('sql_injection_in_listing', 'high', { userId: user.id });
      return c.json({ error: "Invalid characters detected in input" }, 400);
    }

    const communityId = await kv.get(`user:${user.id}:community`);
    if (!communityId) {
      return c.json({ error: "You must join a community first" }, 400);
    }

    const community = await kv.get(`community:id:${communityId}`);

    const listingId = crypto.randomUUID();
    const listing = {
      id: listingId,
      sellerId: user.id,
      title: security.sanitizeString(title),
      description: security.sanitizeString(description),
      quantity: security.sanitizeString(quantity),
      photos: photos || [],
      lookingFor: security.sanitizeString(lookingFor || ''),
      communityId,
      zipCode: community.zipCode,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + parsedExpiration * 24 * 60 * 60 * 1000).toISOString(),
    };

    await kv.set(`listing:${listingId}`, listing);
    await kv.set(`listing:community:${communityId}:${listingId}`, listing);
    await kv.set(`listing:user:${user.id}:${listingId}`, listing);

    security.logSecurityEvent('listing_created', 'low', { userId: user.id, listingId });
    return c.json({ success: true, listing });
  } catch (error) {
    console.error("Create listing error:", error);
    security.logSecurityEvent('create_listing_exception', 'critical', { error: String(error) });
    return c.json({ error: "Failed to create listing" }, 500);
  }
});

app.get("/make-server-dd877831/listings", async (c) => {
  try {
    const communityId = c.req.query('communityId');
    const zipCode = c.req.query('zipCode');

    let listings = [];

    if (communityId) {
      listings = await kv.getByPrefix(`listing:community:${communityId}:`);
    } else if (zipCode) {
      const allListings = await kv.getByPrefix('listing:community:');
      listings = allListings.filter((l: any) => l.zipCode === zipCode);
    } else {
      listings = await kv.getByPrefix('listing:community:');
    }

    const safeListings = Array.isArray(listings)
      ? listings.filter((l: any) => l && typeof l === 'object')
      : [];

    const activeListings: any[] = [];
    for (const listing of safeListings) {
      if (isListingExpired(listing)) {
        await deleteListingRecords(listing);
        continue;
      }

      if (listing.status === 'active') {
        activeListings.push(listing);
      }
    }

    // Sort by created date (newest first)
    activeListings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ listings: activeListings });
  } catch (error) {
    console.error("Get listings error:", error);
    return c.json({ error: "Failed to get listings" }, 500);
  }
});

app.get("/make-server-dd877831/listings/:id", async (c) => {
  try {
    const id = c.req.param('id');
    console.log(`[GET /listings/:id] Fetching listing with id: ${id}`);

    if (!id || typeof id !== 'string') {
      return c.json({ error: "Listing not found" }, 404);
    }
    
    // Use the same source as the list endpoint. This avoids stale/corrupted
    // primary keys and keeps detail fetch behavior consistent with listing feed.
    let listing: any = null;
    try {
      const allCommunityListings = await kv.getByPrefix('listing:community:');
      if (Array.isArray(allCommunityListings)) {
        listing = allCommunityListings.find((l: any) => l && typeof l === 'object' && l.id === id) || null;
      }
    } catch (searchError) {
      console.error(`[GET /listings/:id] Community index search failed:`, searchError);
      return c.json({ error: "Failed to get listing" }, 500);
    }

    if (!listing || typeof listing !== 'object') {
      console.log(`[GET /listings/:id] Listing not found or invalid type`);
      return c.json({ error: "Listing not found" }, 404);
    }

    const safeListing = toSerializableObject(listing);
    if (!safeListing) {
      console.log(`[GET /listings/:id] Listing is not serializable`);
      return c.json({ error: "Listing not found" }, 404);
    }

    if (isListingExpired(safeListing)) {
      console.log(`[GET /listings/:id] Listing is expired`);
      try {
        await deleteListingRecords(safeListing);
      } catch (cleanupError) {
        console.error(`[GET /listings/:id] Expired listing cleanup failed:`, cleanupError);
      }
      return c.json({ error: "Listing not found" }, 404);
    }

    // Seller lookup should not fail the whole listing response.
    let seller = null;
    if (safeListing.sellerId) {
      try {
        seller = await kv.get(`user:${safeListing.sellerId}`);
      } catch (sellerError) {
        console.error("Get listing seller error:", sellerError);
      }
    }

    const safeSeller = toSerializableObject(seller);
    const response = { listing: { ...safeListing, seller: safeSeller } };
    console.log(`[GET /listings/:id] Returning response, listing has keys:`, Object.keys(safeListing || {}).join(','));
    return c.json(response);
  } catch (error) {
    console.error("Get listing error:", error);
    return c.json({ error: "Failed to get listing" }, 500);
  }
});

app.delete("/make-server-dd877831/listings/:id", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const id = c.req.param('id');
    const listing = await kv.get(`listing:${id}`);

    if (!listing || typeof listing !== 'object') {
      return c.json({ error: "Listing not found" }, 404);
    }

    if (listing.sellerId !== user.id) {
      return c.json({ error: "Only the seller can delete this listing" }, 403);
    }

    await deleteListingRecords(listing);
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete listing error:", error);
    return c.json({ error: "Failed to delete listing" }, 500);
  }
});

app.get("/make-server-dd877831/listings/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log(`[GET /listings/user/:userId] Fetching listings for userId: ${userId}`);
    
    let rawListings;
    try {
      rawListings = await kv.getByPrefix(`listing:user:${userId}:`);
      console.log(`[GET /listings/user/:userId] KV.getByPrefix returned:`, Array.isArray(rawListings) ? `array with ${rawListings.length} items` : "non-array");
    } catch (kvError) {
      console.error(`[GET /listings/user/:userId] KV.getByPrefix failed:`, kvError);
      return c.json({ error: "Failed to fetch listings from store" }, 500);
    }
    
    const safeListings = Array.isArray(rawListings)
      ? rawListings.filter((l: any) => l && typeof l === 'object')
      : [];

    console.log(`[GET /listings/user/:userId] After filtering: ${safeListings.length} safe listings`);

    const visibleListings: any[] = [];
    for (const listing of safeListings) {
      if (isListingExpired(listing)) {
        await deleteListingRecords(listing);
        continue;
      }
      visibleListings.push(listing);
    }

    console.log(`[GET /listings/user/:userId] After expiration check: ${visibleListings.length} visible listings`);
    visibleListings.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return c.json({ listings: visibleListings });
  } catch (error) {
    console.error("Get user listings error:", error);
    return c.json({ error: "Failed to get user listings" }, 500);
  }
});

// ===== OFFER ROUTES =====

app.post("/make-server-dd877831/offers", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { listingId, offeredProduce, message } = await c.req.json();

    if (!offeredProduce) {
      return c.json({ error: "You must specify what you're offering" }, 400);
    }

    const listing = await kv.get(`listing:${listingId}`);
    if (!listing) {
      return c.json({ error: "Listing not found" }, 404);
    }

    if (listing.sellerId === user.id) {
      return c.json({ error: "You cannot make an offer on your own listing" }, 400);
    }

    const offerId = crypto.randomUUID();
    const offer = {
      id: offerId,
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      offeredProduce,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`offer:${offerId}`, offer);
    await kv.set(`offer:listing:${listingId}:${offerId}`, offer);
    await kv.set(`offer:buyer:${user.id}:${offerId}`, offer);
    await kv.set(`offer:seller:${listing.sellerId}:${offerId}`, offer);

    return c.json({ success: true, offer });
  } catch (error) {
    console.error("Create offer error:", error);
    return c.json({ error: "Failed to create offer" }, 500);
  }
});

app.post("/make-server-dd877831/offers/:id/accept", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const offerId = c.req.param('id');
    const offer = await kv.get(`offer:${offerId}`);

    if (!offer) {
      return c.json({ error: "Offer not found" }, 404);
    }

    if (offer.sellerId !== user.id) {
      return c.json({ error: "Only the seller can accept offers" }, 403);
    }

    offer.status = 'accepted';
    offer.acceptedAt = new Date().toISOString();

    await kv.set(`offer:${offerId}`, offer);
    await kv.set(`offer:listing:${offer.listingId}:${offerId}`, offer);
    await kv.set(`offer:buyer:${offer.buyerId}:${offerId}`, offer);
    await kv.set(`offer:seller:${offer.sellerId}:${offerId}`, offer);

    return c.json({ success: true, offer });
  } catch (error) {
    console.error("Accept offer error:", error);
    return c.json({ error: "Failed to accept offer" }, 500);
  }
});

app.post("/make-server-dd877831/offers/:id/decline", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const offerId = c.req.param('id');
    const offer = await kv.get(`offer:${offerId}`);

    if (!offer) {
      return c.json({ error: "Offer not found" }, 404);
    }

    if (offer.sellerId !== user.id) {
      return c.json({ error: "Only the seller can decline offers" }, 403);
    }

    offer.status = 'declined';
    offer.declinedAt = new Date().toISOString();

    await kv.set(`offer:${offerId}`, offer);
    await kv.set(`offer:listing:${offer.listingId}:${offerId}`, offer);
    await kv.set(`offer:buyer:${offer.buyerId}:${offerId}`, offer);
    await kv.set(`offer:seller:${offer.sellerId}:${offerId}`, offer);

    return c.json({ success: true, offer });
  } catch (error) {
    console.error("Decline offer error:", error);
    return c.json({ error: "Failed to decline offer" }, 500);
  }
});

app.post("/make-server-dd877831/offers/:id/complete", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const offerId = c.req.param('id');
    const offer = await kv.get(`offer:${offerId}`);

    if (!offer) {
      return c.json({ error: "Offer not found" }, 404);
    }

    if (offer.sellerId !== user.id && offer.buyerId !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    if (offer.status !== 'accepted') {
      return c.json({ error: "Only accepted offers can be completed" }, 400);
    }

    offer.status = 'completed';
    offer.completedAt = new Date().toISOString();

    await kv.set(`offer:${offerId}`, offer);
    await kv.set(`offer:listing:${offer.listingId}:${offerId}`, offer);
    await kv.set(`offer:buyer:${offer.buyerId}:${offerId}`, offer);
    await kv.set(`offer:seller:${offer.sellerId}:${offerId}`, offer);

    return c.json({ success: true, offer });
  } catch (error) {
    console.error("Complete offer error:", error);
    return c.json({ error: "Failed to complete offer" }, 500);
  }
});

app.get("/make-server-dd877831/offers/my", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const asType = c.req.query('as'); // 'buyer' or 'seller'

    let offers = [];
    if (asType === 'buyer') {
      offers = await kv.getByPrefix(`offer:buyer:${user.id}:`);
    } else if (asType === 'seller') {
      offers = await kv.getByPrefix(`offer:seller:${user.id}:`);
    } else {
      const buyerOffers = await kv.getByPrefix(`offer:buyer:${user.id}:`);
      const sellerOffers = await kv.getByPrefix(`offer:seller:${user.id}:`);
      offers = [...buyerOffers, ...sellerOffers];
    }

    offers.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ offers });
  } catch (error) {
    console.error("Get my offers error:", error);
    return c.json({ error: "Failed to get offers" }, 500);
  }
});

// ===== CHAT ROUTES =====

app.post("/make-server-dd877831/chat/threads", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { listingId, otherUserId } = await c.req.json();

    // Check if thread already exists
    const threadId = [user.id, otherUserId].sort().join(':');
    const existingThread = await kv.get(`thread:${threadId}:${listingId}`);

    if (existingThread) {
      return c.json({ thread: existingThread });
    }

    const thread = {
      id: `${threadId}:${listingId}`,
      listingId,
      participants: [user.id, otherUserId],
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await kv.set(`thread:${threadId}:${listingId}`, thread);
    await kv.set(`thread:user:${user.id}:${thread.id}`, thread);
    await kv.set(`thread:user:${otherUserId}:${thread.id}`, thread);

    return c.json({ thread });
  } catch (error) {
    console.error("Create thread error:", error);
    return c.json({ error: "Failed to create thread" }, 500);
  }
});

app.post("/make-server-dd877831/chat/messages", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { threadId, content } = await c.req.json();

    const thread = await kv.get(`thread:${threadId}`);
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404);
    }

    if (!thread.participants.includes(user.id)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      threadId,
      senderId: user.id,
      content,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`message:${messageId}`, message);
    await kv.set(`message:thread:${threadId}:${messageId}`, message);

    // Update thread
    thread.lastMessage = content;
    thread.lastMessageAt = message.createdAt;
    await kv.set(`thread:${threadId}`, thread);

    // Update for both participants
    for (const participantId of thread.participants) {
      await kv.set(`thread:user:${participantId}:${thread.id}`, thread);
    }

    return c.json({ success: true, message });
  } catch (error) {
    console.error("Send message error:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

app.get("/make-server-dd877831/chat/threads", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const threads = await kv.getByPrefix(`thread:user:${user.id}:`);
    threads.sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return c.json({ threads });
  } catch (error) {
    console.error("Get threads error:", error);
    return c.json({ error: "Failed to get threads" }, 500);
  }
});

app.get("/make-server-dd877831/chat/messages/:threadId", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const threadId = c.req.param('threadId');
    const thread = await kv.get(`thread:${threadId}`);

    if (!thread || !thread.participants.includes(user.id)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const messages = await kv.getByPrefix(`message:thread:${threadId}:`);
    messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return c.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

// ===== RATING ROUTES =====

app.post("/make-server-dd877831/ratings", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const { offerId, rating, comment } = await c.req.json();

    if (rating < 1 || rating > 5) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    const offer = await kv.get(`offer:${offerId}`);
    if (!offer) {
      return c.json({ error: "Offer not found" }, 404);
    }

    if (offer.status !== 'completed') {
      return c.json({ error: "Can only rate completed exchanges" }, 400);
    }

    // Determine who is being rated
    const ratedUserId = offer.sellerId === user.id ? offer.buyerId : offer.sellerId;

    // Check if already rated
    const existingRating = await kv.get(`rating:${offerId}:${user.id}`);
    if (existingRating) {
      return c.json({ error: "You have already rated this exchange" }, 400);
    }

    const ratingId = crypto.randomUUID();
    const newRating = {
      id: ratingId,
      offerId,
      ratedUserId,
      raterUserId: user.id,
      rating,
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`rating:${ratingId}`, newRating);
    await kv.set(`rating:${offerId}:${user.id}`, newRating);
    await kv.set(`rating:user:${ratedUserId}:${ratingId}`, newRating);

    // Update user's rating
    const ratedUser = await kv.get(`user:${ratedUserId}`);
    if (ratedUser) {
      const currentTotal = (ratedUser.rating || 0) * (ratedUser.ratingCount || 0);
      const newCount = (ratedUser.ratingCount || 0) + 1;
      const newAverage = (currentTotal + rating) / newCount;

      ratedUser.rating = Math.round(newAverage * 10) / 10; // Round to 1 decimal
      ratedUser.ratingCount = newCount;

      await kv.set(`user:${ratedUserId}`, ratedUser);
    }

    return c.json({ success: true, rating: newRating });
  } catch (error) {
    console.error("Create rating error:", error);
    return c.json({ error: "Failed to create rating" }, 500);
  }
});

app.get("/make-server-dd877831/ratings/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const ratings = await kv.getByPrefix(`rating:user:${userId}:`);

    ratings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ ratings });
  } catch (error) {
    console.error("Get user ratings error:", error);
    return c.json({ error: "Failed to get ratings" }, 500);
  }
});

// ===== PROFILE ROUTES =====

app.put("/make-server-dd877831/profile", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const updates = await c.req.json();
    const profile = await kv.get(`user:${user.id}`);

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Update allowed fields
    if (updates.name !== undefined) profile.name = updates.name;
    if (updates.bio !== undefined) profile.bio = updates.bio;
    if (updates.socialUrl !== undefined) profile.socialUrl = updates.socialUrl;
    if (updates.profilePhotoUrl !== undefined) profile.profilePhotoUrl = updates.profilePhotoUrl;

    await kv.set(`user:${user.id}`, profile);

    return c.json({ success: true, profile });
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

app.get("/make-server-dd877831/profile/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const profile = await kv.get(`user:${userId}`);

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

// ===== STORAGE ROUTES =====

app.post("/make-server-dd877831/upload", async (c) => {
  const user = await getAuthUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const supabase = getServiceRoleClient();
    const bucketName = 'make-dd877831-sharecrops';
    const fileName = `${user.id}/${crypto.randomUUID()}-${file.name}`;

    const fileBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error("Upload error:", error);
      return c.json({ error: "Upload failed" }, 500);
    }

    // Generate signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);

    return c.json({ success: true, url: urlData?.signedUrl, path: fileName });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

Deno.serve(app.fetch);