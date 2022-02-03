const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const videoSchema = new Schema({
  videoId: String,
  videoTitle: String,
  videoDescription: String,
  business_status: String,
  formatted_address: String,
  geometry: Object,
  international_phone_number: String,
  name: String,
  opening_hours: Object,
  place_id: String,
  rating: String,
  url: String,
  hasVeg: Boolean,
  thumbnail: Object,
});

mongoose.model("video", videoSchema);
