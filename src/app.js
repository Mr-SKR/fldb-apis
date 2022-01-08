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
      } else {
        Video.updateOne({ videoId: result.videoId }, result, (err, res) => {
          err ? console.log(err) : console.log(res);
        });
      }
      const existingVideoIndex = await SearchIndex.findOne({
        videoId: result.videoId,
      });
      if (!existingVideoIndex) {
        new SearchIndex(result).save();
      } else {
        SearchIndex.updateOne(
          { videoId: result.videoId },
          result,
          (err, res) => {
            err ? console.log(err) : console.log(res);
          }
        );
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
app.use((_req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["https://fl-db.in"]);
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

app.get("/test", async (_req, res) => {
  try {
    // const result = await fetchLocationDetails(
    //   "#Breakfast #HighwayEateries #GourmetOnTheRoad The best breakfast spots on the Bengaluru-Mysuru Highway: Bidadi Thatte Idli, MTR Shivalli Restaurant, Maddur Tiffany’s. The Bengaluru Mysuru Highway is a busy one! And thanks to all that footfall, there’s definitely some great eateries that have popped up along the way. If you’re setting out early in the morning, these three eateries make for the ideal breakfast spots. Food Lovers’ Editor Kripal Amanna makes his first stop at Shri Renukambha Bidadi Thatte Idli, a small joint just off the highway in a town called Bidadi. The next stop on the highway is Shivalli, to sample their Rice Kadubu, a steamed rice-based dumpling served with chutney and sambar. The third and last stop is Maddur Tiffany’s. This famous eatery is popular for having invented the Maddur Vada, a delicious crispy, savoury, snack made with semolina, and flavoured with curry leaves, cashews and ghee! GOURMET ON THE ROAD RATINGS Shri Renukhambha Bidadi Thatte Idli THATTE IDLI these idlis are springy and very soft! they have a slight sour edge but eaten with that butter, it tastes heavenly! the chutneys served have a fiery, spicy bite to jolt your tastebuds awake! 9/10 MASALA VADE masala vada has a crispy, crunchy bite of the lentils along with the sweetness of onion and the surprise herbaceous note of dill. 7.5/10 UDDINA VADA crispy and very lightly seasoned. 7/10 Plate of Idli Vada Rs. 50 Maddur Tiffanys SPECIAL MADDUR VADA this feels and tastes like a scrumptious savoury cookie. there’s a prominent flavour of caramelized onions, curry leaves and cashew. rava in the batter gives it that grainy bite. it can feel dry after a few bites and needs that minty spicy chutney to moisten it. Rs. 23 9/10 COFFEE this is a frothy, well made coffee. it has the right amount of decoction and milk, and is served at just the right temperature. Rs. 26 8.5/10 Shivalli RICE KADUBU the batter is steamed in jackfruit leaves. this imparts a mild fragrance to the dish. the kadubu dissolves in your mouth. it pairs well with the tart sambar and is delicious with the coconut chutney too. Rs 50. 8.5/10 FILTER COFFEE frothy and strong, just the way coffee should be. make sure to pull it to cool the coffee down. Rs. 25. 8/10 ADDRESS - Shri Renukambha Bidadi Thatte idli, Mysore Road, Near police Station, Bidadi, Karnataka 562109; tel: 098450 61490; LOCATION TAG - https://maps.app.goo.gl/5MSfxPFvoJb3HSjS9 ADDRESS - Shivalli Restaurant, NH275, Mudagere, Karnataka 562160; LOCATION TAG - https://maps.google.com/?cid=10685406578336381720 ADDRESS - Maddur Tiffany's, Bangalore Mysore Highway, Shivapura, Maddur, Karnataka 571429; LOCATION TAG - https://maps.google.com/?cid=17775535769190595591 We guard the independent voice of our editorial features fiercely. Because ultimately, our loyalty lies to our viewers. SUPPORT FOOD LOVERS https://patreon.com/foodloverstv Our vision at Food Lovers is to be India’s finest, foremost and most importantly, trusted content platform in the field of food, wine & spirits and dining. Advertising is clearly demarcated and kept distinct from editorial. We do our best not to blur the lines between the two. As guided by our credo: Truth in food, wine and dining, we have chosen not to put up a paywall as we want our rich content to remain accessible to all. Independent food journalism – free for those who can’t afford it, supported by those who can. We hope you will support this endeavour by visiting our Patreon page. https://patreon.com/foodloverstv You can also make a one time, direct contribution to our bank account (details as below) Our bank details are as below: A/c name: Hospitality Initiatives India Pvt. Ltd. A/c No: 0056444807 IFSC code: CITI0000004 Bank: Citibank N A Branch: M G Road, Bangalore, Karnataka, India Please email the transfer details to info@foodlovers.in once you have made a contribution."
    // );
    // console.log(result);
    await scheduler();
    res.send("Hello");
  } catch (err) {
    console.error(err);
    res.send(err);
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
