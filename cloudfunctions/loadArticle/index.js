// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
// Params: {
//   type: String [article, adv],
//   article_id: Int
// }
// according to the article id and type to query and load the article
exports.main = async (event, context) => {
  let coll_name = 'article'
  let coll_content_name = 'article_content'

  if (event.type === 'adv') {
    coll_name = 'adv_article'
    coll_content_name = 'adv_article_content'
  }

  const article = await db.collection(coll_name).where({
    article_id: event.article_id
  }).get()

  const article_content = await db.collection(coll_content_name).where({
    article_id: event.article_id
  }).get()
  
  const article_data = article.data[0]
  const article_content_data = article_content.data[0]

  return {
    event,
    article_data,
    article_content_data
  }
}