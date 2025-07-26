import { ReliableDataFetcher } from '../reliable_data_fetcher.py'
import { EnhancedAIChat } from '../enhanced_ai_chat.py'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query, max_tweets = 100, use_real_data = true } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    // Initialize components
    const dataFetcher = new ReliableDataFetcher()
    const aiChat = new EnhancedAIChat()

    console.log(`Starting analysis for query: ${query}`)

    // Fetch data
    const data = await dataFetcher.fetch_all_reliable_data(query, max_tweets)
    
    if (!data || data.length === 0) {
      return res.status(200).json({
        total_tweets: 0,
        positive_percentage: 0,
        negative_percentage: 0,
        neutral_percentage: 0,
        timeline: { time: [], positive: [], negative: [], neutral: [] },
        sample_tweets: [],
        platform_breakdown: {},
        success: false,
        message: 'No data found for this query'
      })
    }

    // Analyze sentiment
    const analysis = await dataFetcher.analyze_sentiment(data)
    
    // Prepare response
    const response = {
      total_tweets: analysis.total_items,
      positive_percentage: analysis.positive_percentage,
      negative_percentage: analysis.negative_percentage,
      neutral_percentage: analysis.neutral_percentage,
      timeline: analysis.timeline,
      sample_tweets: analysis.sample_data || [],
      platform_breakdown: analysis.platform_breakdown || {},
      success: true,
      message: `Analysis complete: ${analysis.total_items} items, ${analysis.positive_percentage}% positive`
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Analysis error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
} 