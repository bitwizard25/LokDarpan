import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (model, extra = {}) => ({ type: Schema.Types.ObjectId, ref: model, required: true, ...extra });
const savedSchema = new Schema({ user: ref('User'), video: ref('Video') }, { timestamps: true });
savedSchema.index({ user: 1, video: 1 }, { unique: true });
const historySchema = new Schema({ user: ref('User'), video: ref('Video'), positionSeconds: { type: Number, min: 0, default: 0 } }, { timestamps: true });
historySchema.index({ user: 1, video: 1 }, { unique: true });
const playlistSchema = new Schema({ owner: ref('User'), name: { type: String, required: true, trim: true, maxlength: 80 },
  visibility: { type: String, enum: ['public', 'private'], default: 'private' }, videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }] }, { timestamps: true });
playlistSchema.index({ owner: 1, _id: -1 });
export const SavedVideo = mongoose.models.SavedVideo || mongoose.model('SavedVideo', savedSchema);
export const WatchHistory = mongoose.models.WatchHistory || mongoose.model('WatchHistory', historySchema);
export const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema);
