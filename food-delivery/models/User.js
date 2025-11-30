import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // using string id for demo (e.g., 'demo-user-1')
  name: { type: String, default: 'Demo User' },
  email: { type: String, default: 'demo@example.com' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
