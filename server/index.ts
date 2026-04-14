import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type VerifyAccessTokenResponse } from '@privy-io/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server/ directory
dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PRIVY_APP_ID = process.env.PRIVY_APP_ID || '';
const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY || '';

type AuthedRequest = Request & { auth?: VerifyAccessTokenResponse; authUser?: { address: string; privy_id?: string | null } | null };

const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  if (!PRIVY_APP_ID || !PRIVY_VERIFICATION_KEY) {
    return res.status(500).json({ error: 'Auth not configured' });
  }

  try {
    const payload = await verifyAccessToken({
      access_token: token,
      app_id: PRIVY_APP_ID,
      verification_key: PRIVY_VERIFICATION_KEY,
    });
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
};

const loadAuthUser = async (req: AuthedRequest) => {
  if (req.authUser !== undefined) return req.authUser;
  if (!req.auth?.user_id) {
    req.authUser = null;
    return null;
  }
  const user = await User.findOne({ privy_id: req.auth.user_id });
  req.authUser = user ? { address: user.address, privy_id: user.privy_id } : null;
  return req.authUser;
};

const ensureUserMatchesAddress = async (req: AuthedRequest, res: Response, address?: string | null) => {
  if (!address) return res.status(400).json({ error: 'address required' });
  const authUser = await loadAuthUser(req);
  if (!authUser || authUser.address.toLowerCase() !== address.toLowerCase()) {
    return res.status(403).json({ error: 'Not authorized for this address' });
  }
  return null;
};

const ensureUserMatchesPrivyId = async (req: AuthedRequest, res: Response, privyId?: string | null) => {
  if (!privyId) return res.status(400).json({ error: 'privy_id required' });
  if (!req.auth?.user_id || req.auth.user_id !== privyId) {
    return res.status(403).json({ error: 'Not authorized for this user' });
  }
  return null;
};

const ensureVaultParticipant = async (req: AuthedRequest, res: Response, planId: string) => {
  const authUser = await loadAuthUser(req);
  if (!authUser) return res.status(403).json({ error: 'Not authorized' });

  const vault = await Vault.findOne({ planId });
  if (!vault) return res.status(404).json({ error: 'Vault not found' });

  const addr = authUser.address.toLowerCase();
  const creator = vault.creatorAddress?.toLowerCase();
  const partner = vault.partnerAddress?.toLowerCase();

  if (addr !== creator && addr !== partner) {
    return res.status(403).json({ error: 'Not authorized for this vault' });
  }

  return null;
};

// ── LI.FI API Configuration ──────────────────────────────────
const EARN_API_BASE = 'https://earn.li.fi';
const COMPOSER_API_BASE = 'https://li.quest';
const COMPOSER_API_KEY = process.env.COMPOSER_API_KEY || '';
const EARN_API_KEY = process.env.LIFI_EARN_API_KEY || '';

// Preferred chains for auto-yield routing (low gas L2s + Ethereum Mainnet)
const PREFERRED_CHAIN_IDS = [1, 8453, 42161]; // Ethereum, Base, Arbitrum

// ── Connect to MongoDB ────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/equilibria';
let isDbConnected = false;
mongoose
  .connect(MONGO_URI, { 
    serverSelectionTimeoutMS: 2000, // Fail fast (2s) if Atlas is down
    connectTimeoutMS: 5000 
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    isDbConnected = true;
  })
  .catch((err) => {
    console.warn('❌ MongoDB connection error (demo will use memory-only):', err.message);
    isDbConnected = false;
  });

// ── Mongoose Models ───────────────────────────────────────────

// User profile model
const UserSchema = new mongoose.Schema({
  privy_id: { type: String, sparse: true, unique: true }, // Optional after Privy removal
  address: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, default: '' },
  avatar: { type: String, default: null },
  bio: { type: String, default: '' },
  contacts: [{ type: String }], // Array of contact addresses
  tokenPoints: { type: Number, default: 0 },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);

// Contact model (for tracking when contacts were added, favorites, etc.)
const ContactSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  contactAddress: { type: String, required: true },
  contactUsername: { type: String, required: true },
  favorite: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
});

ContactSchema.index({ userId: 1, contactAddress: 1 }, { unique: true });
const Contact = mongoose.model('Contact', ContactSchema);

