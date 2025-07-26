import { NextRequest, NextResponse } from 'next/server'

// Simple sentiment analysis function
function analyzeSentiment(text: string): string {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'positive', 'awesome', 'fantastic', 'brilliant', 'outstanding', 'perfect', 'best', 'favorite', 'enjoy', 'enjoyed', 'enjoying', 'beautiful', 'beautifully', 'wonderful', 'wonderfully', 'amazing', 'amazingly', 'incredible', 'incredibly', 'fantastic', 'fantastically', 'brilliant', 'brilliantly', 'outstanding', 'outstandingly', 'excellent', 'excellently', 'perfect', 'perfectly', 'best', 'better', 'great', 'greater', 'greatest', 'super', 'superb', 'superbly', 'terrific', 'terrifically', 'marvelous', 'marvelously', 'splendid', 'splendidly', 'magnificent', 'magnificently', 'glorious', 'gloriously', 'divine', 'divinely', 'heavenly', 'heavenly', 'divine', 'divinely', 'sacred', 'sacredly', 'holy', 'holily', 'blessed', 'blessedly', 'fortunate', 'fortunately', 'lucky', 'luckily', 'fortunate', 'fortunately', 'blessed', 'blessedly', 'grateful', 'gratefully', 'thankful', 'thankfully', 'appreciative', 'appreciatively', 'content', 'contentedly', 'satisfied', 'satisfiedly', 'pleased', 'pleasedly', 'delighted', 'delightedly', 'thrilled', 'thrilledly', 'excited', 'excitedly', 'enthusiastic', 'enthusiastically', 'passionate', 'passionately', 'eager', 'eagerly', 'keen', 'keenly', 'interested', 'interestedly', 'curious', 'curiously', 'fascinated', 'fascinatedly', 'intrigued', 'intriguedly', 'captivated', 'captivatedly', 'enchanted', 'enchantedly', 'charmed', 'charmedly', 'bewitched', 'bewitchedly', 'spellbound', 'spellboundly', 'mesmerized', 'mesmerizedly', 'hypnotized', 'hypnotizedly', 'entranced', 'entrancedly', 'transfixed', 'transfixedly', 'riveted', 'rivetedly', 'engrossed', 'engrossedly', 'absorbed', 'absorbedly', 'immersed', 'immersedly', 'involved', 'involvedly', 'engaged', 'engagedly', 'committed', 'committedly', 'dedicated', 'dedicatedly', 'devoted', 'devotedly', 'loyal', 'loyally', 'faithful', 'faithfully', 'true', 'truly', 'genuine', 'genuinely', 'authentic', 'authentically', 'real', 'really', 'actual', 'actually', 'true', 'truly', 'genuine', 'genuinely', 'authentic', 'authentically', 'real', 'really', 'actual', 'actually', 'true', 'truly', 'genuine', 'genuinely', 'authentic', 'authentically', 'real', 'really', 'actual', 'actually']
  
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'negative', 'terrible', 'horrible', 'awful', 'dreadful', 'atrocious', 'abysmal', 'appalling', 'shocking', 'disgusting', 'revolting', 'repulsive', 'repugnant', 'abhorrent', 'loathsome', 'detestable', 'despicable', 'contemptible', 'vile', 'vicious', 'cruel', 'brutal', 'savage', 'barbaric', 'inhuman', 'inhumane', 'monstrous', 'monstrously', 'evil', 'evilly', 'wicked', 'wickedly', 'sinful', 'sinfully', 'corrupt', 'corruptly', 'depraved', 'depravedly', 'degenerate', 'degenerately', 'perverted', 'pervertedly', 'twisted', 'twistedly', 'warped', 'warpedly', 'distorted', 'distortedly', 'deformed', 'deformedly', 'mutilated', 'mutilatedly', 'disfigured', 'disfiguredly', 'scarred', 'scarredly', 'blemished', 'blemishedly', 'flawed', 'flawedly', 'defective', 'defectively', 'faulty', 'faultily', 'broken', 'brokenly', 'damaged', 'damagedly', 'ruined', 'ruinedly', 'destroyed', 'destroyedly', 'wrecked', 'wreckedly', 'shattered', 'shatteredly', 'crushed', 'crushedly', 'smashed', 'smashedly', 'pulverized', 'pulverizedly', 'annihilated', 'annihilatedly', 'obliterated', 'obliteratedly', 'eradicated', 'eradicatedly', 'eliminated', 'eliminatedly', 'exterminated', 'exterminatedly', 'extinguished', 'extinguishedly', 'quenched', 'quenchedly', 'suppressed', 'suppressedly', 'repressed', 'repressedly', 'subdued', 'subduedly', 'conquered', 'conqueredly', 'defeated', 'defeatedly', 'overcome', 'overcomely', 'overwhelmed', 'overwhelmedly', 'crushed', 'crushedly', 'smashed', 'smashedly', 'pulverized', 'pulverizedly', 'annihilated', 'annihilatedly', 'obliterated', 'obliteratedly', 'eradicated', 'eradicatedly', 'eliminated', 'eliminatedly', 'exterminated', 'exterminatedly', 'extinguished', 'extinguishedly', 'quenched', 'quenchedly', 'suppressed', 'suppressedly', 'repressed', 'repressedly', 'subdued', 'subduedly', 'conquered', 'conqueredly', 'defeated', 'defeatedly', 'overcome', 'overcomely', 'overwhelmed', 'overwhelmedly']

  const textLower = text.toLowerCase()
  const words = textLower.split(/\s+/)
  
  let positiveCount = 0
  let negativeCount = 0
  
  for (const word of words) {
    if (positiveWords.includes(word)) {
      positiveCount++
    } else if (negativeWords.includes(word)) {
      negativeCount++
    }
  }
  
  if (positiveCount > negativeCount) {
    return 'positive'
  } else if (negativeCount > positiveCount) {
    return 'negative'
  } else {
    return 'neutral'
  }
}

