const axios = require('axios');
const { MAPBOX_ACCESS_TOKEN } = require('../config/env');

const getDirections = async (query) => {
  if (!MAPBOX_ACCESS_TOKEN) {
    const error = new Error('Mapbox access token is not configured');
    error.statusCode = 500;
    throw error;
  }

  const profile = query.profile || 'driving';
  const coordinates = `${query.origin_lng},${query.origin_lat};${query.destination_lng},${query.destination_lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;

  let response;
  try {
    response = await axios.get(url, {
      params: {
        geometries: 'geojson',
        overview: 'full',
        steps: false,
        access_token: MAPBOX_ACCESS_TOKEN
      },
      timeout: 15000
    });
  } catch (axiosError) {
    const error = new Error(
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'Mapbox request failed'
    );
    error.statusCode = axiosError.response?.status || 500;
    throw error;
  }

  const route = response.data?.routes?.[0];
  if (!route) {
    const error = new Error('Route not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    distance_meters: route.distance,
    duration_seconds: route.duration,
    geometry: route.geometry,
    legs: route.legs || []
  };
};

module.exports = {
  getDirections
};
