const { Schema } = require("mongoose");

const videoSchema = new Schema({
  videoId: String,
  videoTitle: String,
  videoDescription: String,
});

const locationSchema = new Schema({
  videoId: String,
});

exports.videoSchema = videoSchema;
exports.locationSchema = locationSchema;
