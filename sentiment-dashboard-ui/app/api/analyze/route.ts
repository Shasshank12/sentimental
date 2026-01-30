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
  'robust', 'thriving', 'flourishing', 'booming', 'surging', 'soaring',
  'viral', 'trending', 'hilarious', 'funny', 'cute', 'adorable', 'wholesome',
  'epic', 'legendary', 'iconic', 'insane', 'fire', 'lit', 'goat', 'based',
  'peak', 'chef', 'kiss', 'masterpiece', 'perfection', 'elite', 'top'
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
  'criticism', 'complaint', 'lawsuit', 'investigation', 'fraud', 'scam',
  'cringe', 'mid', 'flop', 'ratio', 'dead', 'dying', 'worst', 'trash',
  'garbage', 'toxic', 'cancelled', 'exposed', 'caught', 'fake', 'scam'
])

const INTENSIFIERS = new Set(['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'highly', 'really', 'super', 'ultra', 'mega', 'so'])
const NEGATORS = new Set(['not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't", "isn't", "aren't"])

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
// DATA FETCHING - Real data from multiple sources
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
  let cleaned = text.replace(/<[^>]*>/g, '')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  cleaned = cleaned.replace(/[^\w\s.,!?'-]/g, '')
  return cleaned
}

// Fetch from Reddit with multiple subreddits and better error handling
async function fetchRedditData(query: string, maxItems: number = 50): Promise<DataItem[]> {
  const results: DataItem[] = []

  try {
    // Search across Reddit - sort by new/hot for recent content
    const searches = [
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&t=day&limit=${Math.ceil(maxItems/2)}`,
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=hot&t=week&limit=${Math.ceil(maxItems/2)}`
    ]

    for (const searchUrl of searches) {
      try {
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          },
          next: { revalidate: 60 } // Cache for 1 minute
        })

        if (response.ok) {
          const data = await response.json()
          const posts = data.data?.children || []

          for (const post of posts) {
            const postData = post.data
            if (!postData) continue

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
      } catch (e) {
        console.log('Reddit search failed:', e)
      }
    }
  } catch (error) {
    console.error('Reddit fetch error:', error)
  }

  // Remove duplicates by URL
  const seen = new Set()
  return results.filter(item => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

// Fetch from HackerNews - search recent stories
async function fetchHackerNewsData(query: string, maxItems: number = 30): Promise<DataItem[]> {
  const results: DataItem[] = []

  try {
    // Use search_by_date for recent content
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${maxItems}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0)'
        },
        next: { revalidate: 60 }
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
            created_at: hit.created_at || new Date().toISOString(),
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
  const apiKey = process.env.NEWSAPI_KEY

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
        },
        next: { revalidate: 300 } // Cache for 5 minutes
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

// Fetch from Google News RSS (free, no API key needed)
async function fetchGoogleNewsData(query: string, maxItems: number = 20): Promise<DataItem[]> {
  const results: DataItem[] = []

  try {
    // Google News RSS feed
    const response = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0)'
        },
        next: { revalidate: 300 }
      }
    )

    if (response.ok) {
      const xmlText = await response.text()

      // Simple XML parsing for RSS items
      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/
      const linkRegex = /<link>(.*?)<\/link>/
      const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/
      const sourceRegex = /<source.*?>(.*?)<\/source>/

      let match
      let count = 0
      while ((match = itemRegex.exec(xmlText)) !== null && count < maxItems) {
        const item = match[1]
        const titleMatch = item.match(titleRegex)
        const linkMatch = item.match(linkRegex)
        const pubDateMatch = item.match(pubDateRegex)
        const sourceMatch = item.match(sourceRegex)

        const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '') : ''
        const link = linkMatch ? linkMatch[1] : ''
        const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString()
        const source = sourceMatch ? sourceMatch[1] : 'Google News'

        if (title && title.length > 10) {
          const text = cleanText(title)
          const sentiment = analyzeSentiment(text)
          results.push({
            text: text.substring(0, 500),
            sentiment: sentiment.label,
            platform: 'news',
            source: source,
            created_at: new Date(pubDate).toISOString(),
            url: link,
            title: title
          })
          count++
        }
      }
    }
  } catch (error) {
    console.error('Google News fetch error:', error)
  }

  return results
}

