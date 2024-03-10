import mongoose, { Schema } from "mongoose";
const playListSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        required: "User",
      },
  },
  {
    timestamps: true,
  }
);
export const Playlist = new mongoose.model("Playlist", playListSchema);