// Shared Vault metadata (off-chain coordination only)
const VaultSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true },
  creatorAddress: { type: String, required: true },
  partnerAddress: { type: String, default: null },
  inviteCode: { type: String, required: true, unique: true },
  isPartnerAccepted: { type: Boolean, default: false },
  planName: { type: String, required: true },
  token: { type: String, required: true },
  chain: { type: String, default: 'base' },
  type: { type: String, default: 'individual' },
  category: { type: String, default: 'other' },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  creatorContribution: { type: Number, default: 0 },
  partnerContribution: { type: Number, default: 0 },
  yieldEarned: { type: Number, default: 0 },
  apy: { type: Number, default: 0 },
  lockDurationDays: { type: Number, default: 30 },
  withdrawalDate: { type: Date, required: true },
  depositToDefi: { type: Boolean, default: true },
  defiProtocol: { type: String, default: null },
  defiVaultName: { type: String, default: null },
  defiChainId: { type: Number, default: null },
  defiVaultAddress: { type: String, default: null },
  policyAgreed: { type: Boolean, default: true },
  sharedOnX: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Vault = mongoose.model('Vault', VaultSchema);

// Withdrawal Request schema (for 2/2 approval pattern)
const WithdrawalRequestSchema = new mongoose.Schema({
  planId: { type: String, required: true },
  requestedBy: { type: String, required: true },
  amount: { type: Number, required: true },
  penaltyAmount: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'executed'], default: 'pending' },
  creatorApproved: { type: Boolean, default: false },
  partnerApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  executedAt: { type: Date, default: null },
  txHash: { type: String, default: null },
  txStatus: { type: String, default: null },
});

const WithdrawalRequest = mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);

// Activity Log schema (for vault event tracking)
const ActivityLogSchema = new mongoose.Schema({
  planId: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_executed', 'partner_joined', 'vault_created'], required: true },
  actor: { type: String, required: true },
  amount: { type: Number, default: 0 },
  txHash: { type: String },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

ActivityLogSchema.index({ planId: 1, createdAt: -1 });
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// (Demo models and memory fallbacks removed — production mode only)

// ── Privy Signer (lazy init to avoid crash if keys not set) ────
let privy: any = null;

function getPrivy() {
  if (!privy) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrivyClient } = require('@privy-io/node');
      privy = new PrivyClient({
        appId: process.env.PRIVY_APP_ID!,
        appSecret: process.env.PRIVY_APP_SECRET!,
      });
    } catch {
      console.warn('⚠️  @privy-io/node not installed - signing endpoint disabled');
    }
  }
  return privy;
}

// ── Routes ─────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── USER MANAGEMENT ROUTES ────────────────────────────────────

