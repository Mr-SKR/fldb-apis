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
    console.log("Playlist video collection complete");
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
    for (const video of videoDetailsList) {
      if (video?.snippet?.description && video?.snippet?.title && video?.id) {
        const geodetails = await fetchLocationDetails(
          video.snippet.description
        );
        results = results.concat({
          videoId: video.id,
          videoTitle: video.snippet.title,
          videoDescription: video.snippet.description,
          ...geodetails,
        });
      } else {
        console.error(`Could not extract properties from ${video}`);
      }
    }
    console.log("Location details extraction complete");
    for (const result of results) {
      const existingVideo = await Video.findOne({ videoId: result.videoId });
      if (!existingVideo) {
        new Video(result).save();
      } else {
        Video.updateOne({ videoId: result.videoId }, result, (err, _res) => {
          err && console.error(err);
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
          (err, _res) => {
            err && console.error(err);
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

app.get("/scheduler", async (req, res) => {
  try {
    await scheduler();
    res.send("Scheduler execution completed");
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
    const result = await fetchLocationDetails(
      `
      Serving authentic Tamil-Brahmin style meals for close to 60 years now, Iyer Mess is a go-to spot for lunch at Malleshwaram, Bengaluru. 

Founded in 1959, the mess is located in the home of owners, Venkatesh and Kamala Iyer.

The couple who have carried forward the tradition of serving homestyle vegetarian fare, use recipes handed down by Mr Iyer’s father to maintain taste and style of cooking.

In this episode of Gourmet On The Road, Food Lovers Editor, Kripal Amanna visits the well-known mess to explore its kitchen and taste the ‘veg homely meal’.

The kitchen starts as early as 5:00 am every morning, preparing a standard banana leaf meal, comprising of Rice, Sambar, Rasam, Poriyal, Kootu, Pickle, Yoghurt, Vada and Appalam. On Sundays the menu features a special additions of Payasam and Mor Kuzambu.

GOURMET ON THE ROAD RATING
Rs 70 for a vegetarian meal

Kose/ Cabbage Poriyal
A fresh, crunchy medley of cabbage and flecks of coconut, simply seasoned with mustard. 8/10


Kumbalakai/ Sweet Pumpkin Kootu
A mildly tempered, delicious preparation. Can taste the sweetness of the pumpkin, a tasty combination with the chapati.
9/10

Paruppu Vada
deep fried yet wholesome because of the lentil or paruppu in the vada. Flecks of onion impart hints of sweetness and the green chillies give it that spicy kick.
8/10


Chapati
Soft and light, a homestyle chapati.
7/10

Thayir Sadam/Curd Rice
thick and creamy, homemade curd. the milk for the curd is cooked on a coal stove!
9/10

Pickle
Spicy, bitter accompaniment called oorukka in Tamil.
7/10

Moolangi/ Radish Sambar
Big in flavour, the spicy, fiery kick from the chilli is very prominent in this sambar. The radish is cooked just right!
10/10

Rasam
a bit mellow. not as robustly flavoured as one would expect.
6/10

Appalam
Crunchy, deep fried, perfect when eaten with rice and rasam or sambar.
8/10

ADDRESS - Iyer Mess, No 4/3, West Park Road Between 7th and 8th Cross, Malleshwaram West, Bengaluru, Karnataka 560003; tel: 098860 78290

LOCATION TAG - https://goo.gl/maps/JLGgTcL8MC5Pfs7L9

Food Lovers is India’s finest content and experience platform on food, wines & spirits and dining. Watch our thrilling videos capturing fine dining, culinary traditions, new experiences and trends in the world of food. 

SUPPORT FOOD LOVERS https://www.patreon.com/foodloverstv

Our vision at Food Lovers is to be India’s finest, foremost and most importantly, trusted content platform in the field of food, wine & spirits and dining. Advertising is clearly demarcated and kept distinct from editorial. We do our best not to blur the lines between the two.

We guard the independent voice of our editorial features fiercely. Because ultimately, our loyalty lies to our viewers, as guided by our credo: Truth in food, wine and dining.

We have chosen not to put up a paywall as we want our rich content to remain accessible to all. Independent food journalism – free for those who can’t afford it, supported by those who can.

We hope you will support this endeavour by visiting our Patreon page.
https://www.patreon.com/foodloverstv

More Ways to Follow Us: 

Facebook: https://www.facebook.com/foodloversmag/

Instagram: https://www.instagram.com/foodloversi...

Twitter: https://twitter.co

You can also make a one time, direct contribution to our bank account (details as below) 
Our bank details are as below:
A/c name: Hospitality Initiatives India Pvt. Ltd.
A/c No: 0056444807
IFSC code: CITI0000004
Bank: Citibank N A
Branch: M G Road, Bangalore, Karnataka, India

Please email the transfer details to info@foodlovers.in once you have made a contribution
      `
    );
    console.log(result);
    res.send(result);
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
