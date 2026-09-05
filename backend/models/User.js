import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    preferences: {
      newArrivalNotes: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
    },
  },
  { timestamps: true, toJSON: { transform: (_, user) => { delete user.password; return user; } } },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model("User", userSchema);
