import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// SENTIMENT ANALYSIS - Enhanced keyword-based analysis with intensity scoring
// ============================================================================

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy',
  'positive', 'awesome', 'fantastic', 'brilliant', 'outstanding', 'perfect',
  'best', 'favorite', 'enjoy', 'beautiful', 'incredible', 'superb', 'terrific',
  'marvelous', 'splendid', 'magnificent', 'glorious', 'blessed', 'grateful',
  'thankful', 'delighted', 'thrilled', 'excited', 'enthusiastic', 'passionate',
  'innovative', 'breakthrough', 'revolutionary', 'impressive', 'promising',
  'successful', 'winning', 'triumph', 'victory', 'achievement', 'progress',
  'growth', 'opportunity', 'potential', 'optimistic', 'confident', 'strong',
  'robust', 'thriving', 'flourishing', 'booming', 'surging', 'soaring'
])

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'negative',
  'dreadful', 'atrocious', 'abysmal', 'appalling', 'disgusting', 'vile',
  'broken', 'damaged', 'ruined', 'destroyed', 'failed', 'failure', 'disaster',
  'catastrophe', 'crisis', 'problem', 'issue', 'concern', 'worry', 'fear',
  'threat', 'risk', 'danger', 'warning', 'decline', 'drop', 'fall', 'crash',
  'collapse', 'plunge', 'slump', 'recession', 'downturn', 'loss', 'deficit',
  'struggling', 'suffering', 'painful', 'disappointing', 'frustrating',
  'annoying', 'irritating', 'outrage', 'scandal', 'controversy', 'backlash',
  'criticism', 'complaint', 'lawsuit', 'investigation', 'fraud', 'scam'
])

const INTENSIFIERS = new Set(['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'highly', 'really'])
const NEGATORS = new Set(['not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't"])

interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral'
  score: number
  confidence: number
}

function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\s+/)
  let positiveScore = 0
  let negativeScore = 0
  let multiplier = 1
  let negated = false

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, '')

    if (NEGATORS.has(word)) {
      negated = true
      continue
    }

    if (INTENSIFIERS.has(word)) {
      multiplier = 1.5
      continue
    }

    if (POSITIVE_WORDS.has(word)) {
      if (negated) {
        negativeScore += multiplier
      } else {
        positiveScore += multiplier
      }
    } else if (NEGATIVE_WORDS.has(word)) {
      if (negated) {
        positiveScore += multiplier
      } else {
        negativeScore += multiplier
      }
    }

    // Reset modifiers after processing a sentiment word
    if (POSITIVE_WORDS.has(word) || NEGATIVE_WORDS.has(word)) {
      multiplier = 1
      negated = false
    }
  }

  const total = positiveScore + negativeScore
  const confidence = total > 0 ? Math.min(0.95, 0.5 + (total / 10)) : 0.5

  if (positiveScore > negativeScore * 1.2) {
    return { label: 'positive', score: positiveScore, confidence }
  } else if (negativeScore > positiveScore * 1.2) {
    return { label: 'negative', score: negativeScore, confidence }
  }
  return { label: 'neutral', score: 0, confidence: 0.5 }
}

// ============================================================================
// DATA FETCHING - Real data from multiple free public sources
// ============================================================================

interface DataItem {
  text: string
  sentiment: 'positive' | 'negative' | 'neutral'
  platform: string
  source: string
  created_at: string
  url: string
  title?: string
  score?: number
}

// Helper to clean HTML and normalize text
function cleanText(text: string): string {
  if (!text) return ''
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '')
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  // Remove special characters but keep basic punctuation
  cleaned = cleaned.replace(/[^\w\s.,!?'-]/g, '')
  return cleaned
}

// Fetch from Reddit (free, no API key needed)
async function fetchRedditData(query: string, maxItems: number = 30): Promise<DataItem[]> {
  const subreddits = ['technology', 'news', 'worldnews', 'science', 'programming']
  const results: DataItem[] = []

  try {
    // General search
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=hot&t=week&limit=${maxItems}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0; +https://sentimental.app)'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      const posts = data.data?.children || []

      for (const post of posts) {
        const postData = post.data
        const text = cleanText(postData.title + ' ' + (postData.selftext || ''))

        if (text.length > 20) {
          const sentiment = analyzeSentiment(text)
          results.push({
            text: text.substring(0, 500),
            sentiment: sentiment.label,
            platform: 'reddit',
            source: `r/${postData.subreddit}`,
            created_at: new Date(postData.created_utc * 1000).toISOString(),
            url: `https://reddit.com${postData.permalink}`,
            title: postData.title,
            score: postData.score
          })
        }
      }
    }
  } catch (error) {
    console.error('Reddit fetch error:', error)
  }

  return results
}

