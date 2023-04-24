// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'production-4m7fg'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
// the function take the openid and code
// {
//   openid: string
//   code: string
// }
// returns confirmation if adding friends successful
exports.main = async (event, context) => {
  const openid = event.openid
  const code = event.code

  const check = await db.collection('friend_code').where({
    code: code
  }).get()

  let confirm = {
    status: 'error',
    error: ''
  }

  const now = new Date()
  const expire = new Date(check.data[0].expire)
  let update = undefined

  if (check.data.length > 0) {
    // there's friend code generated
    // check the expire date
    
    if (now < expire) {
      // can add friend
      confirm.status = 'ok'

      // add friend relationship into friends collection
      const owner = check.data[0].owner

      // check if the relationship existed before
      update = await db.collection('friends').where({
        friendA: openid,
        friendB: owner
      }).get()

      if (update.data.length === 0) {
        // check if the relationship existed before
        update = await db.collection('friends').where({
          friendA: owner,
          friendB: openid
        }).get()

        if (update.data.length === 0) {
          // relationship didn't exist so create one
          update = await db.collection('friends').add({
            data: {
              friendA: openid,
              friendB: owner
            }
          })
        }
      }

    } else {
      // code expired need to re-generate
      confirm.error = 'expired'
    }

  } else {
    // there's no friend code
    confirm.error = 'noCode'
  }

  return {
    confirm,
    update
  }
}