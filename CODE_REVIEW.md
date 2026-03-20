# Code Review: LokDarpan Backend

Thank you for requesting a code review. Here is a comprehensive assessment of the recent changes introduced in the `fixed` commit, specifically regarding the backend (`server/`).

## 1. Discrepancy Between `package.json` and `package-lock.json`
**Severity: Critical**
- **Issue**: The current code heavily relies on `Fastify` (seen in `server/src/app.js` and routing), but `package-lock.json` appears to be severely out of sync, still containing old Express and Express-FileUpload dependencies instead of the new Fastify ones.
- **Why it matters**: Running `npm install` in its current state will either fail to install the new Fastify plugins properly or will strip out the Express dependencies entirely, confusing developers and build pipelines.
- **Recommendation**: Delete `node_modules` and `package-lock.json`, then run `npm install` to regenerate a clean lockfile that accurately reflects the new `fastify` framework dependencies present in `package.json`.

## 2. Unhandled Edge Cases in Data Deletion
**Severity: Medium**
- **Issue**: In `server/src/modules/video/services/video.service.js`, the `deleteVideo` function deletes the video document from MongoDB and removes its associated files (thumbnail and video) from S3. However, it does not delete the `Comment` documents associated with this video.
- **Why it matters**: This will result in orphaned `Comment` documents accumulating in the database over time, wasting storage space and potentially causing integrity issues.
- **Recommendation**: Add logic to delete all comments where `video_id` matches the deleted video's ID.

## 3. Upload File Verification
**Severity: Medium**
- **Issue**: In `server/src/modules/auth/controllers/auth.controller.js` during user signup, the code iterates over multipart fields and sets `logoFile = part` for the `logo` field. However, if multiple files are sent under the name `logo`, it simply overwrites the previous one. Additionally, the file isn't thoroughly validated against stream limits until it reaches S3.
- **Recommendation**: Enforce stricter multipart limits for the Fastify app configuration and add logic to break or throw an error if multiple `logo` files are unexpectedly uploaded.

## 4. No Support for Database Transactions
**Severity: Low/Medium**
- **Issue**: In `server/src/modules/user/services/user.service.js`, the `subscribeToChannel` function sequentially calls `subscriber.save()` and `channel.save()`.
- **Why it matters**: If the server crashes or the database connection drops between these two operations, the system will be in an inconsistent state (the subscriber has the channel in their list, but the channel's subscriber count hasn't incremented).
- **Recommendation**: Use Mongoose Transactions (e.g., `session.withTransaction()`) to ensure both documents are updated atomically.

## 5. Security & JWT implementation
**Severity: Medium**
- **Issue**: The `fast-jwt` library implicitly used by `@fastify/jwt` has known moderate vulnerabilities when validating the `iss` claim.
- **Recommendation**: As soon as the lockfile is fixed, update the Fastify JWT plugin and run `npm audit fix` to ensure you are protected against improper validation vulnerabilities. Also, consider adding a token refresh/revocation strategy to properly invalidate sessions when necessary.

## Summary
The migration to Fastify introduces a highly performant routing structure and the modular architecture is clean. However, the most critical next step is to **synchronize your package dependencies** by recreating the `package-lock.json`. Once that is stable, addressing the orphaned comments and missing database transactions will make the platform much more robust.
