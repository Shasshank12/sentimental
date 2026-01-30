import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// AI CHAT - Intelligent responses based on sentiment analysis context
// ============================================================================

interface AnalysisResults {
  total_tweets: number
  positive_percentage: number
  negative_percentage: number
  neutral_percentage: number
  sample_tweets?: Array<{
    text: string
    sentiment: string
    platform: string
    source: string
  }>
  platform_breakdown?: Record<string, number>
}

// Determine the type of question being asked
function classifyQuestion(message: string): string {
  const messageLower = message.toLowerCase()

  if (messageLower.includes('trend') || messageLower.includes('over time') || messageLower.includes('change')) {
    return 'trends'
  }
  if (messageLower.includes('compare') || messageLower.includes('versus') || messageLower.includes('vs')) {
    return 'comparison'
  }
  if (messageLower.includes('why') || messageLower.includes('cause') || messageLower.includes('reason')) {
    return 'causes'
  }
  if (messageLower.includes('impact') || messageLower.includes('effect') || messageLower.includes('affect')) {
    return 'impact'
  }
  if (messageLower.includes('recommend') || messageLower.includes('suggest') || messageLower.includes('should')) {
    return 'recommendations'
  }
  if (messageLower.includes('predict') || messageLower.includes('future') || messageLower.includes('expect')) {
    return 'predictions'
  }
  if (messageLower.includes('source') || messageLower.includes('platform') || messageLower.includes('where')) {
    return 'sources'
  }
  if (messageLower.includes('positive') || messageLower.includes('negative') || messageLower.includes('neutral')) {
    return 'sentiment_detail'
  }
  if (messageLower.includes('sample') || messageLower.includes('example') || messageLower.includes('show me')) {
    return 'examples'
  }
  if (messageLower.includes('summary') || messageLower.includes('overall') || messageLower.includes('general')) {
    return 'summary'
  }

  return 'general'
}

