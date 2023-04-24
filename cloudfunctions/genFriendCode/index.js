// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
// the function takes user openid and generate the friend code randomly
// {
//   openid: string
// }
// returns friend code and update the friend_code collection
exports.main = async (event, context) => {
  // generate the code
  const openid = event.openid
  const maxL = openid.length - 4
  const pos = Math.floor(Math.random() * maxL)
  const prefix = openid.substr(pos, 4).toUpperCase()

  const dt = new Date()
  const h = dt.getHours()
  const m = dt.getMinutes()
  const s = dt.getSeconds()
  const ms = dt.getMilliseconds()
  const code = prefix + h + m + s + ms

  // put the code into the collection
  const minutes = 15
  const expire = new Date(dt.getTime() + minutes * 60000)

  // try to update first
  let confirm = await db.collection('friend_code').where({
    owner: openid
  }).update({
    data: {
      owner: openid,
      code: code,
      expire: expire
    },
  })

  // if confirm stats updated is 0 means there was no code before
  // add a new code record
  if (confirm.stats.updated === 0) {
    confirm = await db.collection('friend_code').add({
      data: {
        owner: openid,
        code: code,
        expire: expire
      }
    })
  }

  return {
    openid,
    code,
    expire,
    confirm
  }
}