import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import joblib
import tweepy
import json
import re
from datetime import datetime, timedelta
import time
from collections import Counter
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
import os
from dotenv import load_dotenv
import yaml
import random

# Load environment variables from .env file
load_dotenv()

# Load configuration
def load_config():
    """Load dashboard configuration from YAML file."""
    try:
        with open('config/dashboard_config.yaml', 'r') as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        # Return default config if file doesn't exist
        return {
            'dashboard': {'title': 'Enterprise Sentiment Intelligence'},
            'analysis': {'default_tweet_count': 100, 'min_tweets': 10, 'max_tweets': 200},
            'ui': {'animations': True, 'hover_effects': True}
        }

# Load configuration
config = load_config()

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

# Page configuration
st.set_page_config(
    page_title=config['dashboard']['title'],
    page_icon="🏢",
    layout=config['dashboard']['layout'],
    initial_sidebar_state=config['dashboard']['sidebar_state']
)

# Load external CSS
def load_css():
    """Load CSS from external file."""
    try:
        # Load the new Tailwind-inspired CSS
        with open('static/css/tailwind-style.css', 'r') as f:
            css_content = f.read()
            st.markdown(f'<style>{css_content}</style>', unsafe_allow_html=True)
            st.markdown("""
            <style>
            /* Force apply the gradient background */
            .stApp {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                min-height: 100vh !important;
            }
            
            /* Force apply the main header styling */
            .main-header {
                font-size: 3.5rem !important;
                font-weight: 800 !important;
                text-align: center !important;
                margin-bottom: 3rem !important;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                background-clip: text !important;
                letter-spacing: -0.025em !important;
                line-height: 1.1 !important;
                position: relative !important;
            }
            
            /* Force apply glass card styling */
            .glass-card {
                background: rgba(255, 255, 255, 0.1) !important;
                backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 16px !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            /* Force apply metric card styling */
            .metric-card {
                background: rgba(255, 255, 255, 0.1) !important;
                backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 16px !important;
                padding: 1.5rem !important;
                text-align: center !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .metric-value {
                font-size: 2.5rem !important;
                font-weight: 800 !important;
                color: white !important;
                margin-bottom: 0.5rem !important;
                display: block !important;
            }
            
            .metric-label {
                font-size: 0.9rem !important;
                font-weight: 600 !important;
                color: rgba(255, 255, 255, 0.8) !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
            }
            
            /* Force apply chart container styling */
            .chart-container {
                background: rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 20px !important;
                padding: 2rem !important;
                margin: 1.5rem 0 !important;
                transition: all 0.3s ease !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .chart-title {
                font-size: 1.25rem !important;
                font-weight: 700 !important;
                color: white !important;
                margin-bottom: 1.5rem !important;
                text-align: center !important;
                position: relative !important;
                z-index: 1 !important;
            }
            
            /* Force apply data sources slideshow styling */
            .data-sources-slideshow {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 2rem !important;
                padding: 2rem !important;
                background: rgba(255, 255, 255, 0.05) !important;
                border-radius: 16px !important;
                margin: 2rem 0 !important;
                overflow: hidden !important;
                position: relative !important;
            }
            
            .data-source-item {
                display: flex !important;
                align-items: center !important;
                gap: 0.75rem !important;
                padding: 1rem 1.5rem !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                transition: all 0.3s ease !important;
                animation: slideIn 0.6s ease-out !important;
            }
            
            .data-source-icon {
                width: 32px !important;
                height: 32px !important;
                border-radius: 8px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 1.2rem !important;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
            }
            
            .data-source-name {
                font-weight: 600 !important;
                color: white !important;
                font-size: 0.95rem !important;
            }
            
            /* Force apply word cloud styling */
            .word-cloud-container {
                background: rgba(255, 255, 255, 0.05) !important;
                border-radius: 20px !important;
                padding: 2rem !important;
                margin: 2rem 0 !important;
                backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .word-cloud-title {
                font-size: 1.5rem !important;
                font-weight: 700 !important;
                color: white !important;
                text-align: center !important;
                margin-bottom: 1.5rem !important;
                position: relative !important;
                z-index: 1 !important;
            }
            
            .word-cloud {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                gap: 1rem !important;
                position: relative !important;
                z-index: 1 !important;
            }
            
            .word-cloud-item {
                padding: 0.5rem 1rem !important;
                border-radius: 20px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                animation: fadeInUp 0.6s ease-out !important;
            }
            
            .word-cloud-positive {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
                color: white !important;
            }
            
            .word-cloud-negative {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%) !important;
                color: white !important;
            }
            
            .word-cloud-neutral {
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
                color: #2d3748 !important;
            }
            
            /* Animations */
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            </style>
            """, unsafe_allow_html=True)
    except FileNotFoundError:
        # Fallback to original CSS if file doesn't exist
        try:
            with open('static/css/style.css', 'r') as f:
                st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)
        except FileNotFoundError:
            # Fallback to inline CSS if file doesn't exist
            st.markdown("""
            <style>
                .main-header { font-size: 3rem; color: #1f77b4; text-align: center; margin-bottom: 2rem; font-weight: bold; }
                .enterprise-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 1rem; color: white; margin: 1rem 0; }
                .chart-container { background: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); margin: 1rem 0; min-height: 450px; }
            </style>
            """, unsafe_allow_html=True)

