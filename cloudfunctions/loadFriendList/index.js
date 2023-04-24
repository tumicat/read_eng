// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
// function take openid
// {
//   openid: string
// }
// returns a list of friends
// [
//   {
//     nickName: string
//     avatarUrl: string
//     openid: string
//   }
// ]
exports.main = async (event, context) => {
  const openid = event.openid

  // load the friend open id list
  const max_limit = 100
  let total = 0
  let batchTimes = 0
  let tasks = undefined
  let reponse = undefined

  // as friend A
  const asFriendACount = await db.collection('friends').where({
    friendA: openid
  }).count()

  total = asFriendACount.total
  batchTimes = Math.ceil(total / max_limit)

  tasks = []
  for (let i = 0; i < batchTimes; i++) {
    const promise = await db.collection('friends').where({
      friendA: openid
    }).skip(i * max_limit).limit(max_limit).get()
    
    tasks.push(promise)
  }

  reponse = await Promise.all(tasks)

  let friendA = []
  for (let i = 0; i < batchTimes; i++) {
    friendA = friendA.concat(reponse[i].data)
  }

  // as friend B
  const asFriendBCount = await db.collection('friends').where({
    friendB: openid
  }).count()

  total = asFriendBCount.total
  batchTimes = Math.ceil(total / max_limit)

  tasks = []
  for (let i = 0; i < batchTimes; i++) {
    const promise = await db.collection('friends').where({
      friendB: openid
    }).skip(i * max_limit).limit(max_limit).get()

    tasks.push(promise)
  }

  reponse = await Promise.all(tasks)

  let friendB = []
  for (let i = 0; i < batchTimes; i++) {
    friendB = friendB.concat(reponse[i].data)
  }

  let friend = []

  friendA.forEach(val => friend.push(val.friendB))
  friendB.forEach(val => friend.push(val.friendA))

  // get the fiend display info
  const friendInfoCount = await db.collection('account').where({
    _openid: _.in(friend)
  }).count()

  total = friendInfoCount.total
  batchTimes = Math.ceil(total / max_limit)

  tasks = []
  for (let i = 0; i < batchTimes; i++) {
    const promise = await db.collection('account').where({
      _openid: _.in(friend)
    }).orderBy('nickName', 'asc').skip(i * max_limit).limit(max_limit).get()

    tasks.push(promise)
  }

  reponse = await Promise.all(tasks)

  let friendInfo = []
  for (let i = 0; i < batchTimes; i++) {
    friendInfo = friendInfo.concat(reponse[i].data)
  }

  return {
    friendInfo
  }
}