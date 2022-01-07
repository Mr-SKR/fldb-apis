const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const mongoose = require("mongoose");
var cron = require("node-cron");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const config = require("./config/config");

const {
  fetchLocationDetails,
  isPlaceOpen,
} = require("./utils/locationDetails");
require("./models/video");
require("./models/searchIndex");

const PORT = process.env.PORT || 5000;
const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const Video = mongoose.model("video");
const SearchIndex = mongoose.model("searchIndex");
mongoose.connect(process.env.MONGO_URI);

const scheduler = async () => {
  console.log("Scheduler execution started");
  try {
    let videosInPlayLists = [],
      videoDetailsList = [],
      results = [];
    for (const playlistId of config.playlistIds) {
      let playlistResponse = await youtube.playlistItems.list({
        part: "snippet",
        playlistId: playlistId,
      });
      videosInPlayLists = videosInPlayLists.concat(playlistResponse.data.items);
      while (playlistResponse.data.nextPageToken) {
        playlistResponse = await youtube.playlistItems.list({
          part: "snippet",
          playlistId: playlistId,
          pageToken: playlistResponse.data.nextPageToken,
        });
        videosInPlayLists = videosInPlayLists.concat(
          playlistResponse.data.items
        );
      }
    }
    for (const videoInPlayLists of videosInPlayLists) {
      const videoDetails = await youtube.videos.list({
        part: "snippet",
        id: videoInPlayLists.snippet.resourceId.videoId,
      });
      videoDetailsList = videoDetailsList.concat(videoDetails.data.items[0]);
    }
    for (const videoDetails of videoDetailsList) {
      if (videoDetails.snippet.description) {
        const geodetails = await fetchLocationDetails(
          videoDetails.snippet.description
        );
        results = results.concat({
          videoId: videoDetails.id,
          videoTitle: videoDetails.snippet.title,
          videoDescription: videoDetails.snippet.description,
          ...geodetails,
        });
      }
    }
    for (const result of results) {
      const existingVideo = await Video.findOne({ videoId: result.videoId });
      if (!existingVideo) {
        new Video(result).save();
      }
      const existingVideoIndex = await SearchIndex.findOne({
        videoId: result.videoId,
      });
      if (!existingVideoIndex) {
        new SearchIndex(result).save();
      }
    }
    console.log("Scheduler execution completed");
  } catch (err) {
    console.error(err);
  }
};

cron.schedule("* 3 * * *", scheduler);

const app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
// Set CORS headers
app.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["http://localhost:3001"]);
  res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.append("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", async (_req, res) => {
  res.send("Welcome to Food Lovers Database (FLDB) APIs");
});

app.get("/videos", async (_req, res) => {
  try {
    const allVideos = await Video.find({});
    res.send(allVideos);
  } catch (err) {
    console.error(err);
    // TODO: Return error status code
    res.send(
      "Something went wrong. Please make sure that the request is valid"
    );
  }
});

app.get("/videos/:videoId", async (req, res) => {
  try {
    const video = await Video.find({ videoId: req.params.videoId });
    if (!video.length) {
      console.error(err);
      // TODO: Return error status code
      res.send("Please make sure that valid video id is used");
    }
    res.send(video[0]);
  } catch (err) {
    console.error(err);
    // TODO: Return error status code
    res.send(
      "Something went wrong. Please make sure that the request is valid"
    );
  }
});

app.get("/searchindices", async (_req, res) => {
  try {
    const searchIndices = await SearchIndex.find({});
    res.send(searchIndices);
  } catch (err) {
    console.error(err);
    // TODO: Return error status code
    res.send(
      "Something went wrong. Please make sure that the request is valid"
    );
  }
});

app.get("/isopen/:videoId", async (req, res) => {
  try {
    const existingVideo = await Video.findOne({ videoId: req.params.videoId });
    if (!existingVideo) {
      res.send("Please make sure that valid video id is used");
      res.end();
    }
    const isOpen = await isPlaceOpen(existingVideo.place_id);
    res.send(isOpen);
  } catch (err) {
    console.error(err);
    // TODO: Return error status code
    res.send(
      "Something went wrong. Please make sure that the request is valid"
    );
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});