// POST /api/users - Register user on first login
app.post('/api/users', requireAuth, async (req: AuthedRequest, res) => {
  const { privy_id, address, username, displayName } = req.body;
  
  if (!address || !username) {
    return res.status(400).json({ error: 'address, username required' });
  }

  if (privy_id && req.auth?.user_id && privy_id !== req.auth.user_id) {
    return res.status(403).json({ error: 'Not authorized for this user' });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ address: address.toLowerCase() });
    if (!user) {
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      user = await User.create({
        privy_id,
        address: address.toLowerCase(),
        username: username.toLowerCase(),
        displayName: displayName || username,
        referralCode,
        avatar: null,
        bio: '',
        contacts: [],
      });
    }
    return res.status(201).json({ user });
  } catch (err: any) {
    if (err.code === 11000) {
      // Duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ error: `${field} already taken` });
    }
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:address - Get user profile (public)
app.get('/api/users/:address', async (req, res) => {
  try {
    const user = await User.findOne({ address: req.params.address.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    return res.json({
      privy_id: user.privy_id,
      address: user.address,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      referralCode: user.referralCode,
      tokenPoints: user.tokenPoints,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users - Update profile (self using address or privy_id)
app.patch('/api/users', requireAuth, async (req: AuthedRequest, res) => {
  const { address, privy_id, displayName, avatar, bio, username, email } = req.body;
  
  if (!address && !privy_id) return res.status(400).json({ error: 'address or privy_id required' });

  if (privy_id) {
    const authErr = await ensureUserMatchesPrivyId(req, res, privy_id);
    if (authErr) return authErr;
  }
  if (address) {
    const authErr = await ensureUserMatchesAddress(req, res, address);
    if (authErr) return authErr;
  }

  try {
    const updateFields: Record<string, any> = { updatedAt: new Date() };
    if (displayName !== undefined) updateFields.displayName = displayName;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (bio !== undefined) updateFields.bio = bio;
    if (username !== undefined) updateFields.username = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (email !== undefined) updateFields.email = email;

    const query = address ? { address: address.toLowerCase() } : { privy_id };
    const user = await User.findOneAndUpdate(
      query,
      updateFields,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/points - Increment token points
app.post('/api/users/:id/points', requireAuth, async (req: AuthedRequest, res) => {
  const { points, reason, address } = req.body;
  try {
    if (address) {
      const authErr = await ensureUserMatchesAddress(req, res, address);
      if (authErr) return authErr;
    } else if (req.params.id) {
      const authErr = await ensureUserMatchesPrivyId(req, res, req.params.id);
      if (authErr) return authErr;
    }

    const query = address ? { address: address.toLowerCase() } : { $or: [{ privy_id: req.params.id }, { address: req.params.id.toLowerCase() }] };
    const user = await User.findOneAndUpdate(
      query,
      { $inc: { tokenPoints: points || 10 } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    console.log(`💎 User ${user.username} earned ${points} points for: ${reason}`);
    return res.json({ tokenPoints: user.tokenPoints });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── USER SEARCH & DISCOVERY ───────────────────────────────────

// GET /api/users/search?q=@jake - Search users by username or address
app.get('/api/users/search', async (req, res) => {
  const query = req.query.q as string;
  
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  if (!isDbConnected) {
    // Return mock search results for demo flow
    return res.json({
      results: [
        {
          address: '0x1A2b3C4d5E6F7890aB1c2D3e4F5A6b7C8D9e0F12',
          username: 'vitalik',
          displayName: 'Vitalik B.',
          avatar: '🦄',
        },
        {
          address: '0xDeAfBeEf00000000000000000000000000000001',
          username: '0xalice',
          displayName: 'Alice (Demo Partner)',
          avatar: '👩',
        }
      ].filter(u => u.username.includes(query.toLowerCase()) || u.address.toLowerCase().includes(query.toLowerCase()))
    });
  }

  try {
    let filter: any = {};
    
    if (query.startsWith('0x')) {
      // Search by address
      filter.address = query.toLowerCase();
    } else {
      // Search by username (case-insensitive)
      const sanitized = query.toLowerCase().replace(/^@/, '');
      filter.$or = [
        { username: { $regex: sanitized, $options: 'i' } },
        { displayName: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).limit(20);
    
    return res.json({
      results: users.map(u => ({
        privy_id: u.privy_id,
        address: u.address,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard - Get top users (sorted by tokenPoints, shows @username)
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const users = await User.find()
      .sort({ tokenPoints: -1 })
      .limit(50);

    // Also aggregate each user's total vault savings from the Vault model
    const results = await Promise.all(users.map(async (u, index) => {
      const vaults = await Vault.find({
        $or: [{ creatorAddress: u.address }, { partnerAddress: u.address }],
      });
      const totalSavings = vaults.reduce((sum, v) => sum + (v.currentAmount || 0), 0);

      return {
        rank: index + 1,
        username: u.username,
        displayName: u.displayName || u.username,
        points: u.tokenPoints || 0,
        savings: totalSavings,
        avatar: u.avatar,
      };
    }));

    return res.json({ leaderboard: results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── CONTACT MANAGEMENT ROUTES ────────────────────────────────

// POST /api/contacts - Add contact
app.post('/api/contacts', requireAuth, async (req: AuthedRequest, res) => {
  const { address, privy_id, contactAddress } = req.body;
  
  if ((!address && !privy_id) || !contactAddress) {
    return res.status(400).json({ error: 'address or privy_id and contactAddress required' });
  }

  if (privy_id) {
    const authErr = await ensureUserMatchesPrivyId(req, res, privy_id);
    if (authErr) return authErr;
  }
  if (address) {
    const authErr = await ensureUserMatchesAddress(req, res, address);
    if (authErr) return authErr;
  }

  try {
    // Find user
    const query = address ? { address: address.toLowerCase() } : { privy_id };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Find contact user
    const contactUser = await User.findOne({ address: contactAddress.toLowerCase() });
    if (!contactUser) return res.status(404).json({ error: 'Contact user not found' });

    // Check if already in contacts
    if (user.contacts.includes(contactAddress.toLowerCase())) {
      return res.status(409).json({ error: 'Already in contacts' });
    }

    // Add to contacts array
    user.contacts.push(contactAddress.toLowerCase());
    await user.save();

    // Create Contact record for tracking
    const contact = await Contact.create({
      userId: user.address, // Update to use address
      contactAddress: contactAddress.toLowerCase(),
      contactUsername: contactUser.username,
      favorite: false,
    });

    return res.status(201).json({
      contact: {
        address: contact.contactAddress,
        username: contact.contactUsername,
        displayName: contactUser.displayName,
        avatar: contactUser.avatar,
        addedAt: contact.addedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts - List my contacts
app.get('/api/contacts', requireAuth, async (req: AuthedRequest, res) => {
  const { address, privy_id } = req.query;
  
  if (!address && !privy_id) return res.status(400).json({ error: 'address or privy_id required' });

  if (privy_id) {
    const authErr = await ensureUserMatchesPrivyId(req, res, String(privy_id));
    if (authErr) return authErr;
  }
  if (address) {
    const authErr = await ensureUserMatchesAddress(req, res, String(address));
    if (authErr) return authErr;
  }

  if (!isDbConnected) {
    // Mock contacts for the joint vault demo
    return res.json({
      contacts: [
        {
          address: '0x1234567890123456789012345678901234567890',
          username: 'demo_alex',
          displayName: 'Alex Smith',
          avatar: '👨',
        },
        {
          address: '0xDeAfBeEf00000000000000000000000000000001',
          username: '0xalice',
          displayName: 'Alice (Demo Partner)',
          avatar: '👩',
        }
      ]
    });
  }

  try {
    const query = address ? { address: (address as string).toLowerCase() } : { privy_id };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch contact details
    const contacts = await User.find({ address: { $in: user.contacts } });

    const contactList = contacts.map(c => ({
      address: c.address,
      username: c.username,
      displayName: c.displayName,
      avatar: c.avatar,
    }));

    return res.json({ contacts: contactList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:address - Remove contact
app.delete('/api/contacts/:address', requireAuth, async (req: AuthedRequest, res) => {
  const { privy_id } = req.query;
  
  if (!privy_id) return res.status(400).json({ error: 'privy_id required' });

  const authErr = await ensureUserMatchesPrivyId(req, res, String(privy_id));
  if (authErr) return authErr;

  try {
    const user = await User.findOne({ privy_id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.contacts = user.contacts.filter(c => c !== req.params.address.toLowerCase());
    await user.save();

    await Contact.deleteOne({
      userId: privy_id,
      contactAddress: req.params.address.toLowerCase(),
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/contacts/:address/favorite - Toggle favorite
app.patch('/api/contacts/:address/favorite', requireAuth, async (req: AuthedRequest, res) => {
  const { privy_id } = req.query;
  
  if (!privy_id) return res.status(400).json({ error: 'privy_id required' });

  const authErr = await ensureUserMatchesPrivyId(req, res, String(privy_id));
  if (authErr) return authErr;

  try {
    const contact = await Contact.findOneAndUpdate(
      { userId: privy_id, contactAddress: req.params.address.toLowerCase() },
      { favorite: { $not: '$favorite' } },
      { new: true }
    );

    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    return res.json({ contact });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── VAULT ROUTES ──────────────────────────────────────────────
app.post('/api/wallet/embedded', requireAuth, async (req: AuthedRequest, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const authErr = await ensureUserMatchesPrivyId(req, res, userId);
  if (authErr) return authErr;

  const client = getPrivy();
  if (!client) {
    // Return a mock wallet for development without Privy keys
    return res.json({
      wallet: {
        id: `mock-${userId}`,
        address: '0x' + userId.replace(/[^a-f0-9]/gi, '').slice(0, 64).padStart(64, '0'),
        publicKey: '0x' + Math.random().toString(16).slice(2).padStart(64, '0'),
      },
    });
  }

  try {
    const wallet = await client.wallets().create({
      chain_type: 'ethereum',
      user_id: userId,
    });
    return res.json({
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/sign - Sign a transaction hash server-side via Privy
app.post('/api/wallet/sign', requireAuth, async (req: AuthedRequest, res) => {
  const { walletId, hash } = req.body;
  if (!walletId || !hash) return res.status(400).json({ error: 'walletId and hash required' });

  const client = getPrivy();
  if (!client) {
    // Mock signature for development
    return res.json({ signature: '0x' + Math.random().toString(16).slice(2).padStart(128, '0') });
  }

  try {
    const result = await client.wallets().rawSign(walletId, { params: { hash } });
    return res.json({ signature: result.signature });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/vaults - Create a shared vault invite record
app.post('/api/vaults', requireAuth, async (req: AuthedRequest, res) => {
  const { planId, creatorAddress, partnerAddress, planName, token, chain, type, category, targetAmount, inviteCode, lockDurationDays, depositToDefi, defiProtocol, defiVaultName, defiChainId, defiVaultAddress } = req.body;
  if (!planId || !creatorAddress) {
    return res.status(400).json({ error: 'planId, creatorAddress required' });
  }

  const authErr = await ensureUserMatchesAddress(req, res, creatorAddress);
  if (authErr) return authErr;
  
  // Provide defaults for withdrawal date based on lockDays if missing
  const lockDays = lockDurationDays || 30;
  const withdrawalDate = new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000);

  try {
    const vault = await Vault.create({ 
      planId, 
      creatorAddress, 
      partnerAddress,
      planName, 
      token, 
      chain,
      type,
      category,
      targetAmount, 
      inviteCode: inviteCode || `INV-${planId.slice(0, 6)}`,
      lockDurationDays: lockDays,
      withdrawalDate,
      depositToDefi,
      defiProtocol,
      defiVaultName,
      defiChainId,
      defiVaultAddress,
    });
    return res.json({ vault });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vaults/:planId/join - Partner joins by wallet address
app.patch('/api/vaults/:planId/join', requireAuth, async (req: AuthedRequest, res) => {
  const { partnerAddress } = req.body;
  if (!partnerAddress) return res.status(400).json({ error: 'partnerAddress required' });

  const authErr = await ensureUserMatchesAddress(req, res, partnerAddress);
  if (authErr) return authErr;

  try {
    const vault = await Vault.findOne({ planId: req.params.planId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    if (!vault.partnerAddress || vault.partnerAddress.toLowerCase() !== partnerAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to join this vault' });
    }

    vault.isPartnerAccepted = true;
    await vault.save();

    await ActivityLog.create({
      planId: vault.planId,
      type: 'partner_joined',
      actor: partnerAddress.toLowerCase(),
      amount: 0,
      metadata: { status: 'joined' },
    });

    return res.json({ vault });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/vaults/invite/:code - Resolve an invite code to a vault
app.get('/api/vaults/invite/:code', async (req, res) => {
  try {
    const vault = await Vault.findOne({ inviteCode: req.params.code });
    if (!vault) return res.status(404).json({ error: 'Invite code not found' });
    return res.json({ vault });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vaults/invite/:code/accept - Accept an invite (partner joins)
app.patch('/api/vaults/invite/:code/accept', requireAuth, async (req: AuthedRequest, res) => {
  const { partnerAddress } = req.body;

  const authErr = await ensureUserMatchesAddress(req, res, partnerAddress);
  if (authErr) return authErr;
  try {
    const vault = await Vault.findOneAndUpdate(
      { inviteCode: req.params.code },
      { partnerAddress, isPartnerAccepted: true },
      { new: true }
    );
    if (!vault) return res.status(404).json({ error: 'Invite code not found' });
    return res.json({ vault });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/vaults/:address - Get all vaults for an address (creator or partner)
app.get('/api/vaults/:address', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const authErr = await ensureUserMatchesAddress(req, res, req.params.address);
    if (authErr) return authErr;

    const vaults = await Vault.find({
      $or: [
        { creatorAddress: req.params.address },
        { partnerAddress: req.params.address },
      ],
    });
    return res.json({ vaults });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── WITHDRAWAL REQUEST ROUTES ─────────────────────────────────

// POST /api/withdrawals - Request a withdrawal from joint vault
app.post('/api/withdrawals', requireAuth, async (req: AuthedRequest, res) => {
  const { planId, requestedBy, amount, reason } = req.body;
  
  if (!planId || !requestedBy || !amount) {
    return res.status(400).json({ error: 'planId, requestedBy, amount required' });
  }

  const authErr = await ensureUserMatchesAddress(req, res, requestedBy);
  if (authErr) return authErr;

  try {
    const request = await WithdrawalRequest.create({
      planId,
      requestedBy: requestedBy.toLowerCase(),
      amount,
      reason: reason || '',
    });
    return res.status(201).json({ request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/withdrawals/:planId - Get all withdrawal requests for a plan
app.get('/api/withdrawals/:planId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const authErr = await ensureVaultParticipant(req, res, req.params.planId);
    if (authErr) return authErr;

    const requests = await WithdrawalRequest.find({ planId: req.params.planId })
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/withdrawals/:id/approve - Partner approves withdrawal
app.patch('/api/withdrawals/:id/approve', requireAuth, async (req: AuthedRequest, res) => {
  const { approverAddress } = req.body;
  
  if (!approverAddress) return res.status(400).json({ error: 'approverAddress required' });

  const authErr = await ensureUserMatchesAddress(req, res, approverAddress);
  if (authErr) return authErr;

  try {
    const request = await WithdrawalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const vault = await Vault.findOne({ planId: request.planId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    // Determine if approver is creator or partner
    const isCreator = vault.creatorAddress.toLowerCase() === approverAddress.toLowerCase();
    const isPartner = vault.partnerAddress?.toLowerCase() === approverAddress.toLowerCase();

    if (!isCreator && !isPartner) {
      return res.status(403).json({ error: 'Not authorized to approve this withdrawal' });
    }

    if (isCreator) request.creatorApproved = true;
    if (isPartner) request.partnerApproved = true;

    // Check if both have approved
    if (request.creatorApproved && request.partnerApproved) {
      request.status = 'approved';
      request.approvedAt = new Date();
    }

    await request.save();
    return res.json({ request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/withdrawals/:id/reject - Partner rejects withdrawal
app.patch('/api/withdrawals/:id/reject', requireAuth, async (req: AuthedRequest, res) => {
  const { rejectedBy } = req.body;
  
  if (!rejectedBy) return res.status(400).json({ error: 'rejectedBy required' });

  const authErr = await ensureUserMatchesAddress(req, res, rejectedBy);
  if (authErr) return authErr;

  try {
    const request = await WithdrawalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const vault = await Vault.findOne({ planId: request.planId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const isCreator = vault.creatorAddress.toLowerCase() === rejectedBy.toLowerCase();
    const isPartner = vault.partnerAddress?.toLowerCase() === rejectedBy.toLowerCase();

    if (!isCreator && !isPartner) {
      return res.status(403).json({ error: 'Not authorized to reject this withdrawal' });
    }

    request.status = 'rejected';
    await request.save();

    // Log rejection event
    await ActivityLog.create({
      planId: request.planId,
      type: 'withdrawal_rejected',
      actor: rejectedBy.toLowerCase(),
      amount: request.amount,
      metadata: { reason: request.reason },
    });

    return res.json({ request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/withdrawals/:id/execute - Execute an approved withdrawal
app.patch('/api/withdrawals/:id/execute', requireAuth, async (req: AuthedRequest, res) => {
  const { executorAddress, txHash, txStatus } = req.body;

  if (!executorAddress || !txHash) {
    return res.status(400).json({ error: 'executorAddress and txHash required' });
  }

  const authErr = await ensureUserMatchesAddress(req, res, executorAddress);
  if (authErr) return authErr;

  try {
    const request = await WithdrawalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'approved') {
      return res.status(400).json({ error: 'Withdrawal must be approved before execution' });
    }

    const vault = await Vault.findOne({ planId: request.planId });
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    const authErrVault = await ensureVaultParticipant(req, res, request.planId);
    if (authErrVault) return authErrVault;

    request.status = 'executed';
    request.executedAt = new Date();
    request.txHash = txHash;
    request.txStatus = txStatus || null;
    await request.save();

    await ActivityLog.create({
      planId: request.planId,
      type: 'withdrawal_executed',
      actor: executorAddress.toLowerCase(),
      amount: request.amount,
      txHash,
      metadata: { status: 'executed', txStatus: txStatus || null },
    });

    return res.json({ request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── ACTIVITY LOG ROUTES ───────────────────────────────────────

// POST /api/activity - Log an activity event
app.post('/api/activity', requireAuth, async (req: AuthedRequest, res) => {
  const { planId, type, actor, amount, metadata } = req.body;
  
  if (!planId || !type || !actor) {
    return res.status(400).json({ error: 'planId, type, actor required' });
  }

  const authErr = await ensureUserMatchesAddress(req, res, actor);
  if (authErr) return authErr;

  try {
    const log = await ActivityLog.create({
      planId,
      type,
      actor: actor.toLowerCase(),
      amount: amount || 0,
      metadata: metadata || {},
    });
    return res.status(201).json({ log });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/activity/:planId - Get activity timeline for a plan
app.get('/api/activity/:planId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const authErr = await ensureVaultParticipant(req, res, req.params.planId);
    if (authErr) return authErr;

    const logs = await ActivityLog.find({ planId: req.params.planId })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── LI.FI EARN DATA API PROXY ROUTES ──────────────────────────
// These proxy through our server so the frontend never touches external APIs directly.

// GET /api/earn/vaults - Discover yield vaults (proxies to earn.li.fi)
app.get('/api/earn/vaults', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.chainId) params.set('chainId', req.query.chainId as string);
    if (req.query.asset) params.set('asset', req.query.asset as string);
    if (req.query.minTvl) params.set('minTvl', req.query.minTvl as string);
    if (req.query.sortBy) params.set('sortBy', req.query.sortBy as string);
    if (req.query.cursor) params.set('cursor', req.query.cursor as string);

    const url = `${EARN_API_BASE}/v1/earn/vaults?${params.toString()}`;
    const headers: Record<string, string> = {};
    if (EARN_API_KEY) headers['x-lifi-api-key'] = EARN_API_KEY;
    const response = await fetch(url, { headers });
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('❌ Earn vaults proxy error:', err.message);
    return res.status(502).json({ error: 'Failed to fetch vaults from LI.FI' });
  }
});

// GET /api/earn/best-vault - Auto-select the best vault for token/chain
app.get('/api/earn/best-vault', async (req, res) => {
  try {
    let bestVault: any = null;
    let bestApy = 0;
    const requestedToken = typeof req.query.token === 'string' ? req.query.token.toUpperCase() : null;
    const requestedChainId = req.query.chainId ? Number(req.query.chainId) : null;
    const chainIds = requestedChainId ? [requestedChainId] : PREFERRED_CHAIN_IDS;
    const withdrawableProtocols = new Set([
      'morpho',
      'morphov1',
      'morphov2',
      'aave',
      'aavev3',
      'euler',
      'pendle',
      'lido',
      'lidowsteth',
      'wsteth',
      'etherfi',
      'felixvanilla',
      'felix',
      'hyperlend',
      'neverland',
      'usdai',
      'seamless',
    ]);
    const normalizeProtocol = (name?: string) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

    for (const chainId of chainIds) {
      const url = `${EARN_API_BASE}/v1/earn/vaults?chainId=${chainId}`;
      const headers: Record<string, string> = {};
      if (EARN_API_KEY) headers['x-lifi-api-key'] = EARN_API_KEY;
      const response = await fetch(url, { headers });
      const { data: vaults } = await response.json();

      if (!vaults) continue;

      const candidates = vaults.filter((v: any) => {
        if (v.isTransactional !== true) return false;
        if (v.analytics?.apy?.total == null || v.analytics.apy.total <= 0) return false;
        const underlying = v.underlyingTokens?.[0]?.symbol?.toUpperCase();
        if (requestedToken) {
          return underlying === requestedToken;
        }
        return v.tags?.includes('stablecoin');
      });

      for (const v of candidates) {
        const protocolName = normalizeProtocol(v.protocol?.name);
        if (protocolName && !withdrawableProtocols.has(protocolName)) {
          continue;
        }
        if (v.analytics.apy.total > bestApy) {
          bestApy = v.analytics.apy.total;
          bestVault = v;
        }
      }
    }

    if (!bestVault) {
      return res.status(404).json({ error: 'No suitable vault found for requested token/chain' });
    }

    return res.json({
      vault: {
        address: bestVault.address,
        name: bestVault.name,
        network: bestVault.network,
        chainId: bestVault.chainId,
        protocol: bestVault.protocol?.name,
        apy: bestVault.analytics.apy,
        tvl: bestVault.analytics.tvl?.usd,
        underlyingToken: bestVault.underlyingTokens?.[0],
        tags: bestVault.tags,
      },
    });
  } catch (err: any) {
    console.error('❌ Best vault lookup error:', err.message);
    return res.status(502).json({ error: 'Failed to find best vault' });
  }
});

// GET /api/earn/portfolio/:address - Get user's DeFi positions
app.get('/api/earn/portfolio/:address', async (req, res) => {
  try {
    const url = `${EARN_API_BASE}/v1/earn/portfolio/${req.params.address}/positions`;
    const headers: Record<string, string> = {};
    if (EARN_API_KEY) headers['x-lifi-api-key'] = EARN_API_KEY;
    const response = await fetch(url, { headers });
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('❌ Portfolio proxy error:', err.message);
    return res.status(502).json({ error: 'Failed to fetch portfolio from LI.FI' });
  }
});

// GET /api/earn/chains - Get supported chains
app.get('/api/earn/chains', async (_req, res) => {
  try {
    const headers: Record<string, string> = {};
    if (EARN_API_KEY) headers['x-lifi-api-key'] = EARN_API_KEY;
    const response = await fetch(`${EARN_API_BASE}/v1/earn/chains`, { headers });
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to fetch chains' });
  }
});

// GET /api/tx-status - Proxy LI.FI status endpoint
app.get('/api/tx-status', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.txHash) params.set('txHash', String(req.query.txHash));
    if (req.query.fromChain) params.set('fromChain', String(req.query.fromChain));
    if (req.query.toChain) params.set('toChain', String(req.query.toChain));
    if (req.query.bridge) params.set('bridge', String(req.query.bridge));

    if (!params.get('txHash')) {
      return res.status(400).json({ error: 'txHash required' });
    }

    const response = await fetch(`${COMPOSER_API_BASE}/v1/status?${params.toString()}`);
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to fetch tx status' });
  }
});

// ── LI.FI COMPOSER PROXY ROUTES (API key protected) ──────────

// POST /api/deposit-quote - Get a deposit transaction quote from Composer
app.post('/api/deposit-quote', async (req, res) => {
  const { fromChain, toChain, fromToken, toToken, fromAddress, toAddress, fromAmount } = req.body;

  if (!fromChain || !toToken || !fromAddress || !fromAmount) {
    return res.status(400).json({ error: 'fromChain, toToken, fromAddress, fromAmount required' });
  }

  try {
    const params = new URLSearchParams({
      fromChain: String(fromChain),
      toChain: String(toChain || fromChain),
      fromToken,
      toToken,
      fromAddress,
      toAddress: toAddress || fromAddress,
      fromAmount: String(fromAmount),
      integrator: 'equilibria-protocol', // Platform identifier
      fee: '0.01', // 1% Platform creation fee
    });

    const headers: Record<string, string> = {};
    if (COMPOSER_API_KEY) headers['x-lifi-api-key'] = COMPOSER_API_KEY;

    const response = await fetch(`${COMPOSER_API_BASE}/v1/quote?${params.toString()}`, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err: any) {
    console.error('❌ Deposit quote error:', err.message);
    return res.status(502).json({ error: 'Failed to get deposit quote from Composer' });
  }
});

// POST /api/swap-quote - Get a token swap quote from Composer
app.post('/api/swap-quote', async (req, res) => {
  const { fromChain, toChain, fromToken, toToken, fromAddress, fromAmount, slippage } = req.body;

  if (!fromChain || !fromToken || !toToken || !fromAddress || !fromAmount) {
    return res.status(400).json({ error: 'fromChain, fromToken, toToken, fromAddress, fromAmount required' });
  }

  try {
    const params = new URLSearchParams({
      fromChain: String(fromChain),
      toChain: String(toChain || fromChain),
      fromToken,
      toToken,
      fromAddress,
      toAddress: fromAddress,
      fromAmount: String(fromAmount),
      slippage: String(slippage || 0.005),
    });

    const headers: Record<string, string> = {};
    if (COMPOSER_API_KEY) headers['x-lifi-api-key'] = COMPOSER_API_KEY;

    const response = await fetch(`${COMPOSER_API_BASE}/v1/quote?${params.toString()}`, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err: any) {
    console.error('❌ Swap quote error:', err.message);
    return res.status(502).json({ error: 'Failed to get swap quote from Composer' });
  }
});

// ── REFERRAL VERIFICATION ROUTE ───────────────────────────────

// POST /api/referral/verify - Verify and apply a referral code on signup
app.post('/api/referral/verify', requireAuth, async (req: AuthedRequest, res) => {
  const { newUserPrivyId, referralCode } = req.body;

  if (!newUserPrivyId || !referralCode) {
    return res.status(400).json({ error: 'newUserPrivyId and referralCode required' });
  }

  const authErr = await ensureUserMatchesPrivyId(req, res, newUserPrivyId);
  if (authErr) return authErr;

  try {
    // Find the referrer by their code
    const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Mark the new user as referred
    const newUser = await User.findOneAndUpdate(
      { privy_id: newUserPrivyId },
      { referredBy: referrer.referralCode },
      { new: true }
    );

    if (!newUser) {
      return res.status(404).json({ error: 'New user not found' });
    }

    // Award 200 bonus points to the referrer immediately
    referrer.tokenPoints = (referrer.tokenPoints || 0) + 200;
    await referrer.save();

    console.log(`🤝 Referral verified: ${newUser.username} referred by ${referrer.username} (+200 pts)`);

    return res.json({
      success: true,
      referrer: { username: referrer.username, displayName: referrer.displayName },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DEPOSIT EVENT HANDLER (Points + Activity) ─────────────────

// POST /api/vaults/:planId/deposit - Record a deposit and award tokenPoints
app.post('/api/vaults/:planId/deposit', requireAuth, async (req: AuthedRequest, res) => {
  const { depositorAddress, amount, txHash, txStatus } = req.body;
  const { planId } = req.params;

  if (!depositorAddress || !amount) {
    return res.status(400).json({ error: 'depositorAddress and amount required' });
  }

  const authErr = await ensureUserMatchesAddress(req, res, depositorAddress);
  if (authErr) return authErr;

  try {
    // Update vault currentAmount
    const vault = await Vault.findOneAndUpdate(
      { planId },
      { $inc: { currentAmount: amount } },
      { new: true }
    );
    if (!vault) return res.status(404).json({ error: 'Vault not found' });

    // Calculate points: 10 × dollarAmount × lockDurationDays
    const lockDays = vault.lockDurationDays || 30;
    const pointsEarned = Math.floor(10 * amount * lockDays);

    // Award points to depositor
    const user = await User.findOneAndUpdate(
      { address: depositorAddress.toLowerCase() },
      { $inc: { tokenPoints: pointsEarned } },
      { new: true }
    );

    // Check if depositor was referred — award referrer bonus on first deposit
    if (user && user.referredBy) {
      const alreadyDeposited = await ActivityLog.findOne({
        planId,
        actor: depositorAddress.toLowerCase(),
        type: 'deposit',
      });

      if (!alreadyDeposited) {
        // First deposit by a referred user → bonus 200 pts to referrer
        await User.findOneAndUpdate(
          { referralCode: user.referredBy },
          { $inc: { tokenPoints: 200 } }
        );
        console.log(`🎁 Referral deposit bonus: referrer ${user.referredBy} earned 200 pts`);
      }
    }

    // Log activity
    await ActivityLog.create({
      planId,
      type: 'deposit',
      actor: depositorAddress.toLowerCase(),
      amount,
      txHash,
      metadata: { pointsEarned, lockDays, txStatus: txStatus || null },
    });

    console.log(`💰 Deposit: $${amount} into vault ${planId} by ${depositorAddress} → +${pointsEarned} pts`);

    return res.json({
      vault,
      pointsEarned,
      totalPoints: user?.tokenPoints || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Start server ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Equilibria backend running on http://localhost:${PORT}`);
  console.log(`   MongoDB: ${MONGO_URI.includes('mongodb+srv') ? 'Atlas (cloud)' : 'local'}`);
  console.log(`   LI.FI Composer: ${COMPOSER_API_KEY ? '✅ Key loaded' : '⚠️  No key'}`);
});
