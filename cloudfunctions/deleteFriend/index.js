// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
// function take the openid and id of the friend
// it deletes the record in the friend collection accordingly
// {
//   openid: string
//   friendid: string
// }
// returns the confirm if friend deleting successful
exports.main = async (event, context) => {
  const openid = event.openid
  const friendid = event.friendid

  let confirm = undefined

  let check = await db.collection('friends').where({
    friendA: openid,
    friendB: friendid
  }).get()

  if (check.data.length > 0) {
    // do remove
    try {
      confirm = await db.collection('friends').doc(check.data[0]._id).remove()
      
      if (confirm.errMsg == 'document.remove:ok') {
        confirm = {
          status: 'ok',
          error: ''
        }
      } else {
        confirm = {
          status: 'error',
          error: 'database'
        }
      }
    } catch (e) {
      confirm = {
        status: 'error',
        error: 'database'
      }
    }
  } else {
    check = await db.collection('friends').where({
      friendA: friendid,
      friendB: openid
    }).get()

    if (check.data.length > 0) {
      // do remove
      try {
        confirm = await db.collection('friends').doc(check.data[0]._id).remove()
      } catch (e) {
        confirm = {
          status: 'error',
          error: 'database'
        }
      }
    } else {
      // relationshiop doesn't exist
      confirm = {
        status: 'error',
        error: 'noFriend'
      }
    }
  }

  return {
    confirm,
    check
  }
}