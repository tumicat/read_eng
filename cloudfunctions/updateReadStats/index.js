// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
// param
// {
//   openid
//   article_id
//   category
//   num_words
//   num_questions
//   score
// }
// function use the reading_records to update the read stats

exports.main = async (event, context) => {
  // get current stats and calculate the latest stats and update
  const read_stats = await db.collection('read_stats').where({
    _openid: event.openid
  }).get()

  const _id = read_stats.data[0]._id
  const stats = read_stats.data[0]

  let avg_score = (stats.avg_score * stats.tot_article + event.score) / (stats.tot_article + 1)
  let tot_article = stats.tot_article + 1
  let tot_question = stats.tot_question + event.num_questions
  let tot_words = stats.tot_words + event.num_words
  
  let lvl_progress = stats.lvl_progress

  let eng_lvl = stats.eng_lvl
  
  if (event.score >= 80) {
    lvl_progress[event.category] += 1
  }
  
  // check if ready to upgrade
  let num = 0

  for (let n in lvl_progress) {
    num += lvl_progress[n]
  }

  const max_lvl = 14
  
  if (num >= 30 && eng_lvl < max_lvl) {
    eng_lvl += 1

    for (let n in lvl_progress) {
      lvl_progress[n] = 0
    }
  }

  // increase the exp_lvl
  // article contributes 1 point
  // num_words contributes 1/100 point round to integer
  // if score >= 60 contributes 1 point
  // if score >= 85 contributes 2 point
  const exp_lvl = stats.exp_lvl

  let pts = 0

  if (event.score >= 85) {
    pts = 2 + Math.round(event.num_words / 100)
  } else if (event.score >= 85) {
    pts = 1 + Math.round(event.num_words / 100)
  }

  // update stats
  let ret = null
  let errMsg = {
    msg: 'ok'
  }

  if (tot_article !== null && tot_question !== null 
      && tot_words !== null && avg_score !== null 
      && eng_lvl !== null && exp_lvl != null
  ) {
    ret = await db.collection('read_stats').doc(_id).update({
      data: {
        tot_article: tot_article,
        tot_question: tot_question,
        tot_words: tot_words,
        avg_score: avg_score,

        lvl_progress: lvl_progress,
        eng_lvl: eng_lvl,

        exp_lvl: exp_lvl + pts
      }
    })
  } else {
    let errMsg = {
      msg: 'document.update:error'
    }
  }

  return {
    event,
    ret,
    errMsg
  }
}