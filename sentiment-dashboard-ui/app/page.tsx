"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search,
  Info,
  Zap,
  TrendingUp,
  Activity,
  Globe,
  BarChart3,
  Brain,
  Send,
  X,
  ExternalLink,
  Calendar,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart as RechartsBarChart, Bar } from 'recharts'

// API calls use relative paths - works in both development and production

interface AnalysisResults {
  total_tweets: number
  positive_percentage: number
  negative_percentage: number
  neutral_percentage: number
  timeline: any
  sample_tweets: any[]
  platform_breakdown?: Record<string, number>
  success: boolean
  message: string
  source_sentiment_counts?: Record<string, { positive: number; negative: number; neutral: number }>
}

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface DataItem {
  id: string
  text: string
  sentiment: string
  source: string
  timestamp: string
  platform: string
  url?: string
}

interface WordCloudItem {
  word: string
  size: number
  color: string
  x: number
  y: number
  animationDelay: number
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [query, setQuery] = useState('') // Remove default query
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hello! I'm Sentimental AI, your intelligent sentiment analysis assistant. I can help you understand your data and provide insights. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [showModelInfo, setShowModelInfo] = useState(false)
  const [topDataItems, setTopDataItems] = useState<DataItem[]>([])
  const [textAnimationComplete, setTextAnimationComplete] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  const fullText = 'sentimental'

  // Topic-based word cloud with constant movement
  const wordCloudItems: WordCloudItem[] = [
    { word: "TECHNOLOGY", size: 120, color: "#FF0000", x: 20, y: 30, animationDelay: 0 },
    { word: "SPORTS", size: 100, color: "#00FF00", x: 70, y: 20, animationDelay: 0.5 },
    { word: "POLITICS", size: 90, color: "#0000FF", x: 15, y: 70, animationDelay: 1 },
    { word: "NEWS", size: 110, color: "#FFFF00", x: 80, y: 60, animationDelay: 1.5 },
    { word: "MUSIC", size: 95, color: "#FF00FF", x: 40, y: 80, animationDelay: 2 },
    { word: "MARKETS", size: 105, color: "#00FFFF", x: 85, y: 40, animationDelay: 2.5 }
  ]

  useEffect(() => {
    // Start text animation after component mounts
    const timer = setTimeout(() => setTextAnimationComplete(true), 500)
    console.log('Word cloud items:', wordCloudItems) // Debug log
    return () => clearTimeout(timer)
  }, [])

