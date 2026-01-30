import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// AI CHAT - OpenAI GPT-4o powered with RAG context from sentiment data
// ============================================================================

interface AnalysisResults {
  total_tweets: number
  positive_percentage: number
  negative_percentage: number
  neutral_percentage: number
  query?: string
  sample_tweets?: Array<{
    text: string
    sentiment: string
    platform: string
    source: string
    created_at?: string
    title?: string
  }>
  platform_breakdown?: Record<string, number>
  timeline?: {
    time: string[]
    positive: number[]
    negative: number[]
    neutral: number[]
  }
}

// Build context from the analyzed data for RAG
function buildRAGContext(analysisResults: AnalysisResults): string {
  const {
    total_tweets,
    positive_percentage,
    negative_percentage,
    neutral_percentage,
    query,
    sample_tweets = [],
    platform_breakdown = {},
    timeline
  } = analysisResults

  let context = `## Sentiment Analysis Data for "${query || 'unknown topic'}"\n\n`

  // Summary stats
  context += `### Overview\n`
  context += `- Total items analyzed: ${total_tweets}\n`
  context += `- Positive sentiment: ${positive_percentage}%\n`
  context += `- Negative sentiment: ${negative_percentage}%\n`
  context += `- Neutral sentiment: ${neutral_percentage}%\n\n`

  // Platform breakdown
  const platforms = Object.entries(platform_breakdown)
  if (platforms.length > 0) {
    context += `### Data Sources\n`
    platforms.forEach(([platform, count]) => {
      context += `- ${platform}: ${count} items\n`
    })
    context += '\n'
  }

  // Timeline data
  if (timeline && timeline.time.length > 0) {
    context += `### Recent Trends\n`
    timeline.time.forEach((time, i) => {
      context += `- ${time}: ${timeline.positive[i]}% positive, ${timeline.negative[i]}% negative, ${timeline.neutral[i]}% neutral\n`
    })
    context += '\n'
  }

  // Sample content (limit to 10 for context window)
  const samples = sample_tweets.slice(0, 10)
  if (samples.length > 0) {
    context += `### Sample Content (${samples.length} of ${sample_tweets.length} items)\n`
    samples.forEach((item, i) => {
      const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'unknown date'
      context += `\n${i + 1}. [${item.sentiment.toUpperCase()}] from ${item.source} (${date}):\n`
      context += `"${item.text.substring(0, 200)}${item.text.length > 200 ? '...' : ''}"\n`
    })
  }

  return context
}

// Call OpenAI API
async function callOpenAI(
  userMessage: string,
  ragContext: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Fallback to intelligent pattern matching if no API key
    return generateFallbackResponse(userMessage, ragContext)
  }

  const systemPrompt = `You are Sentimental AI, an intelligent assistant specialized in sentiment analysis and social media insights. You help users understand sentiment data, trends, and public opinion.

You have access to real-time sentiment analysis data that was just collected. Use this data to provide specific, actionable insights. Be conversational, friendly, and helpful.

When discussing the data:
- Reference specific numbers and percentages
- Mention the sources and platforms the data comes from
- Highlight interesting patterns or outliers
- Provide context and interpretation
- Give recommendations when appropriate

If the user asks about something not in the data, acknowledge that and suggest what you can help with based on the available analysis.

Here is the sentiment analysis data you have access to:

${ragContext}

Remember: Be conversational like ChatGPT. Don't be robotic. Engage naturally and provide valuable insights.`

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
      { role: 'user', content: userMessage }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', error)
      return generateFallbackResponse(userMessage, ragContext)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || generateFallbackResponse(userMessage, ragContext)

  } catch (error) {
    console.error('OpenAI call failed:', error)
    return generateFallbackResponse(userMessage, ragContext)
  }
}

