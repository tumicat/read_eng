// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

function getDateFromString(dtStr) {
  let dtStrArray = dtStr.split('-')
  let y = parseInt(dtStrArray[0])
  let m = parseInt(dtStrArray[1])
  let d = parseInt(dtStrArray[2])
  let h = parseInt(dtStrArray[3])
  let mm = parseInt(dtStrArray[4])
  let s = parseInt(dtStrArray[5])

  return new Date(y, m, d, h, mm, s);
}

// 云函数入口函数
// the function takes openid, start_date and end_date
// {
//   openid: string
//   start_date: date string
//   end_date: date string
// }
// returns the weekly stats
exports.main = async (event, context) => {
  const max_limit = 100

  const start_date = getDateFromString(event.start_date)
  const end_date = getDateFromString(event.end_date)

  const countRecords = await db.collection('reading_records').where({
    _openid: event.openid,
    date: _.gte(start_date).and(_.lte(end_date))
  }).count()

  const totalRecords = countRecords.total

  const batchTimes = Math.ceil(totalRecords / max_limit)

  // create the promise queue to avoid the 20 seconds time out
  const tasks = []
  for (let i = 0; i < batchTimes; i++) {
    const promise = db.collection('reading_records').where({
      _openid: event.openid,
      date: _.gte(start_date).and(_.lte(end_date))
    }).orderBy('date', 'asc').skip(i * max_limit).limit(max_limit).get()

    tasks.push(promise)
  }

  // async getting promise data back
  const readRecords = await Promise.all(tasks)

  let data = []
  for (let i = 0; i < batchTimes; i++) {
    data = data.concat(readRecords[i].data)
  }

  return {
    event, data
  }
}