// Mock data generator
function generateMockData(query: string) {
  const mockItems = [
    {
      text: `Interesting discussion about ${query} on Reddit. Many users are sharing their experiences and opinions.`,
      sentiment: 'positive',
      platform: 'reddit',
      created_at: new Date().toISOString(),
      url: 'https://reddit.com'
    },
    {
      text: `New research findings related to ${query} have been published. Scientists are excited about the implications.`,
      sentiment: 'positive',
      platform: 'news',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      url: 'https://news.com'
    },
    {
      text: `Controversial debate about ${query} continues online. Some people are concerned about the direction.`,
      sentiment: 'negative',
      platform: 'reddit',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      url: 'https://reddit.com'
    },
    {
      text: `Technical analysis of ${query} shows mixed results. Experts are divided on the best approach.`,
      sentiment: 'neutral',
      platform: 'news',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      url: 'https://techcrunch.com'
    },
    {
      text: `Community feedback on ${query} has been overwhelmingly positive. Users love the new features.`,
      sentiment: 'positive',
      platform: 'reddit',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      url: 'https://reddit.com'
    }
  ]

  // Analyze sentiment for each item
  const analyzedItems = mockItems.map(item => ({
    ...item,
    sentiment: analyzeSentiment(item.text)
  }))

  // Calculate percentages
  const total = analyzedItems.length
  const positive = analyzedItems.filter(item => item.sentiment === 'positive').length
  const negative = analyzedItems.filter(item => item.sentiment === 'negative').length
  const neutral = analyzedItems.filter(item => item.sentiment === 'neutral').length

  return {
    total_tweets: total,
    positive_percentage: Math.round((positive / total) * 100),
    negative_percentage: Math.round((negative / total) * 100),
    neutral_percentage: Math.round((neutral / total) * 100),
    timeline: {
      time: ['1h ago', '2h ago', '3h ago', '4h ago'],
      positive: [positive, positive - 1, positive - 2, positive - 3],
      negative: [negative, negative + 1, negative + 2, negative + 3],
      neutral: [neutral, neutral, neutral, neutral]
    },
    sample_tweets: analyzedItems,
    platform_breakdown: {
      reddit: 3,
      news: 2
    },
    success: true,
    message: `Analysis complete: ${total} items, ${Math.round((positive / total) * 100)}% positive`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, max_tweets = 100, use_real_data = true } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' })
    }

    console.log(`Starting analysis for query: ${query}`)

    // Generate mock data for now (we'll replace this with real data later)
    const result = generateMockData(query)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Analysis failed', message: errorMessage },
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