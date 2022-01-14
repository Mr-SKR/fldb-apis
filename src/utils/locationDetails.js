const getUrls = require("get-urls");
const tracer = require("trace-redirect").default;
const isValidUrl = require("is-valid-http-url");
const { Client } = require("@googlemaps/google-maps-services-js");

const config = require("../config/config");
const { logger } = require("../config/logger");

const googleMapsClient = new Client({});

const fetchLocationDetails = async (description) => {
  let locationDetails = {};
  let locationURLParams = {};
  let hasValidLocationParams = false;
  const urls = getUrls(String(description));
  for (let url of urls) {
    if (url.includes("maps") && isValidUrl(url)) {
      if (config.replaceLinks.hasOwnProperty(url)) {
        url = config.replaceLinks[url];
      }
      const result = await tracer(url);
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
        hasValidLocationParams = true;
        break;
      }
    }
  }
  if (hasValidLocationParams) {
    try {
      const response = await googleMapsClient.placeDetails({
        params: {
          ...locationURLParams,
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
      locationDetails = response.data.result;
    } catch (err) {
      // console.error(err);
      logger.error(err);
    }
  }

  return locationDetails;
};

exports.fetchLocationDetails = fetchLocationDetails;