// Fetch from HackerNews (free Algolia API)
async function fetchHackerNewsData(query: string, maxItems: number = 30): Promise<DataItem[]> {
  const results: DataItem[] = []

  try {
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${maxItems}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0)'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      const hits = data.hits || []

      for (const hit of hits) {
        const text = cleanText(hit.title + ' ' + (hit.story_text || ''))

        if (text.length > 10) {
          const sentiment = analyzeSentiment(text)
          results.push({
            text: text.substring(0, 500),
            sentiment: sentiment.label,
            platform: 'hackernews',
            source: 'Hacker News',
            created_at: new Date(hit.created_at_i * 1000).toISOString(),
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            title: hit.title,
            score: hit.points
          })
        }
      }
    }
  } catch (error) {
    console.error('HackerNews fetch error:', error)
  }

  return results
}

// Fetch from NewsAPI (with API key from env)
async function fetchNewsAPIData(query: string, maxItems: number = 30): Promise<DataItem[]> {
  const results: DataItem[] = []
  const apiKey = process.env.NEWSAPI_KEY || process.env.NEXT_PUBLIC_NEWSAPI_KEY

  if (!apiKey) {
    console.log('NewsAPI key not configured, skipping...')
    return results
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${maxItems}&apiKey=${apiKey}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0)'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      const articles = data.articles || []

      for (const article of articles) {
        const text = cleanText(article.title + ' ' + (article.description || ''))

        if (text.length > 20) {
          const sentiment = analyzeSentiment(text)
          results.push({
            text: text.substring(0, 500),
            sentiment: sentiment.label,
            platform: 'news',
            source: article.source?.name || 'News',
            created_at: article.publishedAt || new Date().toISOString(),
            url: article.url,
            title: article.title
          })
        }
      }
    }
  } catch (error) {
    console.error('NewsAPI fetch error:', error)
  }

  return results
}

// Fetch from GitHub (free, no API key needed for basic search)
async function fetchGitHubData(query: string, maxItems: number = 20): Promise<DataItem[]> {
  const results: DataItem[] = []

  // Only fetch GitHub for tech-related queries
  const techKeywords = ['tech', 'software', 'programming', 'ai', 'machine learning', 'technology', 'code', 'developer', 'api', 'framework', 'library']
  const isTechy = techKeywords.some(kw => query.toLowerCase().includes(kw))

  if (!isTechy) return results

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${maxItems}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0)',
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      const repos = data.items || []

      for (const repo of repos) {
        const text = cleanText(`${repo.name}: ${repo.description || ''}`)

        if (text.length > 10) {
          const sentiment = analyzeSentiment(text)
          results.push({
            text: text.substring(0, 500),
            sentiment: sentiment.label,
            platform: 'github',
            source: 'GitHub',
            created_at: repo.updated_at || new Date().toISOString(),
            url: repo.html_url,
            title: repo.full_name,
            score: repo.stargazers_count
          })
        }
      }
    }
  } catch (error) {
    console.error('GitHub fetch error:', error)
  }

  return results
}

// ============================================================================
// AI RESPONSE GENERATION - Context-aware responses without external API
// ============================================================================

