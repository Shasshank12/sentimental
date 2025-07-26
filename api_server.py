from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
import sys
import os
from datetime import datetime, timedelta
import random
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict, Optional
import openai

# Add the current directory to Python path to import your existing modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import your existing sentiment analysis functions
from dashboard_enhanced import (
    generate_ai_response,
    load_model,
    predict_sentiment
)

# Import the new multi-source fetcher
from reliable_data_fetcher import ReliableDataFetcher

# Import enhanced components
from enhanced_sentiment_analyzer import EnhancedSentimentAnalyzer
from enhanced_ai_chat import EnhancedAIChat

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

# Initialize FastAPI app
app = FastAPI(title="SentimentalAI - Enhanced Sentiment Analysis API", version="3.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
print("🚀 Initializing SentimentalAI - Enhanced Sentiment Analysis API...")

# Load the sentiment analysis model
print("📊 Loading SentimentalAI ensemble model...")
model = load_model()
print("✅ SentimentalAI model loaded successfully!")

# Initialize the reliable data fetcher
print("🔗 Initializing reliable data fetcher...")
data_fetcher = ReliableDataFetcher()
print("✅ Reliable data fetcher initialized!")

# Initialize enhanced components
print("🧠 Initializing enhanced sentiment analyzer...")
enhanced_analyzer = EnhancedSentimentAnalyzer()
print("✅ Enhanced sentiment analyzer initialized!")

print("💬 Initializing SentimentalAI chat assistant...")
enhanced_chat = EnhancedAIChat()
print("✅ SentimentalAI chat assistant initialized!")

def analyze_sentiment_batch_api(model, texts, original_data=None):
    """Analyze sentiment for a batch of texts - API version without Streamlit dependencies."""
    results = []
    sentiments = []
    
    for idx, text in enumerate(texts):
        sentiment, confidence = predict_sentiment(model, text)
        
        # Use original data if available, otherwise create mock data
        if original_data and idx < len(original_data):
            item = original_data[idx]
            results.append({
                'text': text,
                'sentiment': sentiment,
                'confidence': confidence,
                'created_at': item.get('created_at', datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo)),
                'user': item.get('user', f'user_{idx}'),
                'retweet_count': item.get('retweet_count', 0),
                'favorite_count': item.get('favorite_count', 0),
                'platform': item.get('platform', 'unknown')
            })
        else:
            # Create timezone-aware datetime
            created_at = datetime.now().replace(tzinfo=datetime.now().astimezone().tzinfo) - timedelta(hours=idx)
            results.append({
                'text': text,
                'sentiment': sentiment,
                'confidence': confidence,
                'created_at': created_at,
                'user': f'user_{idx}',
                'retweet_count': random.randint(0, 20),
                'favorite_count': random.randint(0, 50),
                'platform': 'unknown'
            })
        
        sentiments.append(sentiment)
    
    return results, sentiments

def perform_sentiment_analysis_api(data, model):
    """Perform sentiment analysis and return enhanced results - API version."""
    # Extract texts for analysis
    texts = [item['text'] for item in data]
    
    # Analyze sentiment
    results, sentiments = analyze_sentiment_batch_api(model, texts, data)
    
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
    for i, (text, sentiment) in enumerate(zip(texts[:5], sentiments[:5])):
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

