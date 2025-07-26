from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn
import os
from reliable_data_fetcher import ReliableDataFetcher
from enhanced_ai_chat import EnhancedAIChat
import json
from datetime import datetime, timezone
from collections import defaultdict
import math

app = FastAPI(title="Sentimental AI API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
data_fetcher = ReliableDataFetcher()
ai_chat = EnhancedAIChat()

class AnalysisRequest(BaseModel):
    query: str
    max_tweets: int = 100
    use_real_data: bool = True

class ChatRequest(BaseModel):
    message: str
    analysis_results: Dict

@app.get("/")
async def root():
    return {"message": "Sentimental AI API is running!"}

@app.post("/api/analyze")
async def analyze_sentiment(request: AnalysisRequest):
    try:
        print(f"Starting analysis for query: {request.query}")
        
        if request.use_real_data:
            print("Fetching real-time data from reliable sources...")
            # Use the correct method and increase data collection
            data_items = data_fetcher.fetch_all_sources(request.query, max_per_source=50)
            
            # If we don't get enough real data, supplement with mock data
            if len(data_items) < request.max_tweets:
                print(f"Only got {len(data_items)} real items, supplementing with mock data...")
                mock_items = data_fetcher.get_mock_data(request.query, count=request.max_tweets - len(data_items))
                data_items.extend(mock_items)
        else:
            print("Using enhanced mock data for demonstration...")
            data_items = data_fetcher.get_mock_data(request.query, count=request.max_tweets)
        
        if not data_items:
            raise HTTPException(status_code=404, detail="No data found for the query")
        
        # Perform sentiment analysis and assign sentiment to each item
        print("Starting sentiment analysis...")
        analysis_results = data_fetcher.analyze_sentiment(data_items)
        print("Sentiment analysis completed")
        # Assign sentiment to each item (ensure each item has 'sentiment' key)
        if hasattr(data_fetcher, 'assign_sentiment_to_items'):
            data_fetcher.assign_sentiment_to_items(data_items)
        else:
            # Fallback: assign using the same logic as analyze_sentiment if available
            for item in data_items:
                item['sentiment'] = data_fetcher.simple_sentiment(item.get('text', '')) if hasattr(data_fetcher, 'simple_sentiment') else 'neutral'
        
        # Timeline: group by hour (UTC) for real time-based sentiment
        timeline_buckets = defaultdict(list)
        now = datetime.now(timezone.utc)
        for item in data_items:
            created_at = item.get('created_at')
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except Exception:
                    created_at = now
            elif not isinstance(created_at, datetime):
                created_at = now
            # Bucket by hour difference from now (0 = this hour, 1 = 1h ago, ...)
            hour_diff = int((now - created_at).total_seconds() // 3600)
            timeline_buckets[hour_diff].append(item)
        # Sort buckets by recency (0 = most recent)
        sorted_hours = sorted(timeline_buckets.keys())[:4]
        timeline = {"time": [], "positive": [], "negative": [], "neutral": []}
        for hour in sorted_hours:
            bucket = timeline_buckets[hour]
            if bucket:
                pos = sum(1 for x in bucket if x.get('sentiment') == 'positive') / len(bucket) * 100
                neg = sum(1 for x in bucket if x.get('sentiment') == 'negative') / len(bucket) * 100
                neu = sum(1 for x in bucket if x.get('sentiment') == 'neutral') / len(bucket) * 100
            else:
                pos = analysis_results.get("positive_percentage", 0)
                neg = analysis_results.get("negative_percentage", 0)
                neu = analysis_results.get("neutral_percentage", 0)
            label = f"{hour}h ago" if hour > 0 else "now"
            timeline["time"].append(label)
            timeline["positive"].append(round(pos, 1))
            timeline["negative"].append(round(neg, 1))
            timeline["neutral"].append(round(neu, 1))
        # If all data is from the same hour, show a single bucket
        if len(timeline["time"]) == 1:
            timeline["time"] = ["now"]
        # Calculate sentiment counts per source
        source_sentiment_counts = {}
        for item in data_items:
            source = (item.get('platform') or item.get('source') or 'unknown').lower()
            sentiment = item.get('sentiment', 'neutral')
            if source not in source_sentiment_counts:
                source_sentiment_counts[source] = {'positive': 0, 'negative': 0, 'neutral': 0}
            if sentiment in source_sentiment_counts[source]:
                source_sentiment_counts[source][sentiment] += 1
            else:
                source_sentiment_counts[source]['neutral'] += 1  # fallback
        # Prepare response with more sample items
        print("DEBUG TIMELINE:", json.dumps(timeline, indent=2, default=str))
        print("DEBUG SOURCE SENTIMENT COUNTS:", json.dumps(source_sentiment_counts, indent=2))
        
        # Fix: Convert source_sentiment_counts to platform_breakdown with total counts
        platform_breakdown_cleaned = {
            source: sum(counts.values())  # Only keep total number per source
            for source, counts in source_sentiment_counts.items()
        }

        response = {
            "total_tweets": len(data_items),
            "positive_percentage": analysis_results.get("positive_percentage", 0),
            "negative_percentage": analysis_results.get("negative_percentage", 0),
            "neutral_percentage": analysis_results.get("neutral_percentage", 0),
            "timeline": timeline,
            "sample_tweets": data_items,  # send all items for frontend diversity
            "platform_breakdown": platform_breakdown_cleaned,
            "source_sentiment_counts": source_sentiment_counts,
            "success": True,
            "message": "Analysis complete"
        }
        
        # Inject AI-generated contextual response
        ai_answer = ai_chat.generate_contextual_response(
            request.query,
            analysis_results,
            data_items
        )
        
        response["ai_answer"] = ai_answer

        print(f"Analysis complete: {len(data_items)} items, {analysis_results.get('positive_percentage', 0)}% positive")
        return response
        
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        # Extract sample data from analysis results
        sample_data = request.analysis_results.get("sample_tweets", [])
        
        # Generate AI response
        response = ai_chat.generate_contextual_response(
            request.message,
            request.analysis_results,
            sample_data
        )
        
        return {"response": response}
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 