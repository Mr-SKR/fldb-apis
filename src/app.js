const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
// TODO: Send detailed logs to relic
require("newrelic");

const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const mongoose = require("mongoose");
const cron = require("node-cron");
const fs = require(`fs`);

const config = require("./config/config");
const { logger } = require("./config/logger");

const { fetchLocationDetails } = require("./utils/locationDetails");
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
  logger.info("Scheduler execution started");
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
    console.log("Playlist video collection complete");
    logger.info("Playlist video collection complete");
    for (const videoInPlayLists of videosInPlayLists) {
      const videoDetails = await youtube.videos.list({
        part: "snippet",
        id: videoInPlayLists.snippet.resourceId.videoId,
      });
      if (videoDetails.data.items[0]) {
        videoDetailsList = videoDetailsList.concat(videoDetails.data.items[0]);
      }
    }
    console.log("Video details collection complete");
    logger.info("Video details collection complete");
    for (const video of videoDetailsList) {
      if (video?.snippet?.description && video?.snippet?.title && video?.id) {
        const existingVideo = await SearchIndex.findOne({
          videoId: video.id,
        });
        if (!existingVideo) {
          const geodetails = await fetchLocationDetails(
            video.snippet.description
          );
          results = results.concat({
            videoId: video.id,
            videoTitle: video.snippet.title,
            videoDescription: video.snippet.description,
            ...geodetails,
          });
        }
      } else {
        console.error(`Could not extract properties from ${video}`);
        logger.error(`Could not extract properties from ${video}`);
      }
    }
    console.log("Location details extraction complete");
    logger.info("Location details extraction complete");
    for (const result of results) {
      new Video(result).save();
      new SearchIndex(result).save();
    }
    console.log("Scheduler execution completed");
    logger.info("Scheduler execution completed");
  } catch (err) {
    console.error(err);
    logger.error(err);
  }
};

cron.schedule("* * 10 * *", scheduler);

const app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
// Set CORS headers

if (process.env.NODE_ENV === "production") {
  app.use((_req, res, next) => {
    res.append("Access-Control-Allow-Origin", ["https://fl-db.in"]);
    res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.append("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
} else {
  app.use((_req, res, next) => {
    res.append("Access-Control-Allow-Origin", ["*"]);
    res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.append("Access-Control-Allow-Headers", "Content-Type");
    next();
  });
}

app.get("/", async (_req, res) => {
  res.send("Welcome to Food Lovers Database (FLDB) APIs");
});

app.get("/videos", async (_req, res) => {
  try {
    const allVideos = await Video.find({});
    res.send(allVideos);
  } catch (err) {
    console.error(err);
    logger.error(err);
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
      logger.error(err);
      // TODO: Return error status code
      res.send("Please make sure that valid video id is used");
    }
    res.send(video[0]);
  } catch (err) {
    console.error(err);
    logger.error(err);
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
    logger.error(err);
    // TODO: Return error status code
    res.send(
      "Something went wrong. Please make sure that the request is valid"
    );
  }
});

if (process.env.NODE_ENV === "production") {
  app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
    logger.info(`Example app listening at http://localhost:${PORT}`);
  });
} else {
  const key = fs.readFileSync(path.resolve(__dirname, "./cert/key.pem")),
    cert = fs.readFileSync(path.resolve(__dirname, "./cert/cert.pem"));

  const server = https.createServer({ key: key, cert: cert }, app);

  server.listen(PORT, () => {
    console.log(`Example app listening at https://localhost:${PORT}`);
  });
}