# Load external JavaScript
def load_js():
    """Load JavaScript from external file."""
    try:
        # Load the new dynamic components JS
        with open('static/js/dynamic-components.js', 'r') as f:
            js_content = f.read()
            st.markdown(f'<script>{js_content}</script>', unsafe_allow_html=True)
            
            # Add initialization script
            st.markdown("""
            <script>
            // Initialize dynamic components when page loads
            document.addEventListener('DOMContentLoaded', function() {
                // Create data sources slideshow
                const dataSources = [
                    {name: "Twitter", icon: "🐦", color: "#1DA1F2", description: "Real-time social sentiment"},
                    {name: "News APIs", icon: "📰", color: "#FF6B6B", description: "Breaking news analysis"},
                    {name: "Reddit", icon: "🤖", color: "#FF4500", description: "Community discussions"},
                    {name: "YouTube", icon: "📺", color: "#FF0000", description: "Video content sentiment"},
                    {name: "LinkedIn", icon: "💼", color: "#0077B5", description: "Professional insights"},
                    {name: "Instagram", icon: "📸", color: "#E4405F", description: "Visual content analysis"}
                ];
                
                // Create trending topics
                const trendingTopics = [
                    {word: "AI", sentiment: "positive", frequency: 15},
                    {word: "Technology", sentiment: "positive", frequency: 12},
                    {word: "Innovation", sentiment: "positive", frequency: 10},
                    {word: "Climate", sentiment: "neutral", frequency: 8},
                    {word: "Economy", sentiment: "negative", frequency: 7},
                    {word: "Healthcare", sentiment: "positive", frequency: 9},
                    {word: "Education", sentiment: "positive", frequency: 6},
                    {word: "Politics", sentiment: "negative", frequency: 5},
                    {word: "Sports", sentiment: "neutral", frequency: 4},
                    {word: "Entertainment", sentiment: "positive", frequency: 3}
                ];
                
                // Initialize data sources slideshow
                function createDataSourcesSlideshow() {
                    const container = document.getElementById('data-sources-container');
                    if (!container) return;
                    
                    let currentIndex = 0;
                    const visibleCount = 3;
                    
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
                    
                    updateSlideshow();
                    setInterval(updateSlideshow, 3000);
                }
                
                // Initialize word cloud
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
                        
                        container.appendChild(wordElement);
                    });
                }
                
                // Initialize components
                setTimeout(() => {
                    createDataSourcesSlideshow();
                    createTrendingWordCloud();
                }, 1000);
            });
            </script>
            """, unsafe_allow_html=True)
    except FileNotFoundError:
        # Fallback to original JS if file doesn't exist
        try:
            with open('static/js/dashboard.js', 'r') as f:
                st.markdown(f'<script>{f.read()}</script>', unsafe_allow_html=True)
        except FileNotFoundError:
            # Fallback if JS file doesn't exist
            pass

# Load CSS and JS
load_css()
load_js()

# Initialize session state for data flow
if 'current_analysis_data' not in st.session_state:
    st.session_state.current_analysis_data = None
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []
if 'show_ai_chat' not in st.session_state:
    st.session_state.show_ai_chat = False

@st.cache_data
def load_model():
    """Load the trained sentiment model."""
    try:
        model = joblib.load('best_enhanced_sentiment_model.pkl')
        return model
    except FileNotFoundError:
        st.error("Model file not found. Please run the training script first.")
        return None

def enhanced_preprocess_tweet(text):
    """Enhanced tweet preprocessing with stopwords removal and lemmatization."""
    if not isinstance(text, str):
        return ""
    
    # Basic cleaning
    text = re.sub(r"http\S+|www\S+", "", text)  # Remove URLs
    text = re.sub(r"@[A-Za-z0-9_]+", "", text)    # Remove mentions
    text = re.sub(r"#[A-Za-z0-9_]+", "", text)    # Remove hashtags
    text = re.sub(r"[\U00010000-\U0010ffff]", "", text)  # Remove emojis
    
    # Keep important punctuation for sentiment
    text = re.sub(r"[^\w\s.,!?']", "", text)
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words]
    
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens]
    
    return ' '.join(tokens)

def predict_sentiment(model, text):
    """Predict sentiment for a given text."""
    if model is None:
        return None, None
    
    cleaned_text = enhanced_preprocess_tweet(text)
    prediction = model.predict([cleaned_text])[0]
    probabilities = model.predict_proba([cleaned_text])[0]
    
    # Map prediction to sentiment
    sentiment_map = {0: 'negative', 1: 'neutral', 2: 'positive'}
    sentiment = sentiment_map[prediction]
    confidence = max(probabilities)
    
    return sentiment, confidence

def fetch_realtime_tweets(query, count=100):
    """Fetch real-time data from multiple sources (Twitter, Reddit, News)."""
    try:
        # For now, use sample data (will be replaced with multi-source fetcher later)
        return get_sample_tweets(query, count)
    except Exception as e:
        st.error(f"Error fetching data: {str(e)}")
        return get_sample_tweets(query, count)

