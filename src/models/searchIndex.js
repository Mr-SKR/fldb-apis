const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const searchIndexSchema = new Schema({
  videoId: String,
  videoTitle: String,
});

mongoose.model("searchIndex", searchIndexSchema);
