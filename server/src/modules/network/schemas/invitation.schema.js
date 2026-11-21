import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  network: { type: mongoose.Schema.Types.ObjectId, ref: 'Network', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
}, { timestamps: true });
schema.index({ network: 1, recipient: 1 }, { unique: true });
export default mongoose.models.NetworkInvitation || mongoose.model('NetworkInvitation', schema);
