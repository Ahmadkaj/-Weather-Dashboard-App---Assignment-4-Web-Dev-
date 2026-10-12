// Get the elements from the HTML
const form = document.querySelector('#search-form');
const cityInput = document.querySelector('#city-input');
const searchBtn = document.querySelector('#search-btn');
const statusBox = document.querySelector('#status');
const statusMessage = document.querySelector('#status-message');
const results = document.querySelector('#results');

// Shows the page state: idle, loading, success or error
function setStatus(state, message) {
  statusBox.dataset.state = state; // the CSS styles each state
  statusMessage.textContent = message;
  searchBtn.disabled = state === 'loading'; // no double clicks while loading

  if (state === 'success') {
    results.classList.remove('hidden');
  } else {
    results.classList.add('hidden');
  }
}

// Sends a request and returns the JSON data
async function getJSON(url) {
  const response = await fetch(url); // fails if there is no internet

  // fetch does not fail on 404 or 500, so we check it ourselves
  if (response.status === 429) {
    throw new Error('rate-limit');
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// Turns the weather code from the API into a description and an icon
// (Open-Meteo uses the standard WMO weather codes)
function getCondition(code) {
  if (code === 0) return ['Clear sky', '☀️'];
  if (code <= 2) return ['Partly cloudy', '🌤️'];
  if (code === 3) return ['Overcast', '☁️'];
  if (code <= 48) return ['Fog', '🌫️'];
  if (code <= 57) return ['Drizzle', '🌦️'];
  if (code <= 67) return ['Rain', '🌧️'];
  if (code <= 77) return ['Snow', '❄️'];
  if (code <= 82) return ['Rain showers', '🌦️'];
  if (code <= 86) return ['Snow showers', '🌨️'];
  return ['Thunderstorm', '⛈️'];
}

// Puts the weather data on the page
function showWeather(place, weather) {
  const condition = getCondition(weather.weather_code);

  // some places have no country, so only add it if it exists
  let location = place.name;
  if (place.country) {
    location = `${place.name}, ${place.country}`;
  }

  // show a moon instead of a sun on clear nights (is_day is 0 at night)
  let icon = condition[1];
  if (weather.is_day === 0 && weather.weather_code <= 2) {
    icon = '🌙';
  }

  document.querySelector('#city').textContent = location;
  document.querySelector('#icon').textContent = icon;
  document.querySelector('#temp').textContent = `${Math.round(weather.temperature_2m)}°C`;
  document.querySelector('#condition').textContent = condition[0];
  document.querySelector('#feels').textContent = `${Math.round(weather.apparent_temperature)}°C`;
  document.querySelector('#humidity').textContent = `${weather.relative_humidity_2m}%`;
  document.querySelector('#wind').textContent = `${Math.round(weather.wind_speed_10m)} km/h`;
}

// Runs when the user searches for a city
async function searchWeather() {
  const city = cityInput.value.trim(); // remove extra spaces

  if (city === '') {
    setStatus('error', 'Please enter a city name.');
    return;
  }

  setStatus('loading', `Loading weather for ${city}...`);

  try {
    // 1. Find the city's latitude and longitude
    // URLSearchParams builds the "?name=...&count=1" part safely (spaces, symbols)
    const params = new URLSearchParams({ name: city, count: 1 });
    const geo = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!geo.results) {
      throw new Error('not-found');
    }
    const place = geo.results[0];

    // 2. Get the current weather for those coordinates
    const data = await getJSON(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day'
    );

    // the request worked but the data we need is missing
    if (!data.current) {
      throw new Error('bad-data');
    }

    showWeather(place, data.current);
    setStatus('success', '');
  } catch (error) {
    // show a clear message instead of crashing
    console.warn(error);

    if (error.message === 'not-found') {
      setStatus('error', 'City not found. Check the spelling and try again.');
    } else if (error.message === 'rate-limit') {
      setStatus('error', 'Too many requests. Wait a moment and try again.');
    } else if (error.message === 'bad-data') {
      setStatus('error', 'The weather data came back incomplete. Please try again.');
    } else {
      setStatus('error', "Couldn't reach the weather server. Check your connection and try again.");
    }
  }
}

// Search when the form is submitted (button click or Enter key)
form.addEventListener('submit', (e) => {
  e.preventDefault(); // stop the page from reloading
  searchWeather();
});

setStatus('idle', 'Search for a city to see the weather.');
