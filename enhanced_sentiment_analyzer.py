#!/usr/bin/env python3
"""
Enhanced Sentiment Analyzer with Better Categories and Context
"""

import re
from typing import Dict, List, Tuple
from collections import Counter

class EnhancedSentimentAnalyzer:
    def __init__(self):
        # Enhanced sentiment categories with subcategories
        self.sentiment_categories = {
            'positive': {
                'enthusiastic': ['amazing', 'incredible', 'fantastic', 'brilliant', 'excellent', 'outstanding', 'perfect', 'love', 'adore', 'wow', 'stunning', 'revolutionary', 'game-changing'],
                'supportive': ['good', 'great', 'nice', 'helpful', 'useful', 'beneficial', 'positive', 'promising', 'encouraging', 'hopeful', 'optimistic'],
                'satisfied': ['happy', 'pleased', 'content', 'satisfied', 'comfortable', 'relieved', 'grateful', 'thankful']
            },
            'negative': {
                'angry': ['terrible', 'awful', 'horrible', 'disgusting', 'hate', 'loathe', 'furious', 'outraged', 'enraged', 'infuriated'],
                'disappointed': ['disappointing', 'let down', 'frustrated', 'annoyed', 'upset', 'sad', 'unhappy', 'dissatisfied'],
                'concerned': ['worried', 'concerned', 'anxious', 'nervous', 'scared', 'fearful', 'suspicious', 'doubtful', 'skeptical']
            },
            'neutral': {
                'informative': ['fact', 'data', 'information', 'report', 'study', 'research', 'analysis', 'evidence', 'statistics'],
                'observational': ['seems', 'appears', 'looks like', 'might', 'could', 'possibly', 'maybe', 'perhaps'],
                'balanced': ['mixed', 'both', 'neither', 'either', 'depends', 'varies', 'different', 'various']
            },
            'critical': {
                'constructive': ['improve', 'better', 'enhance', 'optimize', 'refine', 'suggest', 'recommend', 'advice'],
                'analytical': ['analyze', 'examine', 'investigate', 'review', 'assess', 'evaluate', 'consider'],
                'questioning': ['why', 'how', 'what if', 'doubt', 'question', 'uncertain', 'unclear']
            }
        }
        
        # Context indicators for better understanding
        self.context_indicators = {
            'business': ['company', 'business', 'corporate', 'enterprise', 'startup', 'CEO', 'executive', 'management', 'strategy', 'revenue', 'profit', 'market'],
            'technology': ['tech', 'software', 'app', 'platform', 'system', 'code', 'development', 'programming', 'AI', 'machine learning', 'algorithm'],
            'social': ['community', 'people', 'users', 'customers', 'audience', 'public', 'society', 'social media', 'viral'],
            'political': ['government', 'policy', 'election', 'political', 'democracy', 'voting', 'campaign', 'politician'],
            'environmental': ['climate', 'environment', 'sustainability', 'green', 'eco-friendly', 'pollution', 'carbon', 'renewable']
        }

    def analyze_enhanced_sentiment(self, text: str) -> Dict:
        """Analyze text with enhanced sentiment categories and context"""
        text_lower = text.lower()
        
        # Count sentiment words in each category
        sentiment_scores = {}
        for main_category, subcategories in self.sentiment_categories.items():
            sentiment_scores[main_category] = {}
            for subcategory, words in subcategories.items():
                count = sum(1 for word in words if word in text_lower)
                sentiment_scores[main_category][subcategory] = count
        
        # Determine primary sentiment
        primary_sentiment = self._get_primary_sentiment(sentiment_scores)
        
        # Analyze context
        context = self._analyze_context(text_lower)
        
        # Calculate confidence and intensity
        confidence, intensity = self._calculate_confidence_intensity(sentiment_scores, text)
        
        return {
            'primary_sentiment': primary_sentiment,
            'sentiment_breakdown': sentiment_scores,
            'context': context,
            'confidence': confidence,
            'intensity': intensity,
            'enhanced_categories': self._get_enhanced_categories(sentiment_scores, context)
        }
    
    def _get_primary_sentiment(self, sentiment_scores: Dict) -> str:
        """Determine the primary sentiment category"""
        total_scores = {}
        for category, subcategories in sentiment_scores.items():
            total_scores[category] = sum(subcategories.values())
        
        if not any(total_scores.values()):
            return 'neutral'
        
        return max(total_scores, key=total_scores.get)
    
    def _analyze_context(self, text: str) -> Dict:
        """Analyze the context of the text"""
        context_scores = {}
        for context_type, indicators in self.context_indicators.items():
            context_scores[context_type] = sum(1 for indicator in indicators if indicator in text)
        
        return context_scores
    
    def _calculate_confidence_intensity(self, sentiment_scores: Dict, text: str) -> Tuple[float, str]:
        """Calculate confidence and intensity of sentiment"""
        # Count total sentiment words
        total_sentiment_words = sum(
            sum(subcategories.values()) 
            for subcategories in sentiment_scores.values()
        )
        
        # Calculate confidence based on sentiment word density
        words = text.split()
        confidence = min(1.0, total_sentiment_words / max(len(words), 1))
        
        # Determine intensity
        if total_sentiment_words == 0:
            intensity = 'neutral'
        elif total_sentiment_words <= 2:
            intensity = 'mild'
        elif total_sentiment_words <= 5:
            intensity = 'moderate'
        else:
            intensity = 'strong'
        
        return confidence, intensity
    
    def _get_enhanced_categories(self, sentiment_scores: Dict, context: Dict) -> List[str]:
        """Get enhanced sentiment categories with context"""
        categories = []
        
        # Add primary sentiment
        primary = self._get_primary_sentiment(sentiment_scores)
        categories.append(primary)
        
        # Add subcategories
        for category, subcategories in sentiment_scores.items():
            for subcategory, count in subcategories.items():
                if count > 0:
                    categories.append(f"{category}_{subcategory}")
        
        # Add context
        for context_type, score in context.items():
            if score > 0:
                categories.append(f"context_{context_type}")
        
        return categories

    def get_sentiment_summary(self, analysis_results: List[Dict]) -> Dict:
        """Generate a comprehensive sentiment summary"""
        all_categories = []
        context_counts = Counter()
        intensity_distribution = Counter()
        
        for result in analysis_results:
            all_categories.extend(result.get('enhanced_categories', []))
            context_counts.update(result.get('context', {}))
            intensity_distribution[result.get('intensity', 'neutral')] += 1
        
        # Calculate category percentages
        category_counts = Counter(all_categories)
        total_items = len(analysis_results)
        
        category_percentages = {
            category: (count / total_items) * 100 
            for category, count in category_counts.items()
        }
        
        return {
            'total_items': total_items,
            'category_breakdown': category_percentages,
            'context_analysis': dict(context_counts),
            'intensity_distribution': dict(intensity_distribution),
            'primary_sentiments': {
                'positive': len([r for r in analysis_results if r.get('primary_sentiment') == 'positive']),
                'negative': len([r for r in analysis_results if r.get('primary_sentiment') == 'negative']),
                'neutral': len([r for r in analysis_results if r.get('primary_sentiment') == 'neutral']),
                'critical': len([r for r in analysis_results if r.get('primary_sentiment') == 'critical'])
            }
        }

# Test the enhanced analyzer
if __name__ == "__main__":
    analyzer = EnhancedSentimentAnalyzer()
    
    test_texts = [
        "This AI technology is absolutely amazing and revolutionary!",
        "I'm concerned about the privacy implications of this technology.",
        "The company's performance has been disappointing this quarter.",
        "This is a neutral observation about the current market trends.",
        "We should improve the user interface to make it more accessible."
    ]
    
    print("Testing Enhanced Sentiment Analyzer:")
    print("=" * 50)
    
    for i, text in enumerate(test_texts, 1):
        result = analyzer.analyze_enhanced_sentiment(text)
        print(f"\n{i}. Text: {text}")
        print(f"   Primary Sentiment: {result['primary_sentiment']}")
        print(f"   Intensity: {result['intensity']}")
        print(f"   Confidence: {result['confidence']:.2f}")
        print(f"   Categories: {result['enhanced_categories']}")
        print(f"   Context: {result['context']}") 