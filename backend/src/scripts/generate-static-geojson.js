const fs = require("fs");
const fetch = require("node-fetch"); // npm install node-fetch@2
const axios = require("axios");
const path = require("path");

// Load .env from frontend directory where the REACT_APP_MAPBOX_ACCESS_TOKEN is defined
require("dotenv").config({
  path: "/Applications/dev/CCT499-Maker-Space/frontend/.env",
});

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

// Debug: Check if token is loaded
if (!MAPBOX_TOKEN) {
  console.error(
    "❌ MAPBOX_TOKEN not found! Make sure REACT_APP_MAPBOX_ACCESS_TOKEN is set in frontend/.env"
  );
  process.exit(1);
} else {
  console.log(`✅ Mapbox token loaded: ${MAPBOX_TOKEN.substring(0, 20)}...`);
}
const RATE_LIMIT_MS = 200; // 5 requests per second

async function geocodeAddress(address, postalCode, name) {
  // Skip addresses that are clearly not geocodable
  const invalidAddressPhrases = [
    "in the process of relocation",
    "currently closed",
    "temporarily closed",
    "relocating",
    "to be determined",
    "tbd",
    "not available",
    "n/a",
  ];

  if (
    invalidAddressPhrases.some((phrase) =>
      address.toLowerCase().includes(phrase)
    )
  ) {
    console.warn(
      `⚠️ Skipping non-geocodable address for ${name}: "${address}"`
    );
    return null;
  }

  // Build query string - try to extract actual address from descriptive text
  let query = address;

  // For KMDI specifically, try to use the Robarts Library address mentioned
  if (
    address.includes("Robarts Library") &&
    address.includes("130 St George St")
  ) {
    query = "130 St George St";
  }

  if (postalCode) query += `, ${postalCode}`;
  query += ", Ontario, Canada";

  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json`,
      {
        params: {
          limit: 1,
          proximity: "-79.3832,43.6532",
          country: "CA",
          access_token: MAPBOX_TOKEN,
        },
      }
    );

    const data = response.data;

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log(`✅ Geocoded ${name}: ${lat}, ${lng}`);
      return [lng, lat]; // GeoJSON format: [longitude, latitude]
    } else {
      console.warn(`❌ No results for: ${name} (${query})`);
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ Geocoding error for ${name} (${error.response.status}): ${
          error.response.data?.message || error.message
        }`
      );
      console.error(`   Query was: "${query}"`);
    } else {
      console.error(`❌ Geocoding error for ${name}:`, error.message);
    }
    return null;
  }
}

async function generateStaticGeoJSON() {
  try {
    // Read the original JSON file
    const jsonData = fs.readFileSync(
      "../../../frontend/public/gta_makerspace.json",
      "utf8"
    );
    const makerspaces = JSON.parse(jsonData);

    // Filter valid entries
    const validMakerspaces = makerspaces.filter(
      (m) => m.r && m.r.trim() !== "" && m.Address && m.Address.trim() !== ""
    );

    console.log(
      `🚀 Starting geocoding for ${validMakerspaces.length} makerspaces...`
    );

    const features = [];
    let successCount = 0;
    let failCount = 0;

    // Geocode each makerspace
    for (let i = 0; i < validMakerspaces.length; i++) {
      const makerspace = validMakerspaces[i];
      console.log(
        `\n📍 Geocoding ${i + 1}/${validMakerspaces.length}: ${makerspace.r}`
      );

      const coordinates = await geocodeAddress(
        makerspace.Address,
        makerspace["Postal Code"],
        makerspace.r
      );

      if (coordinates) {
        // Create GeoJSON feature
        const feature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: coordinates, // [lng, lat]
          },
          properties: {
            id: i,
            name: makerspace.r,
            address: makerspace.Address,
            postalCode: makerspace["Postal Code"],
            category: makerspace["General Category"] || "",
            accessModels: makerspace["Primary Access Models"] || "",
            skills: makerspace["Skills Required"] || "",
            phone: makerspace["Phone Number"] || "",
            email: makerspace["Email Address"] || "",
            website: makerspace.Link || "",
            notes: makerspace.Notes || "",
          },
        };

        features.push(feature);
        successCount++;
      } else {
        failCount++;
      }

      // Rate limiting - wait between requests
      if (i < validMakerspaces.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      }
    }

    // Create final GeoJSON object
    const geojson = {
      type: "FeatureCollection",
      features: features,
      metadata: {
        generated: new Date().toISOString(),
        totalMakerspaces: validMakerspaces.length,
        successfullyGeocoded: successCount,
        failed: failCount,
      },
    };

    // Write to static file
    const outputPath = "../../../frontend/public/makerspaces.geojson";
    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));

    console.log(`\n🎉 Static GeoJSON generation complete!`);
    console.log(`✅ Successfully geocoded: ${successCount}`);
    console.log(`❌ Failed to geocode: ${failCount}`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(
      `📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`
    );
  } catch (error) {
    console.error("❌ Error generating static GeoJSON:", error);
  }
}

// Run the script
generateStaticGeoJSON();
