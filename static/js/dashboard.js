// Enterprise Sentiment Intelligence Dashboard - Interactive JavaScript

// Smooth scrolling for navigation
function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Chart animation on load
function animateCharts() {
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach((chart, index) => {
        setTimeout(() => {
            chart.style.opacity = '0';
            chart.style.transform = 'translateY(20px)';
            chart.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                chart.style.opacity = '1';
                chart.style.transform = 'translateY(0)';
            }, 100);
        }, index * 200);
    });
}

// Metric counter animation
function animateMetrics() {
    const metrics = document.querySelectorAll('.stMetric');
    metrics.forEach((metric, index) => {
        setTimeout(() => {
            metric.style.opacity = '0';
            metric.style.transform = 'scale(0.8)';
            metric.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                metric.style.opacity = '1';
                metric.style.transform = 'scale(1)';
            }, 100);
        }, index * 150);
    });
}

// Chat message animation
function animateChatMessage(messageElement) {
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateX(-20px)';
    messageElement.style.transition = 'all 0.4s ease';
    
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateX(0)';
    }, 100);
}

// Progress bar animation
function animateProgressBar(progressElement) {
    progressElement.style.width = '0%';
    progressElement.style.transition = 'width 1s ease-in-out';
    
    setTimeout(() => {
        progressElement.style.width = '100%';
    }, 100);
}

// Hover effects for interactive elements
function addHoverEffects() {
    const interactiveElements = document.querySelectorAll('.metric-card, .chart-container, .enterprise-card');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        });
    });
}

// Auto-refresh functionality for real-time updates
function setupAutoRefresh(interval = 30000) { // 30 seconds
    setInterval(() => {
        // Check for new data and update charts
        console.log('Checking for updates...');
        // Add your update logic here
    }, interval);
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + Enter to analyze
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            const analyzeButton = document.querySelector('button[data-testid="baseButton-secondary"]');
            if (analyzeButton) {
                analyzeButton.click();
            }
        }
        
        // Escape to clear input
        if (event.key === 'Escape') {
            const inputField = document.querySelector('input[placeholder*="topic"]');
            if (inputField) {
                inputField.value = '';
            }
        }
    });
}

// Performance monitoring
function monitorPerformance() {
    const startTime = performance.now();
    
    window.addEventListener('load', function() {
        const loadTime = performance.now() - startTime;
        console.log(`Dashboard loaded in ${loadTime.toFixed(2)}ms`);
        
        if (loadTime > 3000) {
            console.warn('Dashboard load time is slow. Consider optimizing.');
        }
    });
}

// Initialize all interactive features
function initializeDashboard() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDashboard);
        return;
    }
    
    // Initialize all features
    animateCharts();
    animateMetrics();
    addHoverEffects();
    setupKeyboardShortcuts();
    monitorPerformance();
    
    // Setup auto-refresh for real-time updates
    setupAutoRefresh();
    
    console.log('Dashboard initialized successfully!');
}

// Export functions for use in Streamlit
window.dashboardUtils = {
    smoothScrollTo,
    animateCharts,
    animateMetrics,
    animateChatMessage,
    animateProgressBar,
    initializeDashboard
};

// Auto-initialize when script loads
initializeDashboard(); 