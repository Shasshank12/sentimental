// Dynamic Components for Enterprise Sentiment Intelligence Dashboard

// Data Sources Configuration
const dataSources = [
    {
        name: "Twitter",
        icon: "🐦",
        color: "#1DA1F2",
        description: "Real-time social sentiment"
    },
    {
        name: "News APIs",
        icon: "📰",
        color: "#FF6B6B",
        description: "Breaking news analysis"
    },
    {
        name: "Reddit",
        icon: "🤖",
        color: "#FF4500",
        description: "Community discussions"
    },
    {
        name: "YouTube",
        icon: "📺",
        color: "#FF0000",
        description: "Video content sentiment"
    },
    {
        name: "LinkedIn",
        icon: "💼",
        color: "#0077B5",
        description: "Professional insights"
    },
    {
        name: "Instagram",
        icon: "📸",
        color: "#E4405F",
        description: "Visual content analysis"
    }
];

// Trending Topics Configuration
const trendingTopics = [
    { word: "AI", sentiment: "positive", frequency: 15 },
    { word: "Technology", sentiment: "positive", frequency: 12 },
    { word: "Innovation", sentiment: "positive", frequency: 10 },
    { word: "Climate", sentiment: "neutral", frequency: 8 },
    { word: "Economy", sentiment: "negative", frequency: 7 },
    { word: "Healthcare", sentiment: "positive", frequency: 9 },
    { word: "Education", sentiment: "positive", frequency: 6 },
    { word: "Politics", sentiment: "negative", frequency: 5 },
    { word: "Sports", sentiment: "neutral", frequency: 4 },
    { word: "Entertainment", sentiment: "positive", frequency: 3 }
];

// Initialize Dynamic Components
function initializeDynamicComponents() {
    createDataSourcesSlideshow();
    createTrendingWordCloud();
    initializeAnimations();
}

// Create Data Sources Slideshow
function createDataSourcesSlideshow() {
    const container = document.getElementById('data-sources-container');
    if (!container) return;

    let currentIndex = 0;
    const visibleCount = 3; // Show 3 sources at a time

    function updateSlideshow() {
        container.innerHTML = '';
        
        for (let i = 0; i < visibleCount; i++) {
            const sourceIndex = (currentIndex + i) % dataSources.length;
            const source = dataSources[sourceIndex];
            
            const sourceElement = document.createElement('div');
            sourceElement.className = 'data-source-item';
            sourceElement.style.animationDelay = `${i * 0.2}s`;
            
            sourceElement.innerHTML = `
                <div class="data-source-icon" style="background: ${source.color}">
                    ${source.icon}
                </div>
                <div class="data-source-info">
                    <div class="data-source-name">${source.name}</div>
                    <div class="data-source-description">${source.description}</div>
                </div>
            `;
            
            container.appendChild(sourceElement);
        }
        
        currentIndex = (currentIndex + 1) % dataSources.length;
    }

    // Initial render
    updateSlideshow();
    
    // Auto-rotate every 3 seconds
    setInterval(updateSlideshow, 3000);
}

// Create Trending Word Cloud
function createTrendingWordCloud() {
    const container = document.getElementById('word-cloud-container');
    if (!container) return;

    container.innerHTML = '';
    
    trendingTopics.forEach((topic, index) => {
        const wordElement = document.createElement('div');
        wordElement.className = `word-cloud-item word-cloud-${topic.sentiment}`;
        wordElement.style.animationDelay = `${index * 0.1}s`;
        wordElement.style.fontSize = `${Math.max(0.8, topic.frequency / 10)}rem`;
        wordElement.textContent = topic.word;
        
        // Add hover effect
        wordElement.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.2)';
        });
        
        wordElement.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        container.appendChild(wordElement);
    });
}

// Initialize Smooth Animations
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('.glass-card, .metric-card, .chart-container').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
}

// Enhanced Loading States
function showLoadingState(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
}

// Dynamic Chart Enhancements
function enhanceCharts() {
    // Add smooth transitions to Plotly charts
    const charts = document.querySelectorAll('.js-plotly-plot');
    charts.forEach(chart => {
        chart.style.transition = 'all 0.3s ease';
        chart.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
        });
        chart.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Parallax Effect for Background
function initializeParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax');
        
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
}

// Enhanced Form Interactions
function enhanceFormInteractions() {
    const inputs = document.querySelectorAll('.enhanced-input');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
}

// Dynamic Color Themes
function initializeDynamicThemes() {
    const themes = {
        default: {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#4facfe',
            warning: '#43e97b',
            danger: '#fa709a'
        },
        sunset: {
            primary: '#ff6b6b',
            secondary: '#feca57',
            success: '#48dbfb',
            warning: '#ff9ff3',
            danger: '#ff3838'
        },
        ocean: {
            primary: '#54a0ff',
            secondary: '#5f27cd',
            success: '#00d2d3',
            warning: '#ff9f43',
            danger: '#ff6b6b'
        }
    };

    // Auto-rotate themes every 30 seconds
    let currentThemeIndex = 0;
    const themeNames = Object.keys(themes);
    
    setInterval(() => {
        currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
        const themeName = themeNames[currentThemeIndex];
        applyTheme(themes[themeName]);
    }, 30000);
}

function applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}-color`, value);
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeDynamicComponents();
    initializeParallax();
    enhanceFormInteractions();
    initializeDynamicThemes();
    
    // Re-enhance charts after they're loaded
    setTimeout(enhanceCharts, 1000);
});

// Export functions for use in Streamlit
window.dynamicComponents = {
    initializeDynamicComponents,
    createDataSourcesSlideshow,
    createTrendingWordCloud,
    enhanceCharts,
    showLoadingState
}; 