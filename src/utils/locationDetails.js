const getUrls = require("get-urls");
const tracer = require("trace-redirect").default;
const { Client } = require("@googlemaps/google-maps-services-js");

const config = require("../config/config");

const googleMapsClient = new Client({});

const fetchLocationDetails = async (description) => {
  let locationDetails = {};
  let locationURLParams = null;
  const urls = getUrls(String(description));
  for (let url of urls) {
    if (config.replaceLinks.hasOwnProperty(url)) {
      url = config.replaceLinks[url];
    }
    const result = await tracer(url);

    if (result.includes("maps")) {
      const matches = [
        ...result.matchAll(new RegExp("0[xX][0-9a-fA-F]+", "g")),
      ];
      const hexLattitude = matches[0],
        hexLongitude = matches[1];
      if (hexLattitude && hexLongitude) {
        locationURLParams = {
          ftid: `${hexLattitude}:${hexLongitude}`,
          fields:
            "business_status,formatted_address,name,geometry,international_phone_number,place_id,rating,url,opening_hours",
          key: process.env.YOUTUBE_API_KEY,
        };
      }
      break;
    }
  }
  if (locationURLParams) {
    const response = await googleMapsClient.placeDetails({
      params: {
        ...locationURLParams,
      },
      headers = {'Content-Type': 'application/json','Referer': '*.fldb-apis.herokuapp.com/*'}
    });
    locationDetails = response.data.result;
  }

  return locationDetails;
};

const isPlaceOpen = async (placeId) => {
  const locationURLParams = {
    place_id: placeId,
    fields: "opening_hours,business_status",
    key: process.env.YOUTUBE_API_KEY,
  };
  const response = await googleMapsClient.placeDetails({
    params: {
      ...locationURLParams,
    },
    headers = {'Content-Type': 'application/json','Referer': '*.fldb-apis.herokuapp.com/*'}
  });
  return response.data.result;
};

exports.fetchLocationDetails = fetchLocationDetails;
exports.isPlaceOpen = isPlaceOpen;