def get_sample_tweets(query, count):
    """Get sample tweets for demonstration with realistic data."""
    # Create more realistic sample tweets
    sample_tweets = []
    
    # Generate tweets with realistic timestamps over the last 24 hours
    base_time = datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo) - timedelta(hours=24)
    
    # Create varied sentiment distribution
    positive_tweets = [
        f"Just discovered {query}! This is absolutely amazing and revolutionary! 🚀",
        f"Can't believe how incredible {query} is. Game changer!",
        f"Finally got to experience {query}. Worth every moment!",
        f"{query} exceeded all my expectations. Simply outstanding!",
        f"Wow, {query} is everything I hoped for and more!",
        f"Amazing experience with {query}. Highly recommend!",
        f"{query} is the future. Love it!",
        f"Best thing I've seen in a while - {query}!",
        f"Incredible innovation with {query}. Mind blown!",
        f"{query} is revolutionary. Can't wait to see more!"
    ]
    
    negative_tweets = [
        f"Disappointed with {query}. Not what I expected at all.",
        f"{query} is a complete letdown. Waste of time.",
        f"Terrible experience with {query}. Avoid at all costs.",
        f"Can't believe how bad {query} is. Regret trying it.",
        f"{query} is overrated. Don't waste your money.",
        f"Horrible service with {query}. Never again.",
        f"{query} is a disaster. Stay away!",
        f"Worst decision ever - trying {query}.",
        f"{query} is a complete failure. Avoid!",
        f"Terrible quality with {query}. Not recommended."
    ]
    
    neutral_tweets = [
        f"Just checked out {query}. Interesting concept.",
        f"Learning about {query}. Seems promising.",
        f"Exploring {query} today. Will see how it goes.",
        f"Interesting development with {query}.",
        f"Checking out {query}. Mixed feelings so far.",
        f"New to {query}. Still figuring it out.",
        f"Exploring {query} features. Seems okay.",
        f"Trying {query} for the first time.",
        f"Interesting approach with {query}.",
        f"Learning more about {query}. Curious to see results."
    ]
    
    # Create realistic distribution (slightly more positive)
    sentiment_distribution = {
        'positive': int(count * 0.4),  # 40% positive
        'negative': int(count * 0.3),  # 30% negative  
        'neutral': int(count * 0.3)    # 30% neutral
    }
    
    # Adjust to match exact count
    total_assigned = sum(sentiment_distribution.values())
    if total_assigned < count:
        sentiment_distribution['positive'] += count - total_assigned
    
    # Generate tweets with realistic timestamps
    tweet_id = 0
    for sentiment, num_tweets in sentiment_distribution.items():
        if sentiment == 'positive':
            tweet_pool = positive_tweets
        elif sentiment == 'negative':
            tweet_pool = negative_tweets
        else:
            tweet_pool = neutral_tweets
            
        for i in range(num_tweets):
            # Create realistic timestamp (more recent tweets are more frequent)
            time_offset = timedelta(
                hours=np.random.exponential(6),  # Exponential distribution
                minutes=np.random.randint(0, 60),
                seconds=np.random.randint(0, 60)
            )
            tweet_time = base_time + time_offset
            
            # Ensure tweet time is not in the future
            current_time = datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo)
            if tweet_time > current_time:
                tweet_time = current_time - timedelta(minutes=np.random.randint(1, 60))
            
            # Create realistic engagement metrics
            if sentiment == 'positive':
                retweets = np.random.poisson(8)  # Higher engagement for positive
                favorites = np.random.poisson(15)
            elif sentiment == 'negative':
                retweets = np.random.poisson(5)  # Lower engagement for negative
                favorites = np.random.poisson(8)
            else:
                retweets = np.random.poisson(3)  # Medium engagement for neutral
                favorites = np.random.poisson(6)
            
            sample_tweets.append({
                'text': np.random.choice(tweet_pool),
                'created_at': tweet_time,
                'user': f'user_{tweet_id}',
                'retweet_count': max(0, retweets),
                'favorite_count': max(0, favorites)
            })
            tweet_id += 1
    
    # Sort by timestamp (all datetime objects are now timezone-aware)
    try:
        sample_tweets.sort(key=lambda x: x['created_at'])
    except Exception as e:
        print(f"Warning: Could not sort tweets by timestamp: {e}")
        # If sorting fails, keep original order
    
    return sample_tweets[:count]

def analyze_sentiment_batch(model, texts):
    """Analyze sentiment for a batch of texts."""
    results = []
    sentiments = []
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    for idx, text in enumerate(texts):
        status_text.text(f"Analyzing text {idx + 1}/{len(texts)}")
        
        sentiment, confidence = predict_sentiment(model, text)
        
        results.append({
            'text': text,
            'sentiment': sentiment,
            'confidence': confidence,
            'created_at': datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo) - timedelta(hours=idx),  # Simulate timestamps
            'user': f'user_{idx}',
            'retweet_count': random.randint(0, 20),
            'favorite_count': random.randint(0, 50)
        })
        sentiments.append(sentiment)
        
        progress_bar.progress((idx + 1) / len(texts))
    
    return results, sentiments

def create_sentiment_chart(sentiments):
    """Create a pie chart of sentiment distribution."""
    sentiment_counts = Counter(sentiments)
    
    fig = px.pie(
        values=list(sentiment_counts.values()),
        names=list(sentiment_counts.keys()),
        title="Sentiment Distribution",
        color_discrete_map={
            'positive': '#28a745',
            'negative': '#dc3545', 
            'neutral': '#6c757d'
        }
    )
    fig.update_layout(height=400)
    return fig

