#!/usr/bin/env python3
"""
Enhanced AI Chat System with Contextual Understanding
"""

import openai
import os
from typing import Dict, List, Optional
from datetime import datetime
import spacy
from collections import Counter

from openai import OpenAI
class EnhancedAIChat:
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
        self.nlp = spacy.load("en_core_web_sm")
    
    def generate_contextual_response(self, user_question: str, analysis_results: Dict, sample_data: List[Dict]) -> str:
        """Generate a contextual response based on the specific user question"""
        
        if not self.openai_api_key:
            return self._fallback_response(user_question, analysis_results)
        
        # Analyze the question type
        question_type = self._analyze_question_type(user_question)
        
        # Build context based on question type
        context = self._build_context_for_question(question_type, analysis_results, sample_data)
        
        # Create specific prompt based on question type
        prompt = self._create_specific_prompt(question_type, user_question, context)
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4.0",
                messages=[
                    {"role": "system", "content": self._get_system_prompt(question_type)},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"OpenAI API error: {e}")
            return self._fallback_response(user_question, analysis_results)

    def extract_named_entities(self, sample_data):
        entity_counter = Counter()
        for item in sample_data:
            doc = self.nlp(item.get("text", ""))
            for ent in doc.ents:
                entity_counter[ent.text] += 1
        top_entities = dict(entity_counter.most_common(5))
        if not top_entities:
            return {"Note": "No named entities found in sample."}
        return top_entities
    
    def _analyze_question_type(self, question: str) -> str:
        """Analyze what type of question the user is asking"""
        question_lower = question.lower()
        
        # Question type patterns
        patterns = {
            'trends': ['trend', 'trending', 'pattern', 'change', 'over time', 'evolution'],
            'comparison': ['compare', 'versus', 'vs', 'difference', 'better', 'worse', 'similar'],
            'causes': ['why', 'cause', 'reason', 'because', 'due to', 'result of'],
            'impact': ['impact', 'effect', 'influence', 'consequence', 'outcome'],
            'recommendations': ['recommend', 'suggestion', 'advice', 'should', 'improve', 'fix'],
            'specific_details': ['what', 'how', 'when', 'where', 'who', 'specific'],
            'prediction': ['predict', 'forecast', 'future', 'will', 'going to', 'likely'],
            'summary': ['summary', 'overview', 'summary', 'brief', 'main points']
        }
        
        for question_type, keywords in patterns.items():
            if any(keyword in question_lower for keyword in keywords):
                return question_type
        
        return 'general'
    
    def _build_context_for_question(self, question_type: str, analysis_results: Dict, sample_data: List[Dict]) -> str:
        """Build specific context based on question type"""
        
        # Extract basic metrics
        total_items = analysis_results.get('total_tweets', 0)
        positive_pct = analysis_results.get('positive_percentage', 0)
        negative_pct = analysis_results.get('negative_percentage', 0)
        neutral_pct = analysis_results.get('neutral_percentage', 0)
        platform_breakdown = analysis_results.get('platform_breakdown', {})
        
        context = f"""
        ANALYSIS OVERVIEW:
        - Total items analyzed: {total_items}
        - Platform breakdown: {platform_breakdown}
        """
        
        # Add specific context based on question type
        if question_type == 'trends':
            context += "\nTREND FOCUS: Analyze patterns in sentiment distribution and platform-specific trends."
        
        elif question_type == 'comparison':
            context += "\nCOMPARISON FOCUS: Compare sentiment across different platforms and data sources."
        
        elif question_type == 'causes':
            context += "\nCAUSAL FOCUS: Identify potential reasons for sentiment patterns based on sample data."
        
        elif question_type == 'impact':
            context += "\nIMPACT FOCUS: Evaluate implications of the sentiment distribution on the topic."
        
        elif question_type == 'recommendations':
            context += "\nRECOMMENDATION FOCUS: Provide actionable advice based on sentiment patterns."
        
        elif question_type == 'specific_details':
            context += "\nDETAIL FOCUS: Focus on specific aspects and concrete examples from the data."
        
        # Add sample data context - this is the most important part
        if sample_data:
            context += "\n\nSAMPLE DATA INSIGHTS:"
            for i, item in enumerate(sample_data[:20]):  # Show more sample data
                text = item.get('text', '')[:300]  # Show more text
                sentiment = item.get('sentiment', 'unknown')
                platform = item.get('platform', 'unknown')
                context += f"\n{i+1}. [{platform.upper()}] {text}... (Sentiment: {sentiment})"
        
        entities = self.extract_named_entities(sample_data)
        if entities:
            context += f"\n\nNAMED ENTITIES MENTIONED MOST OFTEN: {entities}"
        
        return context
    
    def _create_specific_prompt(self, question_type: str, user_question: str, context: str) -> str:
        """Create a specific prompt based on question type"""
        
        prompts = {
            'trends': f"""
            Based on the sentiment analysis data, identify and explain the key trends in public sentiment.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Temporal patterns in sentiment
            - Platform-specific trends
            - Changes in sentiment intensity
            - Emerging patterns
            """,
            
            'comparison': f"""
            Compare and contrast different aspects of the sentiment analysis results.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Platform comparisons
            - Sentiment category comparisons
            - Relative strengths and weaknesses
            - Key differences and similarities
            """,
            
            'causes': f"""
            Analyze the potential causes and reasons behind the observed sentiment patterns.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Root causes of sentiment
            - Contributing factors
            - Contextual influences
            - Historical or recent events
            """,
            
            'impact': f"""
            Assess the potential impact and implications of the sentiment analysis results.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Business implications
            - Social impact
            - Future consequences
            - Risk assessment
            """,
            
            'recommendations': f"""
            Provide specific, actionable recommendations based on the sentiment analysis.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Immediate actions
            - Strategic improvements
            - Risk mitigation
            - Opportunity identification
            """,
            
            'specific_details': f"""
            Provide detailed, specific information about the sentiment analysis results.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Specific data points
            - Detailed breakdowns
            - Precise metrics
            - Concrete examples
            """,
            
            'prediction': f"""
            Make informed predictions about future sentiment trends based on current analysis.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Future trends
            - Predictive indicators
            - Likely scenarios
            - Confidence levels
            """,
            
            'summary': f"""
            Provide a comprehensive summary of the sentiment analysis results.
            
            {context}
            
            User Question: {user_question}

            Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
            
            Focus on:
            - Key findings
            - Main insights
            - Overall assessment
            - Critical points
            """
        }
        
        return prompts.get(question_type, f"""
        Provide a comprehensive analysis based on the sentiment data.
        
        {context}
        
        User Question: {user_question}

        Only use the provided context and sample data to answer. Do not rely on external knowledge or assumptions.
        """)
    
    def _get_system_prompt(self, question_type: str) -> str:
        """Get system prompt based on question type"""
        system_prompts = {
    'trends': "You are Sentimental AI, a concise sentiment analysis expert. Focus on identifying sentiment patterns, emerging themes, and frequently mentioned entities. Avoid repeating basic percentages from the chart. Share 2-3 actionable insights.",
    
    'comparison': "You are Sentimental AI, a comparative analysis expert. Compare platforms or sentiments based on data and notable entity mentions. Don't restate obvious metrics. Focus on meaningful contrasts in 2-3 sentences.",
    
    'causes': "You are Sentimental AI, a causal analysis expert. Use the sample data and extracted named entities to explain possible reasons behind sentiment patterns. Avoid speculation. Be specific in 2-3 lines.",
    
    'impact': "You are Sentimental AI, an impact assessment expert. Infer business or social consequences from the sentiment trends and entity context. Avoid generic observations. Give precise, real-world implications in 2–3 sentences.",
    
    'recommendations': "You are Sentimental AI, a strategic advisor. Use key themes and sentiment signals to suggest clear, data-backed improvements. Mention high-sentiment entities if relevant. Be brief, specific, and practical.",
    
    'specific_details': "You are Sentimental AI, a data analyst. Highlight specific entities, text examples, and sentiment findings from the data. Avoid generalizations or repeating numbers. Keep it sharp and focused.",
    
    'prediction': "You are Sentimental AI, a predictive analyst. Predict future sentiment or topic evolution using patterns and entities in the data. Mention emerging themes. Stay concise and realistic in 2-3 lines.",
    
    'summary': "You are Sentimental AI, a summary expert. Present key takeaways, focusing on most mentioned entities and major sentiment trends. Avoid percentages. Deliver a sharp, focused 2-3 sentence summary."
    }

        
        return system_prompts.get(
            question_type,
            "You are Sentimental AI, a sentiment analyst. Use the data and key entity mentions to provide a focused 2–3 sentence insight. Do not repeat visible metrics or percentages."
        )
    
    def _fallback_response(self, user_question: str, analysis_results: Dict) -> str:
        """Fallback response when OpenAI is unavailable"""
        total_items = analysis_results.get('total_tweets', 0)
        positive_pct = analysis_results.get('positive_percentage', 0)
        negative_pct = analysis_results.get('negative_percentage', 0)
        neutral_pct = analysis_results.get('neutral_percentage', 0)
        
        sentiment_pattern = self._get_sentiment_descriptor(positive_pct, negative_pct, neutral_pct)
        
        return f"Based on {total_items} analyzed items, the sentiment shows a {sentiment_pattern} pattern. The data indicates {positive_pct}% positive, {negative_pct}% negative, and {neutral_pct}% neutral responses. (OpenAI API temporarily unavailable for detailed analysis)"
    
    def _get_sentiment_descriptor(self, positive: float, negative: float, neutral: float) -> str:
        """Get a descriptive term for the sentiment pattern"""
        if positive > negative and positive > neutral:
            return "predominantly positive"
        elif negative > positive and negative > neutral:
            return "predominantly negative"
        elif neutral > positive and neutral > negative:
            return "predominantly neutral"
        else:
            return "mixed"

# Test the enhanced chat system
if __name__ == "__main__":
    chat = EnhancedAIChat()
    
    # Test with sample data
    analysis_results = {
        'total_tweets': 123,
        'positive_percentage': 18.4,
        'negative_percentage': 20.0,
        'neutral_percentage': 61.6,
        'platform_breakdown': {'reddit': 35, 'github': 30, 'news': 50, 'hackernews': 8}
    }
    
    sample_data = [
        {'text': 'This AI technology is amazing!', 'sentiment': 'positive'},
        {'text': 'I have concerns about privacy.', 'sentiment': 'negative'},
        {'text': 'The technology shows promise.', 'sentiment': 'neutral'}
    ]
    
    test_questions = [
        "What are the trends in AI sentiment?",
        "How does sentiment compare across platforms?",
        "Why is there negative sentiment?",
        "What impact will this have?",
        "What recommendations do you have?"
    ]
    
    print("Testing Enhanced AI Chat:")
    print("=" * 50)
    
    for question in test_questions:
        response = chat.generate_contextual_response(question, analysis_results, sample_data)
        print(f"\nQ: {question}")
        print(f"A: {response[:200]}...") 