// Fetch from GitHub (free, for tech-related queries)
async function fetchGitHubData(query: string, maxItems: number = 15): Promise<DataItem[]> {
  const results: DataItem[] = []

  const techKeywords = ['tech', 'software', 'programming', 'ai', 'machine learning', 'technology', 'code', 'developer', 'api', 'framework', 'library', 'open source', 'github']
  const isTechy = techKeywords.some(kw => query.toLowerCase().includes(kw))

  if (!isTechy) return results

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${maxItems}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentimentalAI/1.0)',
          'Accept': 'application/vnd.github.v3+json'
        },
        next: { revalidate: 300 }
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
            created_at: repo.pushed_at || repo.updated_at || new Date().toISOString(),
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
    const [redditData, hnData, newsData, googleNewsData, githubData] = await Promise.all([
      fetchRedditData(query, 50),
      fetchHackerNewsData(query, 30),
      fetchNewsAPIData(query, 25),
      fetchGoogleNewsData(query, 20),
      fetchGitHubData(query, 15)
    ])

    // Combine all data
    let allData: DataItem[] = [...redditData, ...hnData, ...newsData, ...googleNewsData, ...githubData]

    console.log(`📊 Data collected: Reddit=${redditData.length}, HN=${hnData.length}, NewsAPI=${newsData.length}, GoogleNews=${googleNewsData.length}, GitHub=${githubData.length}`)

    // If no real data, return error
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
        ai_answer: `I couldn't find any recent data about "${query}". This might be because the topic is very niche or there's limited recent discussion. Try a broader or more popular topic.`
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

    // Calculate timeline (group by day for better visualization)
    const now = new Date()
    const timelineBuckets: Record<string, DataItem[]> = {}

    for (const item of allData) {
      const itemDate = new Date(item.created_at)
      const dayDiff = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24))
      const key = dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Yesterday' : `${dayDiff}d ago`
      if (!timelineBuckets[key]) {
        timelineBuckets[key] = []
      }
      timelineBuckets[key].push(item)
    }

    // Get the most recent day buckets (up to 7 days)
    const dayOrder = ['Today', 'Yesterday', '2d ago', '3d ago', '4d ago', '5d ago', '6d ago']
    const availableDays = dayOrder.filter(d => timelineBuckets[d] && timelineBuckets[d].length > 0)
    const timelineDays = availableDays.slice(0, 5)

    const timeline = {
      time: timelineDays,
      positive: timelineDays.map(d => {
        const bucket = timelineBuckets[d] || []
        return bucket.length > 0
          ? Math.round((bucket.filter(i => i.sentiment === 'positive').length / bucket.length) * 100)
          : 0
      }),
      negative: timelineDays.map(d => {
        const bucket = timelineBuckets[d] || []
        return bucket.length > 0
          ? Math.round((bucket.filter(i => i.sentiment === 'negative').length / bucket.length) * 100)
          : 0
      }),
      neutral: timelineDays.map(d => {
        const bucket = timelineBuckets[d] || []
        return bucket.length > 0
          ? Math.round((bucket.filter(i => i.sentiment === 'neutral').length / bucket.length) * 100)
          : 0
      })
    }

    // Generate simple AI summary (will be enhanced by chat endpoint)
    const topSources = Object.entries(platformBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => `${source} (${count})`)
      .slice(0, 3)

    const aiAnswer = `Analyzed ${total} items about "${query}" from ${Object.keys(platformBreakdown).length} sources. Sentiment: ${positivePercentage}% positive, ${negativePercentage}% negative, ${neutralPercentage}% neutral. Top sources: ${topSources.join(', ')}.`

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
      ai_answer: aiAnswer,
      query: query
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