// Fallback response generator when API is not available
function generateFallbackResponse(message: string, context: string): string {
  const messageLower = message.toLowerCase()

  // Extract key data from context
  const totalMatch = context.match(/Total items analyzed: (\d+)/)
  const positiveMatch = context.match(/Positive sentiment: (\d+)%/)
  const negativeMatch = context.match(/Negative sentiment: (\d+)%/)
  const neutralMatch = context.match(/Neutral sentiment: (\d+)%/)
  const queryMatch = context.match(/Sentiment Analysis Data for "([^"]+)"/)

  const total = totalMatch ? totalMatch[1] : '0'
  const positive = positiveMatch ? positiveMatch[1] : '0'
  const negative = negativeMatch ? negativeMatch[1] : '0'
  const neutral = neutralMatch ? neutralMatch[1] : '0'
  const topic = queryMatch ? queryMatch[1] : 'this topic'

  // Greetings
  if (messageLower.match(/^(hi|hello|hey|sup|yo|what'?s up)/)) {
    return `Hey! 👋 I've got the sentiment analysis data for "${topic}" ready. We analyzed ${total} items and found ${positive}% positive, ${negative}% negative, and ${neutral}% neutral sentiment. What would you like to know about it?`
  }

  // Summary requests
  if (messageLower.includes('summary') || messageLower.includes('overview') || messageLower.includes('tell me about')) {
    return `Here's what I found about "${topic}":

📊 **Quick Stats:**
- ${total} items analyzed from multiple sources
- ${positive}% positive sentiment
- ${negative}% negative sentiment
- ${neutral}% neutral sentiment

${parseInt(positive) > parseInt(negative)
  ? `Overall, the sentiment is leaning positive! People seem to have favorable opinions.`
  : parseInt(negative) > parseInt(positive)
  ? `There's notable negative sentiment here. Might be worth looking into what's driving the criticism.`
  : `The sentiment is pretty balanced, showing mixed or neutral opinions on the topic.`}

Want me to dive deeper into any specific aspect?`
  }

  // Trend questions
  if (messageLower.includes('trend') || messageLower.includes('changing') || messageLower.includes('over time')) {
    return `Based on the recent data for "${topic}":

The current sentiment breakdown is ${positive}% positive, ${negative}% negative, and ${neutral}% neutral across ${total} items.

To track trends over time, I'd recommend running this analysis periodically. The timeline data shows how sentiment is distributed across recent days, but for long-term trends, you'd want to compare multiple analysis runs.

Would you like me to explain what might be driving the current sentiment?`
  }

  // Why/cause questions
  if (messageLower.includes('why') || messageLower.includes('reason') || messageLower.includes('cause')) {
    return `Looking at the data for "${topic}", here's what might be driving the sentiment:

${parseInt(positive) > 30 ? `**Positive factors:** Content showing enthusiasm, success stories, or favorable developments. The ${positive}% positive sentiment suggests people are responding well to something.\n\n` : ''}${parseInt(negative) > 30 ? `**Negative factors:** There may be criticism, concerns, or unfavorable news driving the ${negative}% negative sentiment.\n\n` : ''}${parseInt(neutral) > 50 ? `**Neutral content:** With ${neutral}% neutral, there's a lot of factual reporting or balanced discussion happening.\n\n` : ''}

To get more specific, I'd need to look at the individual items. Would you like me to highlight some examples?`
  }

  // Platform/source questions
  if (messageLower.includes('source') || messageLower.includes('platform') || messageLower.includes('where')) {
    const sourcesMatch = context.match(/### Data Sources\n([\s\S]*?)(?=\n###|$)/)
    const sources = sourcesMatch ? sourcesMatch[1].trim() : 'Multiple sources including social media and news'

    return `The data for "${topic}" comes from:\n\n${sources}\n\nDifferent platforms often show different sentiment patterns. Social media tends to be more polarized, while news sources are usually more neutral. Want me to break down the sentiment by platform?`
  }

  // Recommendation questions
  if (messageLower.includes('recommend') || messageLower.includes('should') || messageLower.includes('suggest') || messageLower.includes('advice')) {
    if (parseInt(positive) > 60) {
      return `With ${positive}% positive sentiment for "${topic}", here's what I'd suggest:

✅ **Capitalize on the positivity** - This is a good time to engage with your audience
✅ **Amplify positive content** - Share and highlight what's resonating
✅ **Keep monitoring** - Good sentiment can shift, so stay aware

The overall vibe is favorable! Is there a specific aspect you'd like advice on?`
    } else if (parseInt(negative) > 40) {
      return `With ${negative}% negative sentiment for "${topic}", here are some recommendations:

⚠️ **Investigate the concerns** - Look at what's driving negativity
⚠️ **Prepare responses** - Have messaging ready to address criticism
⚠️ **Monitor closely** - Track if sentiment is improving or worsening

Would you like me to identify specific themes in the negative content?`
    } else {
      return `With balanced sentiment (${positive}% positive, ${negative}% negative) for "${topic}":

💡 **Engage in discussions** - Mixed sentiment means active debate
💡 **Address concerns proactively** - Don't let negative sentiment grow
💡 **Amplify positive voices** - Help favorable content get more visibility

What specific situation are you dealing with? I can give more targeted advice.`
    }
  }

  // Default helpful response
  return `Based on the analysis of "${topic}" (${total} items):

📈 **Sentiment:** ${positive}% positive, ${negative}% negative, ${neutral}% neutral

I can help you with:
- Understanding what's driving the sentiment
- Comparing sentiment across different sources
- Getting recommendations based on the data
- Finding specific examples or patterns

What would you like to explore?`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, analysis_results, conversation_history = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required', response: 'Please provide a message.' },
        { status: 400 }
      )
    }

    if (!analysis_results) {
      return NextResponse.json({
        response: "I don't have any analysis data yet! Run a sentiment analysis first by entering a search query and clicking 'Analyze'. Then I can help you understand the results and provide insights. 🔍"
      })
    }

    // Build RAG context from the analysis data
    const ragContext = buildRAGContext(analysis_results)

    // Call OpenAI with the context
    const response = await callOpenAI(message, ragContext, conversation_history)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({
      response: "Oops, something went wrong on my end. Could you try asking that again? 🤔"
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
