/**
 * Identity verification routes.
 *   User : GET  /user/me/identity-verification
 *          POST /user/me/identity-verification/start     (DigiLocker; 503 until configured)
 *          POST /user/me/identity-verification/manual    (multipart: legalName, documentType, document)
 *   Admin: GET  /admin/verifications?status=pending&limit&cursor
 *          GET  /admin/verifications/:id                 (includes a 5-minute ID photo link)
 *          POST /admin/verifications/:id/approve
 *          POST /admin/verifications/:id/reject          { reason }
 */
import verificationService, { MAX_DOCUMENT_BYTES } from './verification.service.js';
import { requireAdmin } from './admin.js';
import { ValidationError } from '../../utils/errors.js';

async function readSubmission(request) {
  const fields = {};
  let file;
  for await (const part of request.parts({ limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } })) {
    if (part.file) {
      if (part.fieldname !== 'document') { part.file.resume(); continue; }
      try {
        const buffer = await part.toBuffer();
        if (part.file.truncated) throw new ValidationError('ID photo must be 5 MB or smaller');
        file = { buffer, mimetype: part.mimetype };
      } catch (err) {
        if (err?.code === 'FST_REQ_FILE_TOO_LARGE') throw new ValidationError('ID photo must be 5 MB or smaller');
        throw err;
      }
    } else {
      fields[part.fieldname] = part.value;
    }
  }
  return { legalName: fields.legalName, documentType: fields.documentType, file };
}

export default async function verificationRoutes(app, { authenticate }) {
  const auth = { preHandler: authenticate };
  const admin = { preHandler: requireAdmin(authenticate) };

  app.get('/user/me/identity-verification', auth, async request => verificationService.getStatus(request.userId));

  app.post('/user/me/identity-verification/start', auth, async (_request, reply) =>
    reply.code(503).send({
      error: {
        code: 'VERIFICATION_NOT_CONFIGURED',
        message: 'DigiLocker verification is not available yet. Submit your ID for manual review instead.',
        data: { fallback: 'manual' },
      },
    }));

  app.post('/user/me/identity-verification/manual', auth, async (request, reply) => {
    const result = await verificationService.submitManual(request.userId, await readSubmission(request));
    return reply.code(201).send(result);
  });

  app.get('/admin/verifications', admin, async request => verificationService.listRequests(request.query));
  app.get('/admin/verifications/:id', admin, async request => verificationService.getRequest(request.params.id));
  app.post('/admin/verifications/:id/approve', admin, async request =>
    verificationService.approve(request.params.id, request.userId));
  app.post('/admin/verifications/:id/reject', admin, async request =>
    verificationService.reject(request.params.id, request.userId, request.body?.reason));
}