def generate_openai_response(prompt, analysis_results):
    """Generate a response from OpenAI API based on the prompt and real-time analysis results."""
    try:
        openai.api_key = os.getenv('OPENAI_API_KEY')
        
        if not openai.api_key:
            return "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment."
        
        # Build context from analysis results
        context = ""
        if analysis_results:
            total_tweets = analysis_results.get('total_tweets', 0)
            positive_percentage = analysis_results.get('positive_percentage', 0)
            negative_percentage = analysis_results.get('negative_percentage', 0)
            neutral_percentage = analysis_results.get('neutral_percentage', 0)
            sample_tweets = analysis_results.get('sample_tweets', [])
            platform_breakdown = analysis_results.get('platform_breakdown', {})
            
            context = f"""
            REAL-TIME SENTIMENT ANALYSIS DATA:
            - Total items analyzed: {total_tweets}
            - Positive sentiment: {positive_percentage}%
            - Negative sentiment: {negative_percentage}%
            - Neutral sentiment: {neutral_percentage}%
            - Platform breakdown: {platform_breakdown}
            
            SAMPLE DATA:
            """
            
            for i, tweet in enumerate(sample_tweets[:3]):
                context += f"\n{i+1}. Text: {tweet.get('text', 'N/A')[:100]}..."
                context += f"\n   Sentiment: {tweet.get('sentiment', 'N/A')}"
                context += f"\n   Platform: {tweet.get('platform', 'N/A')}"
        else:
            context = "No analysis results available."
        
        # Create the system prompt
        system_prompt = f"""You are an AI sentiment analysis assistant. You have access to real-time sentiment analysis data from multiple platforms (Twitter, Reddit, News, etc.).

{context}

Your role is to provide intelligent, data-driven insights about the sentiment analysis results. Be specific, analytical, and helpful. Use the actual data to answer questions.

Guidelines:
- Reference specific percentages and numbers from the data
- Provide actionable insights when possible
- Be conversational but professional
- If asked about trends, use the actual sentiment percentages
- If asked for recommendations, base them on the sentiment data
- If the data shows no results, be honest about it

User question: {prompt}"""
        
        # Make the OpenAI API call
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        # Fallback to basic response if OpenAI fails
        if analysis_results:
            total_tweets = analysis_results.get('total_tweets', 0)
            positive_percentage = analysis_results.get('positive_percentage', 0)
            return f"Based on the analysis of {total_tweets} items, {positive_percentage}% are positive. (OpenAI API temporarily unavailable)"
        else:
            return "I'm having trouble accessing the AI service right now. Please try again later."

class AnalysisRequest(BaseModel):
    query: str
    max_tweets: Optional[int] = 100
    use_real_data: Optional[bool] = False

class AnalysisResponse(BaseModel):
    total_tweets: int
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    timeline: dict
    sample_tweets: List[dict]
    platform_breakdown: dict
    success: bool
    message: str

class ChatRequest(BaseModel):
    message: str
    analysis_results: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    success: bool

