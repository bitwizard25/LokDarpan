/**
 * Identity verification. DigiLocker is the primary provider; until it is configured
 * (DIGILOCKER_CLIENT_ID + DIGILOCKER_CLIENT_SECRET) creators submit an ID photo for an
 * admin to review. The outcome in both cases is the same: user.identityVerification.verifiedAt.
 */
import mongoose from 'mongoose';
import User from '../auth/schemas/user.schema.js';
import VerificationRequest, { DOCUMENT_TYPES } from './verification.schema.js';
import verificationStorage from './verification.storage.js';
import { AppError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { objectId, pageOptions, pageResult } from '../../shared/http/pagination.js';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const DOCUMENT_URL_TTL_SECONDS = 300;

// mimetype -> [file extension, magic-byte check]
const IMAGE_TYPES = {
  'image/jpeg': ['jpg', b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  'image/png': ['png', b => b.length > 3 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  'image/webp': ['webp', b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'],
};

export function isDigilockerConfigured(env = process.env) {
  return Boolean(env.DIGILOCKER_CLIENT_ID && env.DIGILOCKER_CLIENT_SECRET);
}

async function getStatus(userId) {
  const user = await User.findById(userId).select('identityVerification.verifiedAt').lean();
  if (!user) throw new NotFoundError('User');

  const configured = isDigilockerConfigured();
  const base = { provider: configured ? 'digilocker' : 'manual', configured, manualAvailable: true };

  if (user.identityVerification?.verifiedAt) {
    return { ...base, status: 'verified', verifiedAt: user.identityVerification.verifiedAt };
  }
  const latest = await VerificationRequest.findOne({ user_id: userId }).sort({ submittedAt: -1 }).lean();
  if (latest?.status === 'pending') return { ...base, status: 'pending', submittedAt: latest.submittedAt };
  if (latest?.status === 'rejected') {
    return { ...base, status: 'rejected', rejectionReason: latest.rejectionReason, reviewedAt: latest.reviewedAt };
  }
  return { ...base, status: 'not_verified' };
}

function validateSubmission({ legalName, documentType, file }) {
  const name = typeof legalName === 'string' ? legalName.trim() : '';
  if (name.length < 3 || name.length > 100) throw new ValidationError('Legal name must be 3-100 characters');
  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new ValidationError(`Document type must be one of: ${DOCUMENT_TYPES.join(', ')}`);
  }
  if (!file?.buffer?.length) throw new ValidationError('A photo of your ID is required');
  if (file.buffer.length > MAX_DOCUMENT_BYTES) throw new ValidationError('ID photo must be 5 MB or smaller');
  const type = IMAGE_TYPES[file.mimetype];
  if (!type) throw new ValidationError('ID photo must be a JPEG, PNG or WebP image');
  if (!type[1](file.buffer)) throw new ValidationError('The uploaded file is not a valid image');
  return { name, ext: type[0] };
}

async function submitManual(userId, input) {
  const { name, ext } = validateSubmission(input);

  const user = await User.findById(userId).select('identityVerification.verifiedAt').lean();
  if (!user) throw new NotFoundError('User');
  if (user.identityVerification?.verifiedAt) throw new AppError('You are already verified', 409);
  // Explicit check for a clean 409; the partial unique index below only guards the race.
  if (await VerificationRequest.exists({ user_id: userId, status: 'pending' })) {
    throw new AppError('You already have a request waiting for review', 409);
  }

  const _id = new mongoose.Types.ObjectId();
  const documentKey = `identity-documents/${userId}/${_id}.${ext}`;
  await verificationStorage.putPrivate(documentKey, input.file.buffer, input.file.mimetype);

  let created;
  try {
    created = await VerificationRequest.create({
      _id, user_id: userId, legalName: name, documentType: input.documentType, documentKey,
    });
  } catch (err) {
    await verificationStorage.deletePrivate(documentKey).catch(() => {});
    if (err?.code === 11000) throw new AppError('You already have a request waiting for review', 409);
    throw err;
  }
  return { id: String(_id), status: 'pending', submittedAt: created.submittedAt ?? new Date() };
}

const requestSummary = r => ({
  id: String(r._id),
  status: r.status,
  legalName: r.legalName,
  documentType: r.documentType,
  submittedAt: r.submittedAt,
  reviewedAt: r.reviewedAt,
  rejectionReason: r.rejectionReason,
  user: r.user_id && typeof r.user_id === 'object'
    ? { id: String(r.user_id._id), name: r.user_id.name, email: r.user_id.email }
    : { id: String(r.user_id) },
});

async function listRequests(query = {}) {
  const { limit, after } = pageOptions(query);
  const status = query.status || 'pending';
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new ValidationError('Invalid status');
  const rows = await VerificationRequest.find({ status, ...(after ? { _id: { $lt: after } } : {}) })
    .sort({ _id: -1 }).limit(limit + 1).populate('user_id', 'name email').lean();
  return pageResult(rows, limit, requestSummary);
}

async function getRequest(id) {
  const request = await VerificationRequest.findById(objectId(id, 'request ID'))
    .select('+documentKey').populate('user_id', 'name email').lean();
  if (!request) throw new NotFoundError('Verification request');
  const documentUrl = await verificationStorage.getReadUrl(request.documentKey, DOCUMENT_URL_TTL_SECONDS);
  return { ...requestSummary(request), documentUrl };
}

/** Claim a still-pending request atomically; distinguishes "gone" from "already reviewed". */
async function claim(id, adminId, set) {
  const _id = objectId(id, 'request ID');
  const claimed = await VerificationRequest.findOneAndUpdate(
    { _id, status: 'pending' },
    { $set: { ...set, reviewedAt: new Date(), reviewedBy: adminId } },
    { new: true },
  ).lean();
  if (!claimed) {
    if (await VerificationRequest.exists({ _id })) throw new AppError('This request has already been reviewed', 409);
    throw new NotFoundError('Verification request');
  }
  return claimed;
}

async function approve(id, adminId) {
  const claimed = await claim(id, adminId, { status: 'approved' });
  try {
    await User.updateOne({ _id: claimed.user_id }, {
      $set: {
        'identityVerification.provider': 'manual',
        'identityVerification.verifiedAt': new Date(),
        'identityVerification.reference': String(claimed._id),
      },
    });
  } catch (err) {
    // Don't leave an approved request on a user who was never marked verified.
    await VerificationRequest.updateOne({ _id: claimed._id }, { $set: { status: 'pending' } });
    throw err;
  }
  return { id: String(claimed._id), status: 'approved' };
}

async function reject(id, adminId, reason) {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 3 || text.length > 500) throw new ValidationError('A rejection reason (3-500 characters) is required');
  const claimed = await claim(id, adminId, { status: 'rejected', rejectionReason: text });
  return { id: String(claimed._id), status: 'rejected' };
}

export default { getStatus, submitManual, listRequests, getRequest, approve, reject, isDigilockerConfigured };
