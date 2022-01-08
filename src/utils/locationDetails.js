const getUrls = require("get-urls");
const tracer = require("trace-redirect").default;
const axios = require("axios").default;

const fetchLocationDetails = async (description) => {
  let locationDetails = {};
  let locationURL = null;
  const urls = getUrls(String(description));
  for (const url of urls) {
    const result = await tracer(url);
    if (url.includes("g.page")) {
      // TODO: Handle g.page links. Example: https://g.page/malgudi-mylari-mane
      break;
    }

    if (result.includes("maps")) {
      const matches = [
        ...result.matchAll(new RegExp("0[xX][0-9a-fA-F]+", "g")),
      ];
      const hexLattitude = matches[0],
        hexLongitude = matches[1];
      locationURLTemplate = `https://maps.googleapis.com/maps/api/place/details/json?ftid=${hexLattitude}:${hexLongitude}&fields=business_status,formatted_address,name,geometry,international_phone_number,place_id,rating,url,opening_hours&key=${process.env.YOUTUBE_API_KEY}`;
      if (hexLattitude && hexLongitude) {
        locationURL = locationURLTemplate;
      }
      break;
    }
  }
  if (locationURL) {
    const response = await axios.get(locationURL);
    locationDetails = response.data.result;
  }

  return locationDetails;
};

const isPlaceOpen = async (placeId) => {
  const locationURLTemplate = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,business_status&key=${process.env.YOUTUBE_API_KEY}`;
  const response = await axios.get(locationURLTemplate);
  return response.data.result;
};

exports.fetchLocationDetails = fetchLocationDetails;
exports.isPlaceOpen = isPlaceOpen;
