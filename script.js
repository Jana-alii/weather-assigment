// script.js - Weather App with Real API

// OpenWeatherMap API Configuration
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const ICON_URL = 'https://openweathermap.org/img/wn';

// Global variables
let currentCity = 'Cairo';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const weatherGrid = document.getElementById('weatherGrid');
const locationName = document.getElementById('locationName');

// Event Listeners
cityInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchWeather();
    }
});

searchBtn.addEventListener('click', searchWeather);

// Initialize app
window.addEventListener('load', function() {
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    await getWeatherByCoordinates(lat, lon);
                },
                () => {
                    // Fallback to default city if geolocation fails
                    getWeatherByCity(currentCity);
                }
            );
        } else {
            // Fallback if geolocation is not supported
            getWeatherByCity(currentCity);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        getWeatherByCity(currentCity);
    }
}

// Search weather function
async function searchWeather() {
    const city = cityInput.value.trim();
    
    if (!city) {
        showError('من فضلك أدخل اسم المدينة');
        return;
    }
    
    await getWeatherByCity(city);
    cityInput.value = '';
}

// Get weather by city name
async function getWeatherByCity(city) {
    try {
        showLoading(true);
        hideError();
        
        // Get current weather
        const currentWeather = await fetchWeatherData(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
        
        // Get 5-day forecast
        const forecast = await fetchWeatherData(`${FORECAST_URL}?q=${city}&appid=${API_KEY}&units=metric`);
        
        // Process and display data
        const weatherData = processWeatherData(currentWeather, forecast);
        displayWeather(weatherData);
        
        currentCity = city;
        showLoading(false);
        
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError('لم يتم العثور على المدينة. تأكد من صحة الاسم وجرب مرة أخرى');
        showLoading(false);
    }
}

// Get weather by coordinates
async function getWeatherByCoordinates(lat, lon) {
    try {
        showLoading(true);
        hideError();
        
        // Get current weather
        const currentWeather = await fetchWeatherData(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        
        // Get 5-day forecast
        const forecast = await fetchWeatherData(`${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        
        // Process and display data
        const weatherData = processWeatherData(currentWeather, forecast);
        displayWeather(weatherData);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error fetching weather by coordinates:', error);
        // Fallback to default city
        getWeatherByCity(currentCity);
    }
}

// Fetch weather data from API
async function fetchWeatherData(url) {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
}

// Process weather data for display
function processWeatherData(currentWeather, forecast) {
    const days = [];
    
    // Add current day
    days.push({
        date: 'اليوم',
        icon: `${ICON_URL}/${currentWeather.weather[0].icon}@2x.png`,
        temp: Math.round(currentWeather.main.temp),
        desc: translateWeatherDescription(currentWeather.weather[0].description),
        humidity: currentWeather.main.humidity,
        wind: Math.round(currentWeather.wind.speed * 3.6), // Convert m/s to km/h
        pressure: currentWeather.main.pressure,
        visibility: currentWeather.visibility ? Math.round(currentWeather.visibility / 1000) : 'N/A'
    });
    
    // Process forecast for next 2 days
    const today = new Date().getDate();
    const processedDays = [];
    
    forecast.list.forEach(item => {
        const forecastDate = new Date(item.dt * 1000);
        const day = forecastDate.getDate();
        
        // Skip today and get next 2 days (noon forecasts for better accuracy)
        if (day !== today && forecastDate.getHours() === 12 && processedDays.length < 2) {
            const dayName = processedDays.length === 0 ? 'غداً' : 'بعد غد';
            
            days.push({
                date: dayName,
                icon: `${ICON_URL}/${item.weather[0].icon}@2x.png`,
                temp: Math.round(item.main.temp),
                desc: translateWeatherDescription(item.weather[0].description),
                humidity: item.main.humidity,
                wind: Math.round(item.wind.speed * 3.6),
                pressure: item.main.pressure,
                visibility: item.visibility ? Math.round(item.visibility / 1000) : 'N/A'
            });
            
            processedDays.push(day);
        }
    });
    
    // If we don't have enough forecast days, fill with available data
    while (days.length < 3 && forecast.list.length > days.length) {
        const item = forecast.list[days.length * 8]; // Get data every 24 hours (8 * 3-hour intervals)
        if (item) {
            const dayName = days.length === 1 ? 'غداً' : 'بعد غد';
            
            days.push({
                date: dayName,
                icon: `${ICON_URL}/${item.weather[0].icon}@2x.png`,
                temp: Math.round(item.main.temp),
                desc: translateWeatherDescription(item.weather[0].description),
                humidity: item.main.humidity,
                wind: Math.round(item.wind.speed * 3.6),
                pressure: item.main.pressure,
                visibility: item.visibility ? Math.round(item.visibility / 1000) : 'N/A'
            });
        }
    }
    
    return {
        location: `${currentWeather.name}, ${currentWeather.sys.country}`,
        days: days
    };
}

// Translate weather descriptions to Arabic
function translateWeatherDescription(description) {
    const translations = {
        'clear sky': 'سماء صافية',
        'few clouds': 'قليل الغيوم',
        'scattered clouds': 'غيوم متناثرة',
        'broken clouds': 'غيوم متكسرة',
        'overcast clouds': 'سماء غائمة',
        'shower rain': 'زخات مطر',
        'rain': 'مطر',
        'light rain': 'مطر خفيف',
        'moderate rain': 'مطر متوسط',
        'heavy intensity rain': 'مطر غزير',
        'very heavy rain': 'مطر شديد جداً',
        'extreme rain': 'مطر شديد للغاية',
        'freezing rain': 'مطر متجمد',
        'light intensity shower rain': 'زخات مطر خفيفة',
        'heavy intensity shower rain': 'زخات مطر غزيرة',
        'ragged shower rain': 'زخات مطر متقطعة',
        'thunderstorm': 'عاصفة رعدية',
        'thunderstorm with light rain': 'عاصفة رعدية مع مطر خفيف',
        'thunderstorm with rain': 'عاصفة رعدية مع مطر',
        'thunderstorm with heavy rain': 'عاصفة رعدية مع مطر غزير',
        'light thunderstorm': 'عاصفة رعدية خفيفة',
        'heavy thunderstorm': 'عاصفة رعدية شديدة',
        'ragged thunderstorm': 'عاصفة رعدية متقطعة',
        'thunderstorm with light drizzle': 'عاصفة رعدية مع رذاذ خفيف',
        'thunderstorm with drizzle': 'عاصفة رعدية مع رذاذ',
        'thunderstorm with heavy drizzle': 'عاصفة رعدية مع رذاذ كثيف',
        'light intensity drizzle': 'رذاذ خفيف',
        'drizzle': 'رذاذ',
        'heavy intensity drizzle': 'رذاذ كثيف',
        'light intensity drizzle rain': 'رذاذ مطر خفيف',
        'drizzle rain': 'رذاذ مطر',
        'heavy intensity drizzle rain': 'رذاذ مطر كثيف',
        'shower rain and drizzle': 'زخات مطر ورذاذ',
        'heavy shower rain and drizzle': 'زخات مطر ورذاذ كثيف',
        'shower drizzle': 'زخات رذاذ',
        'light snow': 'ثلج خفيف',
        'snow': 'ثلج',
        'heavy snow': 'ثلج كثيف',
        'sleet': 'مطر ثلجي',
        'light shower sleet': 'زخات مطر ثلجية خفيفة',
        'shower sleet': 'زخات مطر ثلجية',
        'light rain and snow': 'مطر وثلج خفيف',
        'rain and snow': 'مطر وثلج',
        'light shower snow': 'زخات ثلج خفيفة',
        'shower snow': 'زخات ثلج',
        'heavy shower snow': 'زخات ثلج كثيفة',
        'mist': 'ضباب خفيف',
        'smoke': 'دخان',
        'haze': 'ضباب',
        'sand/dust whirls': 'دوامات رمل/غبار',
        'fog': 'ضباب كثيف',
        'sand': 'رمال',
        'dust': 'غبار',
        'volcanic ash': 'رماد بركاني',
        'squalls': 'عواصف',
        'tornado': 'إعصار'
    };
    
    return translations[description.toLowerCase()] || description;
}

// Display weather data
function displayWeather(weatherData) {
    locationName.textContent = weatherData.location;
    weatherGrid.innerHTML = '';
    
    weatherData.days.forEach((day, index) => {
        const card = document.createElement('div');
        card.className = 'weather-card';
        card.style.animationDelay = `${index * 0.2}s`;
        
        card.innerHTML = `
            <div class="date-header">${day.date}</div>
            <div class="weather-icon">
                <img src="${day.icon}" alt="${day.desc}" />
            </div>
            <div class="temperature">${day.temp}°</div>
            <div class="weather-desc">${day.desc}</div>
            <div class="weather-details">
                <div class="detail-item">
                    <div class="detail-label">الرطوبة</div>
                    <div class="detail-value">${day.humidity}%</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">الرياح</div>
                    <div class="detail-value">${day.wind} كم/س</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">الضغط</div>
                    <div class="detail-value">${day.pressure} هكتوباسكال</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">الرؤية</div>
                    <div class="detail-value">${day.visibility} كم</div>
                </div>
            </div>
        `;
        
        weatherGrid.appendChild(card);
    });
}

// Show loading state
function showLoading(show) {
    if (show) {
        loading.style.display = 'flex';
        weatherGrid.style.opacity = '0.5';
        searchBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        weatherGrid.style.opacity = '1';
        searchBtn.disabled = false;
    }
}

// Show error message
function showError(message) {
    const errorText = document.querySelector('.error-text');
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Utility function to debounce API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add search suggestions (optional enhancement)
const debouncedSearch = debounce(searchWeather, 300);

// Error handling for failed API requests
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showError('حدث خطأ في الاتصال. تحقق من اتصالك بالإنترنت');
});

// Check if API key is set
if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('⚠️ API Key not set! Please replace YOUR_API_KEY_HERE with your actual OpenWeatherMap API key');
    showError('مفتاح API غير محدد. يرجى تحديث المفتاح في الكود');
}