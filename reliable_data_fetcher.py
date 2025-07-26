#!/usr/bin/env python3
"""
Reliable Data Fetcher - Uses RSS feeds, public APIs, and web scraping
Free, reliable, and no API limits!
"""

import requests
import feedparser
from datetime import datetime, timezone
import time
import random
from bs4 import BeautifulSoup
import json
from typing import List, Dict, Optional

class ReliableDataFetcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # Enhanced RSS Feed URLs
        self.rss_feeds = {
            'cnn': 'https://rss.cnn.com/rss/edition.rss',
            'bbc': 'http://feeds.bbci.co.uk/news/rss.xml',
            'reuters': 'https://feeds.reuters.com/reuters/topNews',
            'techcrunch': 'https://techcrunch.com/feed/',
            'wired': 'https://www.wired.com/feed/rss',
            'ars': 'https://feeds.arstechnica.com/arstechnica/index',
            'business_insider': 'https://www.businessinsider.com/rss',
            'bloomberg': 'https://feeds.bloomberg.com/markets/news.rss',
            'npr': 'https://feeds.npr.org/1001/rss.xml',
            'nytimes': 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
            'guardian': 'https://feeds.theguardian.com/theguardian/technology/rss',
            'verge': 'https://www.theverge.com/rss/index.xml',
            'engadget': 'https://www.engadget.com/rss.xml',
            'mashable': 'https://feeds.mashable.com/mashable'
        }
        
        # Public API endpoints
        self.public_apis = {
            'hackernews': 'https://hacker-news.firebaseio.com/v0',
            'reddit_search': 'https://www.reddit.com/search.json'
        }

    def fetch_rss_news(self, query: str, max_items: int = 50) -> List[Dict]:
        """Fetch news from multiple RSS feeds"""
        print(f"📰 Fetching RSS news for: {query}")
        
        all_articles = []
        query_lower = query.lower()
        
        for source_name, feed_url in self.rss_feeds.items():
            try:
                print(f"  Fetching from {source_name}...")
                feed = feedparser.parse(feed_url)
                if hasattr(feed, 'status') and feed.status != 200:
                    print(f"    RSS {source_name} status: {feed.status}")
                if hasattr(feed, 'bozo') and feed.bozo:
                    print(f"    RSS {source_name} bozo error: {feed.bozo_exception}")
                
                for entry in feed.entries[:30]:  # Increased from 20 to 30
                    # Check if query appears in title or summary
                    title = entry.get('title', '').lower()
                    summary = entry.get('summary', '').lower()
                    
                    if query_lower in title or query_lower in summary:
                        # Clean the text
                        text = entry.get('title', '') + " " + entry.get('summary', '')
                        text = self._clean_text(text)
                        
                        if len(text) > 20:  # Only add if meaningful
                            all_articles.append({
                                'text': text,
                                'platform': 'news',
                                'source': source_name,
                                'user': f"{source_name}_user",
                                'created_at': datetime.now().replace(tzinfo=timezone.utc),
                                'url': entry.get('link', ''),
                                'title': entry.get('title', '')
                            })
                
                print(f"    Found {len([a for a in all_articles if a['source'] == source_name])} relevant articles")
                
            except Exception as e:
                print(f"    Error fetching from {source_name}: {e}")
                continue
        
        # Limit total articles
        all_articles = all_articles[:max_items]
        print(f"✅ Total RSS articles found: {len(all_articles)}")
        return all_articles

    def fetch_hackernews_data(self, query: str, max_items: int = 30) -> List[Dict]:
        print(f"💻 Fetching HackerNews data for: {query}")
        try:
            url = f"https://hn.algolia.com/api/v1/search?query={query}&tags=story&hitsPerPage={max_items}"
            response = self.session.get(url)
            if response.status_code != 200:
                print(f"    HN Algolia status: {response.status_code}, text: {response.text[:200]}")
                return []
            data = response.json()
            stories = []
            for hit in data.get('hits', []):
                text = self._clean_text(hit.get('title', '') + ' ' + (hit.get('story_text', '') or ''))
                if len(text) > 20:
                    stories.append({
                        'text': text,
                        'platform': 'hackernews',
                        'source': 'hackernews',
                        'user': hit.get('author', 'anonymous'),
                        'created_at': datetime.fromtimestamp(hit.get('created_at_i', 0), tz=timezone.utc),
                        'score': hit.get('points', 0),
                        'url': hit.get('url', f"https://news.ycombinator.com/item?id={hit.get('objectID')}") ,
                        'title': hit.get('title', '')
                    })
            print(f"✅ HN Algolia stories found: {len(stories)}")
            return stories[:max_items]
        except Exception as e:
            print(f"❌ HN Algolia API error: {e}")
            return []

    def fetch_newsapi_news(self, query: str, max_items: int = 50) -> List[Dict]:
        print(f"📰 Fetching NewsAPI.org news for: {query}")
        api_key = "dca1726031ef41d5baaa890cb93e0757"
        url = f"https://newsapi.org/v2/everything?q={query}&language=en&pageSize={max_items}&apiKey={api_key}"
        try:
            response = self.session.get(url)
            if response.status_code != 200:
                print(f"    NewsAPI status: {response.status_code}, text: {response.text[:200]}")
                return []
            data = response.json()
            articles = []
            for article in data.get('articles', []):
                text = self._clean_text(article.get('title', '') + ' ' + (article.get('description', '') or ''))
                if len(text) > 20:
                    articles.append({
                        'text': text,
                        'platform': 'news',
                        'source': article.get('source', {}).get('name', 'newsapi'),
                        'user': article.get('author', 'newsapi'),
                        'created_at': datetime.strptime(article.get('publishedAt', ''), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) if article.get('publishedAt') else datetime.now().replace(tzinfo=timezone.utc),
                        'url': article.get('url', ''),
                        'title': article.get('title', '')
                    })
            print(f"✅ NewsAPI articles found: {len(articles)}")
            return articles[:max_items]
        except Exception as e:
            print(f"❌ NewsAPI error: {e}")
            return []

    def fetch_reddit_data(self, query: str, max_items: int = 50) -> List[Dict]:
        """Enhanced Reddit data fetching with multiple subreddits"""
        print(f"🤖 Fetching Reddit data for: {query}")
        
        # Popular subreddits to search
        subreddits = ['technology', 'programming', 'science', 'news', 'worldnews', 'politics', 'sports', 'entertainment']
        all_posts = []
        
        for subreddit in subreddits:
            try:
                # Search in specific subreddit
                url = f"https://www.reddit.com/r/{subreddit}/search.json?q={query}&sort=hot&t=day&limit=25"
                response = self.session.get(url)
                if response.status_code != 200:
                    print(f"    Reddit {subreddit} status: {response.status_code}, text: {response.text[:200]}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for post in data['data']['children']:
                        post_data = post['data']
                        
                        # Combine title and text
                        text = post_data['title']
                        if post_data.get('selftext'):
                            text += " " + post_data['selftext']
                        
                        text = self._clean_text(text)
                        
                        if len(text) > 20:
                            all_posts.append({
                                'text': text,
                                'platform': 'reddit',
                                'source': f'reddit_{subreddit}',
                                'user': post_data.get('author', 'anonymous'),
                                'created_at': datetime.fromtimestamp(post_data['created_utc'], tz=timezone.utc),
                                'score': post_data.get('score', 0),
                                'subreddit': subreddit,
                                'url': f"https://reddit.com{post_data.get('permalink', '')}"
                            })
                
                print(f"    Found {len([p for p in all_posts if p['source'] == f'reddit_{subreddit}'])} posts in r/{subreddit}")
                
            except Exception as e:
                print(f"    Error fetching from r/{subreddit}: {e}")
                continue
        
        # Also try general search
        try:
            url = f"https://www.reddit.com/search.json?q={query}&sort=hot&t=day&limit=50"
            response = self.session.get(url)
            if response.status_code != 200:
                print(f"    Reddit general search status: {response.status_code}, text: {response.text[:200]}")
            
            if response.status_code == 200:
                data = response.json()
                
                for post in data['data']['children']:
                    post_data = post['data']
                    
                    text = post_data['title']
                    if post_data.get('selftext'):
                        text += " " + post_data['selftext']
                    
                    text = self._clean_text(text)
                    
                    if len(text) > 20:
                        all_posts.append({
                            'text': text,
                            'platform': 'reddit',
                            'source': 'reddit_general',
                            'user': post_data.get('author', 'anonymous'),
                            'created_at': datetime.fromtimestamp(post_data['created_utc'], tz=timezone.utc),
                            'score': post_data.get('score', 0),
                            'subreddit': post_data.get('subreddit', ''),
                            'url': f"https://reddit.com{post_data.get('permalink', '')}"
                        })
                
                print(f"    Found {len([p for p in all_posts if p['source'] == 'reddit_general'])} posts in general search")
                
        except Exception as e:
            print(f"    Error in general Reddit search: {e}")
        
        # Remove duplicates and limit
        unique_posts = []
        seen_texts = set()
        
        for post in all_posts:
            if post['text'] not in seen_texts:
                unique_posts.append(post)
                seen_texts.add(post['text'])
        
        unique_posts = unique_posts[:max_items]
        print(f"✅ Total unique Reddit posts found: {len(unique_posts)}")
        return unique_posts

    def fetch_github_data(self, query: str, max_items: int = 30) -> List[Dict]:
        """Enhanced GitHub data fetching"""
        print(f"🐙 Fetching GitHub data for: {query}")
        
        try:
            # Search repositories
            url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=50"
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                repos = []
                
                for repo in data.get('items', [])[:max_items]:
                    text = f"{repo['name']}: {repo.get('description', '')}"
                    text = self._clean_text(text)
                    
                    if len(text) > 20:
                        repos.append({
                            'text': text,
                            'platform': 'github',
                            'source': 'github',
                            'user': repo['owner']['login'],
                            'created_at': datetime.now().replace(tzinfo=timezone.utc),
                            'stars': repo.get('stargazers_count', 0),
                            'url': repo['html_url']
                        })
                
                print(f"✅ GitHub repos found: {len(repos)}")
                return repos
            else:
                print(f"❌ GitHub API error: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ GitHub API error: {e}")
            return []

    def fetch_all_sources(self, query: str, max_per_source: int = 50) -> List[Dict]:
        print(f"🚀 Fetching data from all reliable sources for: {query}")
        all_data = []
        # 1. NewsAPI.org (preferred)
        news_data = self.fetch_newsapi_news(query, max_per_source)
        all_data.extend(news_data)
        # 2. HackerNews (Algolia API)
        hn_data = self.fetch_hackernews_data(query, max_per_source)
        all_data.extend(hn_data)
        # 3. Reddit (existing logic)
        reddit_data = self.fetch_reddit_data(query, max_per_source)
        all_data.extend(reddit_data)
        # 4. GitHub (for tech topics)
        if any(word in query.lower() for word in ['tech', 'software', 'programming', 'ai', 'machine learning', 'technology', 'code']):
            github_data = self.fetch_github_data(query, max_per_source)
            all_data.extend(github_data)
        # Sort by creation time (newest first)
        all_data.sort(key=lambda x: x['created_at'], reverse=True)
        print(f"🎉 Total reliable data items: {len(all_data)}")
        print(f"📊 Breakdown: News={len(news_data)}, HN={len(hn_data)}, Reddit={len(reddit_data)}")
        return all_data

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove HTML tags
        soup = BeautifulSoup(text, 'html.parser')
        text = soup.get_text()
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove special characters but keep basic punctuation
        import re
        text = re.sub(r'[^\w\s\.\!\?\,\-\'\"]', '', text)
        
        return text.strip()

    def get_mock_data(self, query: str, count: int = 100) -> List[Dict]:
        """Enhanced mock data for fallback"""
        print(f"🎭 Generating enhanced mock data for: {query}")
        
        mock_data = []
        platforms = ['news', 'reddit', 'hackernews', 'github']
        
        for i in range(count):
            platform = platforms[i % len(platforms)]
            
            # Generate realistic mock text based on query
            mock_texts = [
                f"Great news about {query}! This is really exciting.",
                f"I'm not sure about {query}. Need to see more data.",
                f"{query} is getting a lot of attention lately.",
                f"Interesting developments with {query} technology.",
                f"People are really talking about {query} these days.",
                f"Mixed reactions to {query} in the community.",
                f"Positive feedback for {query} implementation.",
                f"Some concerns raised about {query} approach."
            ]
            
            mock_data.append({
                'text': random.choice(mock_texts),
                'platform': platform,
                'source': platform,
                'user': f"user_{i}",
                'created_at': datetime.now().replace(tzinfo=timezone.utc),
                'score': random.randint(1, 100),
                'url': f"https://example.com/{platform}/post_{i}"
            })
        
        return mock_data

    def analyze_sentiment(self, data_items: List[Dict]) -> Dict:
        """Simple sentiment analysis based on keywords"""
        print(f"🔍 Analyzing sentiment for {len(data_items)} items...")
        
        positive_keywords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'positive', 'success', 'win', 'love', 'like', 'best', 'awesome', 'fantastic']
        negative_keywords = ['bad', 'terrible', 'awful', 'negative', 'fail', 'hate', 'worst', 'dislike', 'problem', 'issue', 'error', 'broken']
        
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        
        platform_breakdown = {}
        
        for item in data_items:
            text = item['text'].lower()
            platform = item.get('platform', 'unknown')
            
            # Count by platform
            if platform not in platform_breakdown:
                platform_breakdown[platform] = {'positive': 0, 'negative': 0, 'neutral': 0}
            
            # Simple sentiment analysis
            positive_score = sum(1 for word in positive_keywords if word in text)
            negative_score = sum(1 for word in negative_keywords if word in text)
            
            if positive_score > negative_score:
                positive_count += 1
                platform_breakdown[platform]['positive'] += 1
            elif negative_score > positive_score:
                negative_count += 1
                platform_breakdown[platform]['negative'] += 1
            else:
                neutral_count += 1
                platform_breakdown[platform]['neutral'] += 1
        
        total = len(data_items)
        
        return {
            'positive_percentage': round((positive_count / total) * 100, 1) if total > 0 else 0,
            'negative_percentage': round((negative_count / total) * 100, 1) if total > 0 else 0,
            'neutral_percentage': round((neutral_count / total) * 100, 1) if total > 0 else 0,
            'platform_breakdown': platform_breakdown,
            'timeline': {'positive': positive_count, 'negative': negative_count, 'neutral': neutral_count}
        }

# Test the new fetcher
if __name__ == "__main__":
    fetcher = ReliableDataFetcher()
    
    # Test with a sample query
    query = "artificial intelligence"
    print(f"Testing reliable data fetcher with query: {query}")
    
    data = fetcher.fetch_all_sources(query, max_per_source=10)
    
    print(f"\n📋 Results:")
    for i, item in enumerate(data[:5]):
        print(f"{i+1}. {item['text'][:100]}... ({item['platform']})") 