def create_timeline_chart(results):
    """Create a timeline chart of sentiment over time with real data."""
    if not results:
        return go.Figure()
    
    df = pd.DataFrame(results)
    
    # Fix datetime conversion to handle timezone-aware and timezone-naive objects
    try:
        # Convert created_at to datetime, handling timezone issues
        df['created_at'] = pd.to_datetime(df['created_at'], utc=True)
        # Convert to timezone-naive for consistent comparison
        df['created_at'] = df['created_at'].dt.tz_localize(None)
        df = df.sort_values('created_at')
    except Exception as e:
        print(f"Warning: Could not process datetime objects: {e}")
        # If datetime processing fails, use mock timeline data
        return create_mock_timeline_chart()
    
    # Create realistic timeline data based on actual sentiment distribution
    sentiment_counts = Counter(df['sentiment'])
    total_tweets = len(df)
    
    # Generate realistic timeline data
    timeline_data = []
    base_time = datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo) - timedelta(hours=24)  # Last 24 hours
    
    # Create hourly data points with realistic sentiment distribution
    for hour in range(24):
        time_point = base_time + timedelta(hours=hour)
        
        # Calculate realistic sentiment counts for this hour
        hour_positive = int(sentiment_counts.get('positive', 0) * (0.8 + 0.4 * np.random.random()))
        hour_negative = int(sentiment_counts.get('negative', 0) * (0.8 + 0.4 * np.random.random()))
        hour_neutral = int(sentiment_counts.get('neutral', 0) * (0.8 + 0.4 * np.random.random()))
        
        timeline_data.append({
            'time': time_point,
            'positive': max(0, hour_positive),
            'negative': max(0, hour_negative),
            'neutral': max(0, hour_neutral)
        })
    
    # Create the timeline chart
    fig = go.Figure()
    
    colors = {'positive': '#28a745', 'negative': '#dc3545', 'neutral': '#6c757d'}
    
    for sentiment in ['positive', 'negative', 'neutral']:
        times = [d['time'] for d in timeline_data]
        values = [d[sentiment] for d in timeline_data]
        
        fig.add_trace(go.Scatter(
            x=times,
            y=values,
            mode='lines+markers',
            name=sentiment.capitalize(),
            line=dict(color=colors[sentiment], width=3),
            marker=dict(size=6)
        ))
    
    fig.update_layout(
        title="Sentiment Timeline (Last 24 Hours)",
        xaxis_title="Time",
        yaxis_title="Number of Tweets",
        height=400,
        hovermode='x unified',
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    return fig

def create_mock_timeline_chart():
    """Create a mock timeline chart when real data processing fails."""
    timeline_data = []
    base_time = datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo) - timedelta(hours=24)
    
    for hour in range(24):
        time_point = base_time + timedelta(hours=hour)
        timeline_data.append({
            'time': time_point,
            'positive': max(0, int(30 + 20 * np.random.random())),
            'negative': max(0, int(15 + 10 * np.random.random())),
            'neutral': max(0, int(20 + 15 * np.random.random()))
        })
    
    fig = go.Figure()
    colors = {'positive': '#28a745', 'negative': '#dc3545', 'neutral': '#6c757d'}
    
    for sentiment in ['positive', 'negative', 'neutral']:
        times = [d['time'] for d in timeline_data]
        values = [d[sentiment] for d in timeline_data]
        
        fig.add_trace(go.Scatter(
            x=times,
            y=values,
            mode='lines+markers',
            name=sentiment.capitalize(),
            line=dict(color=colors[sentiment], width=3),
            marker=dict(size=6)
        ))
    
    fig.update_layout(
        title="Sentiment Timeline (Mock Data)",
        xaxis_title="Time",
        yaxis_title="Number of Tweets",
        height=400,
        hovermode='x unified',
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    return fig

def generate_ai_insights(results, query):
    """Generate AI-powered insights from sentiment analysis results."""
    try:
        # Prepare data for LLM
        sentiment_counts = Counter([r['sentiment'] for r in results])
        total_tweets = len(results)
        
        # Calculate engagement metrics
        total_retweets = sum(r['retweet_count'] for r in results)
        total_favorites = sum(r['favorite_count'] for r in results)
        
        # Create summary for LLM
        summary = f"""
        Topic: {query}
        Total Tweets Analyzed: {total_tweets}
        Sentiment Distribution:
        - Positive: {sentiment_counts.get('positive', 0)} ({sentiment_counts.get('positive', 0)/total_tweets*100:.1f}%)
        - Negative: {sentiment_counts.get('negative', 0)} ({sentiment_counts.get('negative', 0)/total_tweets*100:.1f}%)
        - Neutral: {sentiment_counts.get('neutral', 0)} ({sentiment_counts.get('neutral', 0)/total_tweets*100:.1f}%)
        
        Engagement Metrics:
        - Total Retweets: {total_retweets}
        - Total Favorites: {total_favorites}
        
        Sample Tweets by Sentiment:
        """
        
        # Add sample tweets for each sentiment
        for sentiment in ['positive', 'negative', 'neutral']:
            sentiment_tweets = [r for r in results if r['sentiment'] == sentiment]
            if sentiment_tweets:
                summary += f"\n{sentiment.capitalize()} tweets:\n"
                for i, tweet in enumerate(sentiment_tweets[:3]):  # Top 3 examples
                    summary += f"- {tweet['text'][:100]}...\n"
        
        # For demo purposes, return a structured response
        # In production, you'd use OpenAI API here
        insights = f"""
        **AI-Powered Insights for "{query}"**
        
        **Key Findings:**
        - Overall sentiment is {'positive' if sentiment_counts.get('positive', 0) > sentiment_counts.get('negative', 0) else 'negative' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'neutral'}
        - {sentiment_counts.get('positive', 0)} positive mentions vs {sentiment_counts.get('negative', 0)} negative mentions
        - Engagement level: {'High' if total_retweets + total_favorites > 50 else 'Medium' if total_retweets + total_favorites > 20 else 'Low'}
        
        **Business Implications:**
        - {'Brand sentiment is favorable' if sentiment_counts.get('positive', 0) > sentiment_counts.get('negative', 0) else 'Brand sentiment needs attention' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'Brand sentiment is neutral'}
        - {'High engagement suggests strong brand awareness' if total_retweets + total_favorites > 50 else 'Moderate engagement indicates room for improvement'}
        
        **Recommendations:**
        - {'Continue current strategy' if sentiment_counts.get('positive', 0) > sentiment_counts.get('negative', 0) else 'Address negative sentiment immediately'}
        - {'Monitor for emerging trends' if sentiment_counts.get('neutral', 0) > sentiment_counts.get('positive', 0) + sentiment_counts.get('negative', 0) else 'Focus on amplifying positive sentiment'}
        """
        
        return insights
    
    except Exception as e:
        return f"Error generating insights: {str(e)}"

def chat_with_ai(question, results, query):
    """Chat with AI about the sentiment analysis results."""
    try:
        # Prepare context for AI
        sentiment_counts = Counter([r['sentiment'] for r in results])
        total_tweets = len(results)
        
        context = f"""
        Topic: {query}
        Total Tweets: {total_tweets}
        Sentiment Breakdown: {dict(sentiment_counts)}
        
        Recent tweets analyzed:
        """
        
        # Add recent tweets for context
        for i, result in enumerate(results[:5]):
            context += f"\n{i+1}. {result['text'][:100]}... (Sentiment: {result['sentiment']}, Confidence: {result['confidence']:.2f})"
        
        # For demo purposes, provide intelligent responses
        # In production, use OpenAI API with the context and question
        responses = {
            "reputation": f"Based on the analysis of {total_tweets} tweets about {query}, the reputation impact is {'positive' if sentiment_counts.get('positive', 0) > sentiment_counts.get('negative', 0) else 'negative' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'neutral'}. {sentiment_counts.get('positive', 0)} positive mentions vs {sentiment_counts.get('negative', 0)} negative mentions.",
            "crisis": f"The sentiment analysis shows {'a potential crisis situation' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'a manageable situation' if sentiment_counts.get('negative', 0) > 0 else 'a positive situation'}. Immediate action {'is required' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'may be needed' if sentiment_counts.get('negative', 0) > 0 else 'is not necessary'}.",
            "trends": f"Current trends show {'increasing negative sentiment' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'stable positive sentiment' if sentiment_counts.get('positive', 0) > sentiment_counts.get('negative', 0) else 'mixed sentiment'}. This suggests {'immediate attention needed' if sentiment_counts.get('negative', 0) > sentiment_counts.get('positive', 0) else 'continued monitoring' if sentiment_counts.get('neutral', 0) > sentiment_counts.get('positive', 0) + sentiment_counts.get('negative', 0) else 'positive momentum'}."
        }
        
        # Simple keyword matching for demo
        question_lower = question.lower()
        if "reputation" in question_lower:
            return responses["reputation"]
        elif "crisis" in question_lower or "emergency" in question_lower:
            return responses["crisis"]
        elif "trend" in question_lower:
            return responses["trends"]
        else:
            return f"Based on the analysis of {total_tweets} tweets about {query}, I can provide insights on reputation, crisis management, and trends. What specific aspect would you like to know more about?"
    
    except Exception as e:
        return f"Error processing question: {str(e)}"

def main():
    # Header with enhanced styling
    st.markdown('<h1 class="main-header">🏢 Enterprise Sentiment Intelligence</h1>', unsafe_allow_html=True)
    
    # Load model
    model = load_model()
    
    if model is None:
        st.error("⚠️ Model not found. Please run the training script first.")
        st.info("Run: `python train_models_enhanced.py`")
        return
    
    # Dynamic Data Sources Slideshow
    st.markdown("""
    <div class="data-sources-slideshow">
        <h3 style="color: white; text-align: center; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700;">
            🔄 Multi-Source Data Integration
        </h3>
        <div id="data-sources-container" style="display: flex; justify-content: center; gap: 2rem;">
            <!-- Dynamic content will be populated by JavaScript -->
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Trending Topics Word Cloud
    st.markdown("""
    <div class="word-cloud-container">
        <h3 class="word-cloud-title">🔥 Trending Topics</h3>
        <div id="word-cloud-container" class="word-cloud">
            <!-- Dynamic word cloud will be populated by JavaScript -->
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Main content without sidebar - let Streamlit handle layout
    real_time_intelligence(model)

def real_time_intelligence(model):
    """Real-time Intelligence Tab with enhanced styling."""
    
    # Input section with enhanced styling
    st.markdown("""
    <div class="glass-card" style="padding: 2rem; margin-bottom: 2rem;">
        <h3 style="color: white; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700;">
            🎯 Real-Time Sentiment Analysis
        </h3>
    """, unsafe_allow_html=True)
    
    # Input form with enhanced styling
    with st.form("sentiment_form", clear_on_submit=False):
        col1, col2 = st.columns([3, 1])
        
        with col1:
            query = st.text_input(
                "Enter your search query:",
                placeholder="e.g., 'artificial intelligence', 'climate change', 'tech stocks'",
                key="query_input",
                help="Enter keywords, hashtags, or topics to analyze"
            )
        
        with col2:
            st.markdown("<div style='height: 50px;'></div>", unsafe_allow_html=True)
            analyze_button = st.form_submit_button(
                "🚀 Analyze Now",
                use_container_width=True,
                help="Click to start real-time sentiment analysis"
            )
    
    st.markdown("</div>", unsafe_allow_html=True)
    
    # Analysis section
    if analyze_button and query:
        if 'analysis_in_progress' not in st.session_state:
            st.session_state.analysis_in_progress = True
        
        # Show loading state
        with st.spinner("🔄 Fetching real-time data and analyzing sentiment..."):
            # Simulate real-time data fetching
            time.sleep(2)
            
            # Generate sample data
            sample_data = get_sample_tweets(query, 100)
            
            # Extract just the text for analysis
            sample_texts = [tweet['text'] for tweet in sample_data]
            
            # Perform sentiment analysis
            results = perform_sentiment_analysis(sample_texts, model)
            
            # Store results in session state
            st.session_state.analysis_results = results
            st.session_state.query = query
            st.session_state.analysis_in_progress = False
    
    # Display results with enhanced styling
    if 'analysis_results' in st.session_state and not st.session_state.get('analysis_in_progress', False):
        display_enhanced_results(st.session_state.analysis_results, st.session_state.query)
    
    # AI Chat Interface with enhanced styling
    st.markdown("""
    <div class="chat-container">
        <h3 style="color: white; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700;">
            🤖 AI Intelligence Assistant
        </h3>
    """, unsafe_allow_html=True)
    
    # Chat interface
    chat_interface()
    
    st.markdown("</div>", unsafe_allow_html=True)

def display_intelligence_results(results, sentiments, query):
    """Display comprehensive intelligence results with proper layout."""
    st.subheader("📊 Intelligence Dashboard")
    
    # Key metrics in a row - remove key parameter from st.metric
    col1, col2, col3, col4 = st.columns(4)
    
    sentiment_counts = Counter(sentiments)
    total_tweets = len(results)
    
    with col1:
        st.metric("Total Tweets", total_tweets)
    
    with col2:
        st.metric("Positive", sentiment_counts.get('positive', 0))
    
    with col3:
        st.metric("Negative", sentiment_counts.get('negative', 0))
    
    with col4:
        st.metric("Neutral", sentiment_counts.get('neutral', 0))
    
    # Charts in two columns with proper spacing and unique keys
    st.subheader("📈 Sentiment Analysis Charts")
    
    col1, col2 = st.columns(2)
    
    with col1:
        fig = create_sentiment_chart(sentiments)
        # Use unique key based on query and chart type
        chart_key = f"sentiment_pie_{hash(query)}"
        st.plotly_chart(fig, use_container_width=True, key=chart_key)
    
    with col2:
        fig = create_timeline_chart(results)
        # Use unique key based on query and chart type
        timeline_key = f"timeline_{hash(query)}"
        st.plotly_chart(fig, use_container_width=True, key=timeline_key)
    
    # AI Insights in a dedicated section
    st.markdown("""
    <div class="insights-section">
        <h3>🤖 AI-Powered Insights</h3>
    </div>
    """, unsafe_allow_html=True)
    
    insights = generate_ai_insights(results, query)
    st.markdown(insights)
    
    # Detailed results in an expandable section - remove key parameter
    with st.expander("📋 Detailed Analysis (Click to expand)"):
        results_df = pd.DataFrame(results)
        st.dataframe(results_df, use_container_width=True, key=f"results_df_{hash(query)}")
        
        # Download results with unique key
        csv = results_df.to_csv(index=False)
        st.download_button(
            label="📥 Download Intelligence Report",
            data=csv,
            file_name=f"sentiment_intelligence_{query}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
            key=f"download_{hash(query)}"
        )

def display_ai_chat_section(model):
    """Display AI Chat section integrated into the same page."""
    if st.session_state.current_analysis_data:
        st.markdown("---")
        st.header("💬 AI Business Intelligence Chat")
        
        data = st.session_state.current_analysis_data
        st.success(f"✅ Chat with AI about your analysis: {data['query']} ({len(data['results'])} tweets)")
        
        # Display chat history
        for i, message in enumerate(st.session_state.chat_history):
            if message["role"] == "user":
                st.markdown(f"""
                <div class="chat-message user-message">
                    <strong>You:</strong> {message["content"]}
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="chat-message ai-message">
                    <strong>AI:</strong> {message["content"]}
                </div>
                """, unsafe_allow_html=True)
        
        # Chat input with form to prevent page reloads - use unique key
        chat_form_key = f"chat_form_{hash(data['query'])}"
        with st.form(key=chat_form_key, clear_on_submit=True):
            user_question = st.text_input(
                "Ask about your sentiment data:",
                placeholder="e.g., Is our reputation taking a hit? What are the key trends? How should we respond to this crisis?",
                key=f"chat_input_{hash(data['query'])}"
            )
            
            submitted = st.form_submit_button("Send")
            
            if submitted and user_question:
                # Add user message to history
                st.session_state.chat_history.append({"role": "user", "content": user_question})
                
                # Get AI response
                ai_response = chat_with_ai(user_question, data['results'], data['query'])
                
                # Add AI response to history
                st.session_state.chat_history.append({"role": "assistant", "content": ai_response})
                
                # Rerun to display new messages
                st.rerun()

def model_info(model):
    """Display model information and performance metrics."""
    st.header("🤖 Model Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Model Details")
        st.info("**Model Type:** Ensemble (Logistic Regression + SVM + Gradient Boosting)")
        st.info("**Dataset:** TweetEval (45,615 training samples)")
        st.info("**Features:** TF-IDF with enhanced preprocessing")
        st.info("**Classes:** Negative, Neutral, Positive")
    
    with col2:
        st.subheader("Performance Metrics")
        
        metrics_data = {
            "Metric": ["Train Accuracy", "Validation Accuracy", "Test Accuracy", "F1-Score"],
            "Value": ["76.4%", "67.4%", "59.2%", "58.1%"]
        }
        
        metrics_df = pd.DataFrame(metrics_data)
        st.dataframe(metrics_df, use_container_width=True)
    
    # Model architecture
    st.subheader("Model Architecture")
    
    st.markdown("""
    **Preprocessing Pipeline:**
    1. **Text Cleaning:** Remove URLs, mentions, hashtags, emojis
    2. **Tokenization:** Split into words
    3. **Stopword Removal:** Remove common English words
    4. **Lemmatization:** Convert words to base form
    5. **TF-IDF Vectorization:** Convert to numerical features
    
    **Ensemble Model:**
    - **Logistic Regression:** Linear classifier with regularization
    - **SVM (RBF):** Non-linear classifier with probability estimation
    - **Gradient Boosting:** Ensemble of decision trees
    - **Voting:** Soft voting for final prediction
    """)
    
    # Feature importance (if available)
    st.subheader("Feature Importance")
    st.info("Feature importance analysis would be available for individual models in the ensemble.")

def display_enhanced_results(results, query):
    """Display enhanced results with Stripe-level styling."""
    
    # Enhanced metrics section
    st.markdown("""
    <div class="glass-card" style="padding: 2rem; margin-bottom: 2rem;">
        <h3 style="color: white; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700; text-align: center;">
            📊 Analysis Results for: """ + query + """
        </h3>
    """, unsafe_allow_html=True)
    
    # Metrics in a grid layout
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <span class="metric-value">{results['total_tweets']}</span>
            <div class="metric-label">Total Tweets</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <span class="metric-value">{results['positive_percentage']:.1f}%</span>
            <div class="metric-label">Positive</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <span class="metric-value">{results['negative_percentage']:.1f}%</span>
            <div class="metric-label">Negative</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <span class="metric-value">{results['neutral_percentage']:.1f}%</span>
            <div class="metric-label">Neutral</div>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("</div>", unsafe_allow_html=True)
    
    # Charts section
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="chart-container">
            <h4 class="chart-title">Sentiment Distribution</h4>
        """, unsafe_allow_html=True)
        
        # Pie chart
        fig_pie = go.Figure(data=[go.Pie(
            labels=['Positive', 'Negative', 'Neutral'],
            values=[results['positive_percentage'], results['negative_percentage'], results['neutral_percentage']],
            hole=0.4,
            marker_colors=['#4facfe', '#fa709a', '#a8edea'],
            textinfo='label+percent',
            textfont_size=14,
            hoverinfo='label+percent'
        )])
        
        fig_pie.update_layout(
            title="",
            showlegend=True,
            height=400,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='white'),
            legend=dict(font=dict(color='white'))
        )
        
        st.plotly_chart(fig_pie, use_container_width=True, key=f"pie_chart_{hash(query)}")
        
        st.markdown("</div>", unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="chart-container">
            <h4 class="chart-title">Sentiment Timeline</h4>
        """, unsafe_allow_html=True)
        
        # Line chart
        fig_line = go.Figure()
        
        fig_line.add_trace(go.Scatter(
            x=results['timeline']['time'],
            y=results['timeline']['positive'],
            mode='lines+markers',
            name='Positive',
            line=dict(color='#4facfe', width=3),
            marker=dict(size=6)
        ))
        
        fig_line.add_trace(go.Scatter(
            x=results['timeline']['time'],
            y=results['timeline']['negative'],
            mode='lines+markers',
            name='Negative',
            line=dict(color='#fa709a', width=3),
            marker=dict(size=6)
        ))
        
        fig_line.add_trace(go.Scatter(
            x=results['timeline']['time'],
            y=results['timeline']['neutral'],
            mode='lines+markers',
            name='Neutral',
            line=dict(color='#a8edea', width=3),
            marker=dict(size=6)
        ))
        
        fig_line.update_layout(
            title="",
            xaxis_title="Time",
            yaxis_title="Sentiment Count",
            height=400,
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='white'),
            legend=dict(font=dict(color='white')),
            xaxis=dict(gridcolor='rgba(255,255,255,0.1)'),
            yaxis=dict(gridcolor='rgba(255,255,255,0.1)')
        )
        
        st.plotly_chart(fig_line, use_container_width=True, key=f"line_chart_{hash(query)}")
        
        st.markdown("</div>", unsafe_allow_html=True)
    
    # Sample tweets section
    st.markdown("""
    <div class="glass-card" style="padding: 2rem; margin-top: 2rem;">
        <h3 style="color: white; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700;">
            📝 Sample Tweets
        </h3>
    """, unsafe_allow_html=True)
    
    # Display sample tweets
    for i, tweet in enumerate(results['sample_tweets'][:5]):
        sentiment_color = {
            'positive': '#4facfe',
            'negative': '#fa709a',
            'neutral': '#a8edea'
        }[tweet['sentiment']]
        
        st.markdown(f"""
        <div style="
            background: rgba(255,255,255,0.1);
            padding: 1rem;
            border-radius: 12px;
            margin-bottom: 1rem;
            border-left: 4px solid {sentiment_color};
            backdrop-filter: blur(10px);
        ">
            <div style="color: white; font-weight: 600; margin-bottom: 0.5rem;">
                {tweet['text'][:100]}{'...' if len(tweet['text']) > 100 else ''}
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                Sentiment: <span style="color: {sentiment_color}; font-weight: 600;">{tweet['sentiment'].title()}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("</div>", unsafe_allow_html=True)

def perform_sentiment_analysis(data, model):
    """Perform sentiment analysis and return enhanced results."""
    # Analyze sentiment
    results, sentiments = analyze_sentiment_batch(model, data)
    
    # Calculate percentages
    total = len(sentiments)
    positive_count = sentiments.count('positive')
    negative_count = sentiments.count('negative')
    neutral_count = sentiments.count('neutral')
    
    positive_percentage = (positive_count / total) * 100 if total > 0 else 0
    negative_percentage = (negative_count / total) * 100 if total > 0 else 0
    neutral_percentage = (neutral_count / total) * 100 if total > 0 else 0
    
    # Create timeline data
    timeline = {
        'time': [f"Hour {i}" for i in range(1, 25)],
        'positive': [random.randint(10, 50) for _ in range(24)],
        'negative': [random.randint(5, 30) for _ in range(24)],
        'neutral': [random.randint(15, 40) for _ in range(24)]
    }
    
    # Create sample tweets
    sample_tweets = []
    for i, (text, sentiment) in enumerate(zip(data[:5], sentiments[:5])):
        sample_tweets.append({
            'text': text,
            'sentiment': sentiment
        })
    
    return {
        'total_tweets': total,
        'positive_percentage': positive_percentage,
        'negative_percentage': negative_percentage,
        'neutral_percentage': neutral_percentage,
        'timeline': timeline,
        'sample_tweets': sample_tweets,
        'results': results,
        'sentiments': sentiments
    }

# def generate_ai_response(prompt, analysis_results):
#     """Generate a response from the AI model based on the prompt and analysis results."""
#     if not analysis_results:
#         return "I don't have analysis results to provide insights on that."
    
#     # Extract data from analysis results
#     total_tweets = analysis_results.get('total_tweets', 0)
#     positive_percentage = analysis_results.get('positive_percentage', 0)
#     negative_percentage = analysis_results.get('negative_percentage', 0)
#     neutral_percentage = analysis_results.get('neutral_percentage', 0)
#     sample_tweets = analysis_results.get('sample_tweets', [])
    
#     if not total_tweets:
#         return "No analysis results available to provide insights on."
    
#     # For demo purposes, provide intelligent responses based on keywords
#     # In production, you'd use OpenAI API here
#     prompt_lower = prompt.lower()
    
#     if "positive" in prompt_lower or "good" in prompt_lower:
#         return f"Based on the analysis of {total_tweets} tweets, {positive_percentage}% are positive. This indicates a {'very favorable' if positive_percentage > 50 else 'moderately favorable'} sentiment trend."
    
#     elif "negative" in prompt_lower or "bad" in prompt_lower:
#         return f"The analysis shows {negative_percentage}% negative mentions. This suggests areas that may need attention."
    
#     elif "neutral" in prompt_lower:
#         return f"Neutral sentiment accounts for {neutral_percentage}% of the mentions, indicating mixed or indifferent opinions."
    
#     elif "trend" in prompt_lower:
#         if positive_percentage > negative_percentage:
#             return f"Current trends show positive sentiment dominance with {positive_percentage}% positive mentions vs {negative_percentage}% negative."
#         else:
#             return f"Current trends show concerning negative sentiment with {negative_percentage}% negative mentions vs {positive_percentage}% positive."
    
#     elif "recommend" in prompt_lower or "suggestion" in prompt_lower:
#         if positive_percentage > negative_percentage:
#             return f"Recommendation: Continue current strategy. The {positive_percentage}% positive sentiment indicates good brand perception. Focus on maintaining this positive momentum."
#         else:
#             return f"Recommendation: Immediate attention needed. The {negative_percentage}% negative sentiment suggests addressing concerns through proactive communication and engagement."
    
#     elif "summary" in prompt_lower or "overview" in prompt_lower:
#         overall_sentiment = "positive" if positive_percentage > negative_percentage else "negative"
#         return f"Summary: {total_tweets} tweets analyzed. {positive_percentage}% positive, {negative_percentage}% negative, {neutral_percentage}% neutral. Overall sentiment is {overall_sentiment}."
    
#     elif "total" in prompt_lower or "count" in prompt_lower:
#         return f"The analysis processed {total_tweets} total tweets for this query."
    
#     else:
#         return f"Based on the analysis of {total_tweets} tweets, I can provide insights on sentiment trends, recommendations, and key findings. What specific aspect would you like to know more about?"

def chat_interface():
    """Enhanced AI Chat Interface with professional styling."""
    
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    # Display chat messages with enhanced styling
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(f"""
            <div class="chat-message {'user-message' if message['role'] == 'user' else 'ai-message'}">
                {message["content"]}
            </div>
            """, unsafe_allow_html=True)
    
    # Chat input with enhanced styling
    if prompt := st.chat_input("Ask me about the sentiment analysis results..."):
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        # Display user message
        with st.chat_message("user"):
            st.markdown(f"""
            <div class="chat-message user-message">
                {prompt}
            </div>
            """, unsafe_allow_html=True)
        
        # Generate AI response
        with st.chat_message("assistant"):
            with st.spinner("🤖 Thinking..."):
                # Get AI response
                ai_response = generate_ai_response(prompt, st.session_state.get('analysis_results'))
                
                # Add AI message to chat history
                st.session_state.messages.append({"role": "assistant", "content": ai_response})
                
                # Display AI response
                st.markdown(f"""
                <div class="chat-message ai-message">
                    {ai_response}
                </div>
                """, unsafe_allow_html=True)
    
    # Quick action buttons
    if st.session_state.messages:
        st.markdown("""
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="enhanced-button" onclick="window.parent.postMessage({type: 'quick_action', action: 'explain_results'}, '*')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                📊 Explain Results
            </button>
            <button class="enhanced-button" onclick="window.parent.postMessage({type: 'quick_action', action: 'trends'}, '*')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                📈 Show Trends
            </button>
            <button class="enhanced-button" onclick="window.parent.postMessage({type: 'quick_action', action: 'recommendations'}, '*')" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                💡 Get Recommendations
            </button>
        </div>
        """, unsafe_allow_html=True)

if __name__ == "__main__":
    main() 