import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/news_website";
const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, index: true },
    password: { type: String, select: false },
    image: String,
    role: { type: String, default: "subscriber" }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function seedAdmin() {
  await mongoose.connect(mongoUri, { dbName: "news_website" });

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    {
      name: "Admin",
      email,
      password: hashedPassword,
      role: "super_admin"
    },
    { upsert: true, new: true }
  );

  await mongoose.disconnect();
  console.log(`Admin user ready: ${email}`);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