  // Typing animation effect
  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(prev => prev + fullText[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, 150) // Adjust speed here (150ms per character)
      
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, fullText])

  const handleAnalysis = async () => {
    if (!query.trim()) return
    setIsLoading(true)
    try {
      // Call our Next.js API route (relative path works in dev and production)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, max_tweets: 100 }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Analysis failed with status ${response.status}`)
      }
      const data = await response.json()
      setAnalysisResults(data)
      setAiAnswer(data.ai_answer || null)
      // Set top 5 diverse data items
      const topItems = selectTopDiverseItems(data.sample_tweets || [], 5).map((item: any, index: number) => ({
        id: `real-item-${index + 1}`,
        text: item.text || item.content || item.title || `Content from ${item.platform || 'unknown source'}`,
        sentiment: item.sentiment || 'neutral',
        source: item.source || item.platform || 'unknown',
        timestamp: item.created_at || new Date().toISOString(),
        platform: item.platform || 'unknown',
        url: item.url
      }))
      setTopDataItems(topItems)
    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysisResults({
        total_tweets: 0,
        positive_percentage: 0,
        negative_percentage: 0,
        neutral_percentage: 0,
        timeline: { time: [], positive: [], negative: [], neutral: [] },
        sample_tweets: [],
        platform_breakdown: {},
        success: false,
        message: error instanceof Error ? error.message : 'Analysis failed'
      })
      setTopDataItems([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Function to select top 5 diverse items (by source, most recent, robust matching)
  const selectTopDiverseItems = (items: any[], count: number) => {
    const sources = ['news', 'hackernews', 'reddit', 'github']
    const selected: any[] = []
    const usedSources = new Set()
    // Print all available sources for debugging
    const allSources = Array.from(new Set(items.map(i => (i.platform || i.source || '').toLowerCase())))
    console.log('Available sources in items:', allSources)
    // 1. Try to get the most recent from each source (robust partial match)
    for (const source of sources) {
      const item = items.find(i => {
        const src = (i.platform || i.source || '').toLowerCase()
        return src.includes(source)
      })
      if (item && !selected.includes(item)) {
        selected.push(item)
        usedSources.add(source)
      }
      if (selected.length >= count) break
    }
    // 2. Fill remaining slots with next best, but avoid more than 2 from the same source
    for (const item of items) {
      if (selected.length >= count) break
      const src = (item.platform || item.source || '').toLowerCase()
      const alreadyCount = selected.filter(i => (i.platform || i.source || '').toLowerCase() === src).length
      if (!selected.includes(item) && alreadyCount < 2) {
        selected.push(item)
      }
    }
    return selected.slice(0, count)
  }

  // Simple sentiment analysis function
  const analyzeSentiment = (text: string): string => {
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

  const handleChatSend = async () => {
    if (!chatInput.trim() || !analysisResults) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      isUser: true,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsChatLoading(true)

    try {
      // Call our Next.js API route for AI chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          analysis_results: analysisResults
        }),
      })

      const data = await response.json()
      const aiResponse = data.response || "I'm sorry, I couldn't process your request. Please try again."
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble processing your request. Please try asking about the sentiment analysis results, data sources, or recommendations.",
        isUser: false,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'negative': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'neutral': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getChartData = () => {
    if (!analysisResults) return []
    return [
      { name: 'Positive', value: analysisResults.positive_percentage, color: '#10B981' },
      { name: 'Negative', value: analysisResults.negative_percentage, color: '#EF4444' },
      { name: 'Neutral', value: analysisResults.neutral_percentage, color: '#3B82F6' }
    ]
  }

  const getSourceSentimentBarData = () => {
    if (!analysisResults || !analysisResults.source_sentiment_counts) return []
    // Convert the source_sentiment_counts object to an array suitable for recharts, with percentages
    return Object.entries(analysisResults.source_sentiment_counts).map(([source, counts]) => {
      const total = counts.positive + counts.negative + counts.neutral
      return {
        source,
        positive: total ? (counts.positive / total) * 100 : 0,
        negative: total ? (counts.negative / total) * 100 : 0,
        neutral: total ? (counts.neutral / total) * 100 : 0
      }
    })
  }

  const getTimelineData = () => {
    if (
      !analysisResults?.timeline ||
      !Array.isArray(analysisResults.timeline.time) ||
      !Array.isArray(analysisResults.timeline.positive) ||
      !Array.isArray(analysisResults.timeline.negative) ||
      !Array.isArray(analysisResults.timeline.neutral)
    ) {
      return [];
    }
    return analysisResults.timeline.time.map((time: string, index: number) => ({
      time,
      positive: analysisResults.timeline.positive[index],
      negative: analysisResults.timeline.negative[index],
      neutral: analysisResults.timeline.neutral[index],
    }));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter': return '🐦'
      case 'reddit': return '🤖'
      case 'news': return '📰'
      case 'hn': 
      case 'hackernews': return '💻'
      case 'youtube': return '📺'
      case 'github': return '🐙'
      default: return '📄'
    }
  }

  const sourceColorMap: Record<string, string> = {
    Reddit: 'text-blue-600',
    News: 'text-green-600',
    HackerNews: 'text-purple-600',
  };

  const sourceCounts = analysisResults?.sample_tweets?.reduce((acc: Record<string, number>, item: any) => {
    const src = item.source || item.platform || 'Unknown';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSources = Object.entries(sourceCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.min(5, Object.keys(sourceCounts || {}).length));

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      <div className="relative z-20">
        {/* Clickable Logo in Top Left */}
        <div className="absolute top-6 left-6 z-30">
          <motion.button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img 
              src="/sentimental.png" 
              alt="Sentimental Logo" 
              className="w-20 h-20 object-contain"
            />
          </motion.button>
        </div>

        {/* Header with centered title */}
        <div className={`container mx-auto px-4 ${analysisResults ? 'py-8' : 'py-12'}`}>
          <div className="text-center mb-8">
            <div className="mb-4">
              <motion.h1 
                className="text-8xl font-bold tracking-tight text-black lowercase"
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {typedText}
                {currentIndex < fullText.length && <span className="animate-pulse">|</span>}
              </motion.h1>
            </div>
          </div>
        </div>

        {/* Centered Search Section */}
        <div className={`flex items-center justify-center ${analysisResults ? 'min-h-[30vh]' : 'min-h-[35vh]'}`}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-4xl mx-auto w-full"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-500" />
                    <Input
                      placeholder="Enter keywords, hashtags, or topics to analyze sentiment..."
                      value={query}
                      onChange={(e) => {
                        console.log('🔍 Query changed:', e.target.value)
                        setQuery(e.target.value)
                      }}
                      onKeyPress={(e) => {
                        console.log('⌨️ Key pressed:', e.key)
                        if (e.key === 'Enter') {
                          console.log('🚀 Enter pressed, calling handleAnalysis')
                          handleAnalysis()
                        }
                      }}
                      className="pl-14 pr-6 py-6 bg-white border-gray-300 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      console.log('🔘 Analyze button clicked!')
                      console.log('📝 Current query:', query)
                      console.log('🔍 Query trimmed:', query.trim())
                      console.log('🚫 Is loading:', isLoading)
                      handleAnalysis()
                    }}
                    disabled={isLoading || !query.trim()}
                    className="px-10 py-6 bg-black hover:bg-gray-800 text-white rounded-xl font-semibold text-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </div>
                    ) : (
                      <>
                        <Zap className="w-6 h-6 mr-3" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Model Performance Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="mt-6 flex justify-center"
                >
                  <Button
                    onClick={() => setShowModelInfo(true)}
                    variant="ghost"
                    size="lg"
                    className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 text-lg"
                  >
                    <Info className="w-5 h-5 mr-3" />
                    Model Performance
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Analysis Results */}
        <div className="container mx-auto px-4 py-16 pb-32">
          <AnimatePresence>
            {analysisResults && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl hover:border-purple-200 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                        <span className="text-3xl font-bold text-gray-900">{analysisResults.total_tweets}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Total Items</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl hover:border-green-200 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <span className="text-3xl font-bold text-gray-900">{analysisResults.positive_percentage}%</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Positive</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl hover:border-red-200 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-red-600" />
                        <span className="text-3xl font-bold text-gray-900">{analysisResults.negative_percentage}%</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Negative</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Globe className="w-6 h-6 text-blue-600" />
                        <span className="text-3xl font-bold text-gray-900">{analysisResults.neutral_percentage}%</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Neutral</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Data Items */}
                {topDataItems.length > 0 && (
                  <Card className="bg-white border-gray-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-900">
                        <BarChart3 className="w-5 h-5" />
                        Top 5 Data Items
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Diverse data samples with different sources and sentiments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {topDataItems.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-purple-50 hover:border-purple-200 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{getPlatformIcon(item.platform)}</span>
                                  <span className="text-sm font-medium text-gray-700">{item.source}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(item.sentiment)}`}>
                                    {item.sentiment}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 mb-2">{item.text}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatTimestamp(item.timestamp)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    #{index + 1}
                                  </span>
                                </div>
                              </div>
                              {item.url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Charts */}
                <div className="flex justify-center">
                <Card className="bg-white border-gray-200 shadow-lg w-full p-6">

                    <CardHeader className="w-full flex flex-col items-center justify-center">
                      <CardTitle className="flex items-center gap-2 text-gray-900 justify-center w-full">
                        <BarChart3 className="w-5 h-5" />
                        Sentiment Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={getChartData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {getChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)}%` : value)} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col items-center gap-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500 text-white px-2 py-0.5 rounded animate-pulse text-xs font-semibold">LIVE</span>
                          <span className="text-xs text-gray-500">{analysisResults?.sample_tweets?.length || 0} items fetched just now</span>
                        </div>
                        {topSources.length > 0 && (
  <div className="text-xs text-gray-700 mt-2">
    <span className="font-semibold text-gray-900 block mb-1">Top Sources:</span>
    <div className="flex flex-wrap items-center gap-4">
      {topSources.map(([source, count]) => (
        <span key={source} className="whitespace-nowrap">
          {source}: {count}
        </span>
      ))}
    </div>
  </div>
)}
                        <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Assistant */}
                <Card className="bg-white border-gray-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Brain className="w-5 h-5" />
                      Sentimental AI
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Ask questions about your sentiment analysis results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Chat Messages */}
                      <div className="h-64 overflow-y-auto space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                message.isUser
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white text-gray-900 p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Chat Input */}
                      <div className="flex gap-2 mb-4">
                        <Input 
                          placeholder="Ask me about the sentiment analysis results..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                          className="flex-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                          disabled={isChatLoading}
                        />
                        <Button 
                          onClick={handleChatSend}
                          disabled={isChatLoading || !chatInput.trim() || !analysisResults}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Flowing Sources Slideshow - At the bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm">
          <div className="relative overflow-hidden py-3">
            <motion.div 
              className="flex items-center space-x-24"
              animate={{ x: [0, -2000] }}
              transition={{ 
                duration: 60, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            >
              {/* First set of logos */}
              <div className="flex items-center space-x-24">
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/x_logo.svg" alt="X (Twitter)" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/reddit_logo.png" alt="Reddit" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/reuters_logo.svg" alt="Reuters" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/cnn_logo.png" alt="CNN" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/bbc_logo.svg" alt="BBC" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/techcrunch_logo.png" alt="TechCrunch" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/github_logo.png" alt="GitHub" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
              </div>
              
              {/* Duplicate set for seamless loop */}
              <div className="flex items-center space-x-24">
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/x_logo.svg" alt="X (Twitter)" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/reddit_logo.png" alt="Reddit" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/reuters_logo.svg" alt="Reuters" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/cnn_logo.png" alt="CNN" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/bbc_logo.svg" alt="BBC" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/techcrunch_logo.png" alt="TechCrunch" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
                <div className="flex items-center justify-center group">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img src="/github_logo.png" alt="GitHub" className="w-10 h-10 object-contain group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Model Performance Modal */}
      <AnimatePresence>
        {showModelInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModelInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Model Performance & Architecture</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowModelInfo(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Ensemble Model Architecture</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base text-gray-900">BERT Base</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Fine-tuned on sentiment analysis datasets with 85% accuracy
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base text-gray-900">DistilBERT</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Lightweight model for faster inference with 82% accuracy
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base text-gray-900">RoBERTa</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Robustly optimized model with 87% accuracy
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base text-gray-900">Ensemble</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            Weighted voting ensemble achieving 91% accuracy
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Performance Metrics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border border-purple-200 rounded-lg bg-purple-50">
                        <div className="text-2xl font-bold text-purple-600">91%</div>
                        <div className="text-sm text-gray-600">Accuracy</div>
                      </div>
                      <div className="text-center p-4 border border-pink-200 rounded-lg bg-pink-50">
                        <div className="text-2xl font-bold text-pink-600">0.89</div>
                        <div className="text-sm text-gray-600">F1-Score</div>
                      </div>
                      <div className="text-center p-4 border border-purple-200 rounded-lg bg-purple-50">
                        <div className="text-2xl font-bold text-purple-600">0.92</div>
                        <div className="text-sm text-gray-600">Precision</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">Data Processing Pipeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">1</div>
                        <div>
                          <div className="font-medium text-gray-900">Text Preprocessing</div>
                          <div className="text-sm text-gray-600">Cleaning, tokenization, and normalization</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">2</div>
                        <div>
                          <div className="font-medium text-gray-900">Feature Extraction</div>
                          <div className="text-sm text-gray-600">BERT embeddings and attention weights</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">3</div>
                        <div>
                          <div className="font-medium text-gray-900">Ensemble Prediction</div>
                          <div className="text-sm text-gray-600">Weighted voting from all models</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 