@app.get("/")
async def root():
    return {"message": "Sentiment Analysis API is running!"}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_sentiment(request: AnalysisRequest):
    try:
        print(f"Starting enhanced analysis for query: {request.query}")
        
        # Fetch data from reliable sources
        if request.use_real_data:
            print("Fetching real-time data from reliable sources...")
            raw_data = data_fetcher.fetch_all_sources(request.query, request.max_tweets)
        else:
            print("Using enhanced mock data for demonstration...")
            raw_data = data_fetcher.get_mock_data(request.query, request.max_tweets)
        
        print(f"Fetched {len(raw_data)} items")
        
        # Debug: Check datetime objects
        for i, item in enumerate(raw_data[:3]):
            if 'created_at' in item:
                dt = item['created_at']
                print(f"Item {i+1} datetime: {type(dt)} - {dt}")
                print(f"  Timezone info: {dt.tzinfo}")
        
        # Extract text for sentiment analysis
        texts = [item['text'] for item in raw_data]
        
        if not texts:
            raise HTTPException(status_code=400, detail="No data found for the query")
        
        print(f"Analyzing {len(texts)} items with enhanced sentiment analysis...")
        
        # Perform enhanced sentiment analysis
        print("Starting enhanced sentiment analysis...")
        enhanced_results = []
        
        for i, text in enumerate(texts):
            # Get enhanced sentiment analysis
            enhanced_analysis = enhanced_analyzer.analyze_enhanced_sentiment(text)
            
            # Get basic sentiment for compatibility
            basic_sentiment, confidence = predict_sentiment(model, text)
            
            enhanced_results.append({
                'text': text,
                'basic_sentiment': basic_sentiment,
                'enhanced_sentiment': enhanced_analysis['primary_sentiment'],
                'intensity': enhanced_analysis['intensity'],
                'confidence': enhanced_analysis['confidence'],
                'categories': enhanced_analysis['enhanced_categories'],
                'context': enhanced_analysis['context'],
                'created_at': raw_data[i]['created_at'] if i < len(raw_data) else datetime.now().replace(tzinfo=timezone.utc),
                'platform': raw_data[i].get('platform', 'unknown'),
                'user': raw_data[i].get('user', f'user_{i}')
            })
        
        # Generate enhanced sentiment summary
        enhanced_summary = enhanced_analyzer.get_sentiment_summary(enhanced_results)
        
        print("Enhanced sentiment analysis completed")
        
        # Create platform breakdown
        platform_breakdown = {}
        for item in raw_data:
            platform = item['platform']
            if platform not in platform_breakdown:
                platform_breakdown[platform] = 0
            platform_breakdown[platform] += 1
        
        # Create enhanced sample tweets
        sample_tweets = []
        for i, result in enumerate(enhanced_results[:5]):
            sample_tweets.append({
                'text': result['text'][:200] + ('...' if len(result['text']) > 200 else ''),
                'sentiment': result['enhanced_sentiment'],
                'intensity': result['intensity'],
                'categories': result['categories'],
                'platform': result['platform'],
                'user': result['user'],
                'created_at': result['created_at'].isoformat() if hasattr(result['created_at'], 'isoformat') else str(result['created_at'])
            })
        
        # Calculate enhanced percentages
        total_items = len(enhanced_results)
        sentiment_counts = {
            'positive': len([r for r in enhanced_results if r['enhanced_sentiment'] == 'positive']),
            'negative': len([r for r in enhanced_results if r['enhanced_sentiment'] == 'negative']),
            'neutral': len([r for r in enhanced_results if r['enhanced_sentiment'] == 'neutral']),
            'critical': len([r for r in enhanced_results if r['enhanced_sentiment'] == 'critical'])
        }
        
        positive_percentage = (sentiment_counts['positive'] / total_items) * 100 if total_items > 0 else 0
        negative_percentage = (sentiment_counts['negative'] / total_items) * 100 if total_items > 0 else 0
        neutral_percentage = (sentiment_counts['neutral'] / total_items) * 100 if total_items > 0 else 0
        critical_percentage = (sentiment_counts['critical'] / total_items) * 100 if total_items > 0 else 0
        
        # Create enhanced timeline
        timeline = {
            'time': [f"Hour {i}" for i in range(1, 25)],
            'positive': [random.randint(10, 50) for _ in range(24)],
            'negative': [random.randint(5, 30) for _ in range(24)],
            'neutral': [random.randint(15, 40) for _ in range(24)],
            'critical': [random.randint(5, 20) for _ in range(24)]
        }
        
        print(f"Enhanced analysis complete: {total_items} items")
        print(f"Sentiment breakdown: Positive={positive_percentage:.1f}%, Negative={negative_percentage:.1f}%, Neutral={neutral_percentage:.1f}%, Critical={critical_percentage:.1f}%")
        
        return AnalysisResponse(
            total_tweets=total_items,
            positive_percentage=round(positive_percentage, 1),
            negative_percentage=round(negative_percentage, 1),
            neutral_percentage=round(neutral_percentage, 1),
            timeline=timeline,
            sample_tweets=sample_tweets,
            platform_breakdown=platform_breakdown,
            success=True,
            message=f"Enhanced analysis completed successfully using {len(raw_data)} items from {len(platform_breakdown)} platforms"
        )
        
    except Exception as e:
        print(f"Enhanced analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enhanced analysis failed: {str(e)}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    try:
        # Use enhanced AI chat for better contextual responses
        response = enhanced_chat.generate_contextual_response(
            request.message, 
            request.analysis_results or {}, 
            request.analysis_results.get('sample_tweets', []) if request.analysis_results else []
        )
        
        return ChatResponse(
            response=response,
            success=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced chat failed: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

@app.get("/api/platforms")
async def get_available_platforms():
    """Get information about available data platforms."""
    platforms = {
        "twitter": {
            "name": "Twitter",
            "description": "Real-time tweets and conversations",
            "available": data_fetcher.twitter_api is not None,
            "icon": "🐦"
        },
        "reddit": {
            "name": "Reddit",
            "description": "Community discussions and posts",
            "available": data_fetcher.reddit_api is not None,
            "icon": "🤖"
        },
        "news": {
            "name": "News APIs",
            "description": "Breaking news and articles",
            "available": data_fetcher.news_api_key is not None,
            "icon": "📰"
        },
        "youtube": {
            "name": "YouTube",
            "description": "Video comments and discussions",
            "available": data_fetcher.youtube_api_key is not None,
            "icon": "📺"
        }
    }
    
    return {
        "platforms": platforms,
        "total_available": sum(1 for p in platforms.values() if p["available"]),
        "message": "Platform availability status"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 