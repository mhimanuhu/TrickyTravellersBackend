import { Schema, model, Model, Document, Types } from "mongoose";
import crypto from "crypto";
import paginate from "./plugins/paginate";
import toJSON from "./plugins/toJSON";
export interface User extends Document {
  name: string;
  password: string;
  email: string;
  role: string;
  active: boolean;
  ban: boolean;
  google_id?: string;
  remember_token?: string;
  profile_photo_path?: string;
  cover_photo_path?: string;
  username: string;
  isPasswordMatch(password: string): boolean;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
}

export interface UserModel extends Model<User> {
  isEmailTaken(email: string): boolean;
  paginate: any;
  toJSON: any;
}

const schema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    active: {
      type: Boolean,
      required: true,
      default: false,
    },
    ban: {
      type: Boolean,
      required: true,
      default: false,
    },
    profile_photo_path: {
      type: String,
      required: false,
    },
    cover_photo_path: {
      type: String,
      required: false,
    },
    remember_token: {
      type: String,
      required: false,
    },
    google_id: {
      type: String,
      required: false,
    },
    followers: {
      type: [Schema.Types.ObjectId],
      ref: "users",
      required: true,
      default: [],
    },
    following: {
      type: [Schema.Types.ObjectId],
      ref: "users",
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

schema.statics.isEmailTaken = async function (email: string) {
  const user = await this.findOne({ email });
  return !!user;
};

schema.methods.isPasswordMatch = async function (password: string) {
  const user = this;
  const hash = crypto.createHash("sha256").update(password).digest("base64");
  return hash === user.password;
};

schema.pre("save", async function (next: any) {
  const user = this;
  if (user.isModified("password")) {
    user.password = crypto
      .createHash("sha256")
      .update(user.password)
      .digest("base64");
  }
  next();
});
schema.plugin(toJSON);
schema.plugin(paginate);
const userModel = model<User, UserModel>("users", schema);
export default userModel;