// Generate contextual AI response based on question type and data
function generateResponse(
  message: string,
  analysisResults: AnalysisResults
): string {
  const questionType = classifyQuestion(message)
  const {
    total_tweets,
    positive_percentage,
    negative_percentage,
    neutral_percentage,
    sample_tweets = [],
    platform_breakdown = {}
  } = analysisResults

  // Determine dominant sentiment
  const dominantSentiment = positive_percentage > negative_percentage
    ? (positive_percentage > neutral_percentage ? 'positive' : 'neutral')
    : (negative_percentage > neutral_percentage ? 'negative' : 'neutral')

  // Get top platforms
  const topPlatforms = Object.entries(platform_breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([platform]) => platform)

  switch (questionType) {
    case 'trends':
      return `Based on the current analysis of ${total_tweets} items, the sentiment is ${dominantSentiment} with ${positive_percentage}% positive, ${negative_percentage}% negative, and ${neutral_percentage}% neutral.

While I don't have historical data to show long-term trends, the current snapshot suggests ${
        positive_percentage > 60 ? 'strong positive momentum' :
        negative_percentage > 60 ? 'concerning negative sentiment that may warrant attention' :
        'a balanced discussion with mixed perspectives'
      }.

For trend analysis, I recommend running this analysis periodically to track how sentiment changes over time.`

    case 'comparison':
      if (topPlatforms.length > 1) {
        const platformDetails = topPlatforms.map(p => {
          const count = platform_breakdown[p]
          return `${p}: ${count} items`
        }).join(', ')

        return `Here's a comparison across platforms:

${platformDetails}

${topPlatforms[0]} is the most active source with ${platform_breakdown[topPlatforms[0]]} items. Different platforms often show varying sentiment due to their unique audiences and content styles.

Reddit tends to have more polarized opinions, while news sources are typically more neutral. HackerNews often reflects tech-savvy perspectives.`
      }
      return `The data comes primarily from ${topPlatforms[0] || 'various sources'}. To compare sentiment across different platforms, try searching for topics that are discussed across multiple communities.`

    case 'causes':
      const samplePositive = sample_tweets.find(t => t.sentiment === 'positive')
      const sampleNegative = sample_tweets.find(t => t.sentiment === 'negative')

      return `Based on the analyzed content, here are potential factors driving sentiment:

${positive_percentage > 40 ? `**Positive drivers:** Content showing enthusiasm, success stories, or favorable developments. ${samplePositive ? `Example: "${samplePositive.text.substring(0, 100)}..."` : ''}` : ''}

${negative_percentage > 40 ? `**Negative drivers:** Content expressing concerns, criticism, or unfavorable news. ${sampleNegative ? `Example: "${sampleNegative.text.substring(0, 100)}..."` : ''}` : ''}

${neutral_percentage > 40 ? '**Neutral factors:** Factual reporting, balanced discussions, and informational content contribute to neutral sentiment.' : ''}

For deeper analysis, review the sample items to understand specific themes driving each sentiment category.`

    case 'impact':
      return `The current sentiment distribution (${positive_percentage}% positive, ${negative_percentage}% negative, ${neutral_percentage}% neutral) across ${total_tweets} items suggests:

${positive_percentage > 60 ?
        '**Positive impact:** Favorable public perception, which can support brand reputation, drive engagement, and create opportunities for positive narratives.' :
        negative_percentage > 60 ?
        '**Concerning impact:** Negative sentiment may indicate risks to reputation, customer satisfaction concerns, or emerging issues that need addressing.' :
        '**Mixed impact:** Balanced sentiment suggests the topic is under active debate. This presents both opportunities to amplify positive narratives and challenges in managing diverse perspectives.'}

Monitor sentiment shifts to stay ahead of potential reputation risks or capitalize on positive momentum.`

    case 'recommendations':
      if (positive_percentage > 60) {
        return `With ${positive_percentage}% positive sentiment, here are my recommendations:

1. **Amplify the positivity** - Share and highlight positive content to build momentum
2. **Engage with supporters** - Respond to positive mentions to strengthen relationships
3. **Document success factors** - Understand what's driving positive sentiment
4. **Monitor for shifts** - Continue tracking to catch any sentiment changes early

This is a favorable time for engagement and promotion.`
      } else if (negative_percentage > 60) {
        return `With ${negative_percentage}% negative sentiment, here are my recommendations:

1. **Investigate root causes** - Review negative content to understand specific concerns
2. **Prepare responses** - Develop messaging to address common criticisms
3. **Monitor closely** - Track sentiment frequently to catch escalations
4. **Engage thoughtfully** - Consider responding to legitimate concerns constructively

Proactive communication can help turn sentiment around.`
      } else {
        return `With balanced sentiment (${positive_percentage}% positive, ${negative_percentage}% negative, ${neutral_percentage}% neutral), here are my recommendations:

1. **Focus on positive narratives** - Amplify content that resonates well
2. **Address concerns proactively** - Don't let negative sentiment grow unchecked
3. **Engage in discussions** - The balanced sentiment suggests active debate - participate constructively
4. **Regular monitoring** - Track sentiment to spot emerging trends

A balanced approach to engagement will help maintain positive momentum.`
      }

    case 'predictions':
      return `Based on current data (${total_tweets} items), I can offer some observations, though predicting future sentiment is inherently uncertain:

**Current state:** ${dominantSentiment} sentiment is dominant at ${Math.max(positive_percentage, negative_percentage, neutral_percentage)}%

**Short-term outlook:** ${
        positive_percentage > 60 ? 'Positive momentum often persists if underlying factors remain favorable.' :
        negative_percentage > 60 ? 'Negative sentiment may intensify or subside depending on how concerns are addressed.' :
        'Mixed sentiment can shift either direction based on news, events, or community discussions.'
      }

**Recommendation:** Run this analysis regularly to track actual trends rather than relying on predictions. Real-time monitoring provides the most accurate picture.`

    case 'sources':
      const sourceList = Object.entries(platform_breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => `- **${source}**: ${count} items`)
        .join('\n')

      return `Here's the breakdown of sources in this analysis:

${sourceList}

**Total:** ${total_tweets} items

${topPlatforms[0] === 'reddit' ? 'Reddit provides diverse community perspectives.' :
  topPlatforms[0] === 'hackernews' ? 'HackerNews offers tech-savvy viewpoints.' :
  topPlatforms[0] === 'news' ? 'News sources provide journalistic coverage.' :
  topPlatforms[0] === 'github' ? 'GitHub shows developer interest and activity.' :
  'Multiple sources provide a comprehensive view.'}

Each platform has its own audience and content style, contributing different perspectives to the overall sentiment.`

    case 'sentiment_detail':
      return `Here's the detailed sentiment breakdown:

**Positive (${positive_percentage}%):** ${Math.round(total_tweets * positive_percentage / 100)} items
Content expressing enthusiasm, support, optimism, or favorable opinions.

**Negative (${negative_percentage}%):** ${Math.round(total_tweets * negative_percentage / 100)} items
Content expressing criticism, concern, disappointment, or unfavorable opinions.

**Neutral (${neutral_percentage}%):** ${Math.round(total_tweets * neutral_percentage / 100)} items
Factual content, balanced discussions, or items without clear sentiment.

The analysis uses keyword-based sentiment detection with intensity modifiers and negation handling for accuracy.`

    case 'examples':
      const examples = sample_tweets.slice(0, 3)
      if (examples.length === 0) {
        return `No sample items are available for this analysis. Try running a new search to get fresh data.`
      }

      const exampleText = examples.map((item, i) =>
        `${i + 1}. **[${item.sentiment.toUpperCase()}]** from ${item.source}:\n"${item.text.substring(0, 150)}${item.text.length > 150 ? '...' : ''}"`
      ).join('\n\n')

      return `Here are some example items from the analysis:\n\n${exampleText}\n\nThese examples illustrate the types of content driving overall sentiment.`

    case 'summary':
    default:
      return `**Sentiment Analysis Summary**

Based on ${total_tweets} items from ${Object.keys(platform_breakdown).length} sources:

- **Positive:** ${positive_percentage}%
- **Negative:** ${negative_percentage}%
- **Neutral:** ${neutral_percentage}%

**Key Insight:** ${
        positive_percentage > 60 ? 'Strong positive sentiment indicates favorable public perception.' :
        negative_percentage > 60 ? 'Notable negative sentiment suggests concerns that may need attention.' :
        'Balanced sentiment reflects diverse viewpoints and active discussion.'
      }

**Top Sources:** ${topPlatforms.join(', ') || 'Various platforms'}

Feel free to ask me specific questions about:
- Trends and changes
- Platform comparisons
- Causes of sentiment
- Recommendations
- Specific examples`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, analysis_results } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required', response: 'Please provide a message to analyze.' },
        { status: 400 }
      )
    }

    if (!analysis_results) {
      return NextResponse.json({
        response: "I don't have any analysis data to discuss yet. Please run a sentiment analysis first by entering a search query and clicking 'Analyze'. Then I can help you understand the results!"
      })
    }

    // Generate contextual response
    const response = generateResponse(message, analysis_results)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({
      response: "I apologize, but I encountered an error processing your request. Please try again or rephrase your question."
    })
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
