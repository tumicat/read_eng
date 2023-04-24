// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()

// function to shuffle array in place
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// function to ramdomly pickup the articles for a given article list and num of the picks
function randomPickArticles(articles, num_articles) {
  // get the article index randomly
  const pool = shuffle(Array.apply(null, { length: articles.length }).map(Number.call, Number))

  // make sure slice up to max 50 or the actual length of the pool if the length is less than 50
  let max = 50

  if (pool.length < max) {
    max = pool.length
  }

  if (num_articles > max) {
    num_articles = max
  }

  // slice the pool to the required num of articles 
  // then map to the actual articles from the articles
  const data = pool.slice(0, num_articles).map(i => articles[i])

  return data
}

// 云函数入口函数
// the function takes the openid and num_articles
// {
//   openid: string
//   num_articles: int (max 50)
// }
// returns n articles from the latest featured articles randomly

exports.main = async (event, context) => {
  // use the open id to get eng level
  const read_stats = await db.collection('read_stats').where({
    _openid: event.openid
  }).get()

  const lvl = read_stats.data[0].eng_lvl

  // load the latest featured 100 articles given the level
  const last_batch = await db.collection('article').where({
    lvl: lvl,
    is_featured: true
  }).orderBy('article_id', 'desc').limit(100).get()

  // retrive articles and randomly pick up to return
  const articles = last_batch.data
  const data = randomPickArticles(articles, event.num_articles)

  return {
    event,
    data
  }
}