function generateAIResponse(
  query: string,
  positivePercentage: number,
  negativePercentage: number,
  neutralPercentage: number,
  totalItems: number,
  topSources: string[]
): string {
  const dominantSentiment = positivePercentage > negativePercentage
    ? (positivePercentage > neutralPercentage ? 'positive' : 'neutral')
    : (negativePercentage > neutralPercentage ? 'negative' : 'neutral')

  let analysis = ''

  if (dominantSentiment === 'positive') {
    analysis = `The sentiment around "${query}" is predominantly positive (${positivePercentage}%). `
    if (positivePercentage > 70) {
      analysis += `This indicates strong favorable opinions and enthusiasm in the community. `
    } else if (positivePercentage > 50) {
      analysis += `While generally positive, there's still a mix of perspectives being shared. `
    }
  } else if (dominantSentiment === 'negative') {
    analysis = `The sentiment around "${query}" leans negative (${negativePercentage}%). `
    if (negativePercentage > 70) {
      analysis += `There appears to be significant concern or criticism being expressed. `
    } else if (negativePercentage > 50) {
      analysis += `The community shows mixed reactions with notable concerns. `
    }
  } else {
    analysis = `The sentiment around "${query}" is relatively balanced (${neutralPercentage}% neutral). `
    analysis += `This suggests the topic is being discussed factually or opinions are mixed. `
  }

  analysis += `Based on ${totalItems} items from ${topSources.slice(0, 3).join(', ')}. `

  // Add insights based on the data
  if (positivePercentage > 60 && negativePercentage < 20) {
    analysis += `This is a favorable time for engagement with this topic.`
  } else if (negativePercentage > 60) {
    analysis += `Consider monitoring for potential issues or crises.`
  } else {
    analysis += `The balanced sentiment suggests ongoing debate and diverse viewpoints.`
  }

  return analysis
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, max_tweets = 100 } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required', success: false },
        { status: 400 }
      )
    }

    console.log(`🔍 Starting analysis for query: "${query}"`)

    // Fetch data from all sources in parallel
    const [redditData, hnData, newsData, githubData] = await Promise.all([
      fetchRedditData(query, 30),
      fetchHackerNewsData(query, 25),
      fetchNewsAPIData(query, 20),
      fetchGitHubData(query, 15)
    ])

    // Combine all data
    let allData: DataItem[] = [...redditData, ...hnData, ...newsData, ...githubData]

    console.log(`📊 Data collected: Reddit=${redditData.length}, HN=${hnData.length}, News=${newsData.length}, GitHub=${githubData.length}`)

    // If no real data, return error (don't fall back to mock)
    if (allData.length === 0) {
      return NextResponse.json({
        total_tweets: 0,
        positive_percentage: 0,
        negative_percentage: 0,
        neutral_percentage: 0,
        timeline: { time: [], positive: [], negative: [], neutral: [] },
        sample_tweets: [],
        platform_breakdown: {},
        source_sentiment_counts: {},
        success: false,
        message: `No data found for "${query}". Try a different search term.`,
        ai_answer: `I couldn't find any recent data about "${query}". This might be because:\n\n1. The topic is very niche\n2. The search term needs to be more specific\n3. There's limited recent discussion on this topic\n\nTry searching for a broader or more popular topic.`
      })
    }

    // Sort by date (newest first) and limit
    allData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    allData = allData.slice(0, max_tweets)

    // Calculate sentiment percentages
    const total = allData.length
    const positiveCount = allData.filter(item => item.sentiment === 'positive').length
    const negativeCount = allData.filter(item => item.sentiment === 'negative').length
    const neutralCount = allData.filter(item => item.sentiment === 'neutral').length

    const positivePercentage = Math.round((positiveCount / total) * 100)
    const negativePercentage = Math.round((negativeCount / total) * 100)
    const neutralPercentage = Math.round((neutralCount / total) * 100)

    // Calculate platform breakdown
    const platformBreakdown: Record<string, number> = {}
    const sourceSentimentCounts: Record<string, { positive: number; negative: number; neutral: number }> = {}

    for (const item of allData) {
      const platform = item.platform
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1

      if (!sourceSentimentCounts[platform]) {
        sourceSentimentCounts[platform] = { positive: 0, negative: 0, neutral: 0 }
      }
      sourceSentimentCounts[platform][item.sentiment]++
    }

    // Calculate timeline (group by hour)
    const now = new Date()
    const timelineBuckets: Record<number, DataItem[]> = {}

    for (const item of allData) {
      const itemDate = new Date(item.created_at)
      const hourDiff = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60))
      if (!timelineBuckets[hourDiff]) {
        timelineBuckets[hourDiff] = []
      }
      timelineBuckets[hourDiff].push(item)
    }

    // Get the 4 most recent hour buckets
    const sortedHours = Object.keys(timelineBuckets)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, 4)

    const timeline = {
      time: sortedHours.map(h => h === 0 ? 'now' : `${h}h ago`),
      positive: sortedHours.map(h => {
        const bucket = timelineBuckets[h] || []
        return bucket.length > 0
          ? Math.round((bucket.filter(i => i.sentiment === 'positive').length / bucket.length) * 100)
          : 0
      }),
      negative: sortedHours.map(h => {
        const bucket = timelineBuckets[h] || []
        return bucket.length > 0
          ? Math.round((bucket.filter(i => i.sentiment === 'negative').length / bucket.length) * 100)
          : 0
      }),
      neutral: sortedHours.map(h => {
        const bucket = timelineBuckets[h] || []
        return bucket.length > 0
          ? Math.round((bucket.filter(i => i.sentiment === 'neutral').length / bucket.length) * 100)
          : 0
      })
    }

    // Generate AI response
    const topSources = Object.entries(platformBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([source]) => source)

    const aiAnswer = generateAIResponse(
      query,
      positivePercentage,
      negativePercentage,
      neutralPercentage,
      total,
      topSources
    )

    const response = {
      total_tweets: total,
      positive_percentage: positivePercentage,
      negative_percentage: negativePercentage,
      neutral_percentage: neutralPercentage,
      timeline,
      sample_tweets: allData,
      platform_breakdown: platformBreakdown,
      source_sentiment_counts: sourceSentimentCounts,
      success: true,
      message: `Analysis complete: ${total} items from ${Object.keys(platformBreakdown).length} sources`,
      ai_answer: aiAnswer
    }

    console.log(`✅ Analysis complete: ${total} items, ${positivePercentage}% positive`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: errorMessage,
        success: false,
        total_tweets: 0,
        positive_percentage: 0,
        negative_percentage: 0,
        neutral_percentage: 0,
        timeline: { time: [], positive: [], negative: [], neutral: [] },
        sample_tweets: [],
        platform_breakdown: {},
        source_sentiment_counts: {}
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
