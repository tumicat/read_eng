// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

function getCurrentMonday () {
  let td = new Date()
  td.setHours(0, 0, 0, 0)
  let day = td.getDay()
  let diff = td.getDate() - day + (day == 0 ? - 6 : 1)
  return {
    monday: new Date(td.setDate(diff)),
    td_day: day
  }
}

function getDateString (dt) {
  return dt.getFullYear() + '-'
    + dt.getMonth() + '-'
    + dt.getDate() + '-'
    + dt.getHours() + '-'
    + dt.getMinutes() + '-'
    + dt.getSeconds()
}

function getWeeklyStats (read_hist_data) {
  // mark stars
  let last_d = -1
  let count_d = 0

  for (const dt of read_hist_data) {
    let d = new Date(dt.date).getDay()

    if (last_d !== d) {      
      count_d = count_d + 1
      last_d = d
    }
  }

  let score = 0
  let tot_score = 0

  if (read_hist_data.length > 0) {
    for (let i = 0; i < read_hist_data.length; i++) {
      tot_score = tot_score + read_hist_data[i].score
    }

    score = Math.round(tot_score / read_hist_data.length)
  }

  return {
    week_read_num: count_d,
    num_articles: read_hist_data.length,
    articles: read_hist_data.map(x => x.article_id),
    avg_scores: score
  }
}

// 云函数入口函数
// the function takes openid
// {
//   openid: string
// }
// returns the show page stats
exports.main = async (event, context) => {
  const openid = event.openid
  const monday = getCurrentMonday()
  const mondayStr = getDateString(monday.monday)

  // get the weekly read stats
  const res = await cloud.callFunction({
    name: 'getWeekly',
    data: {
      openid: openid,
      start_date: mondayStr
    }
  })

  // summarise the weekly days
  const weeklyData = res.result.data
  const weeklyStats = getWeeklyStats(weeklyData)

  // summrize the additional weekly stats
  const max_limit = 100
  const totalArticles = weeklyStats.num_articles

  const batchTimes = Math.ceil(totalArticles / max_limit)

  const tasks = []
  for (let i = 0; i < batchTimes; i++) {
    const promise = db.collection('article').where({
      article_id: _.in(weeklyStats.articles)
    }).skip(i * max_limit).limit(max_limit).get()

    tasks.push(promise)
  }

  const articlesRes = await Promise.all(tasks)

  let articles = []
  for (let i = 0; i < batchTimes; i++) {
    articles = articles.concat(articlesRes[i].data)
  }

  let numWords = 0
  let numQuestions = 0

  for (let i = 0; i < articles.length; i++) {
    numWords = numWords + articles[i].num_words
    numQuestions = numQuestions + articles[i].num_questions
  }

  // get the user info
  const userRes = await db.collection('account').where({
    _openid: openid
  }).get()

  const userInfo = userRes.data[0]

  return {
    event, 
    numDays: weeklyStats.week_read_num, 
    numArticles: weeklyStats.num_articles, 
    numWords, 
    numQuestions,
    avgScores: weeklyStats.avg_scores,
    weeklyData,
    weeklyStats,
    userInfo
  }
}