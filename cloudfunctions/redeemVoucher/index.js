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
// param
// data: {
//   openid: openid
//   product_id: product_id,
//   voucher: voucher_number,
//   expire_date: expire_date,
//   expire_date: JSON.stringify(expire_date),
//   method: method,
//   price: price,
//   expire_date: expire_date
// }

exports.main = async (event, context) => {
  const expire_date = getDateFromString(event.expire_date)
  const transaction_date = getDateFromString(event.transaction_date)
  
  // look for the voucher according to the number
  const voucher_data = await db.collection('voucher').where({
    voucher: event.voucher
  }).get()

  if (voucher_data.data.length > 0) {
    const voucher = voucher_data.data[0]

    // make sure the product is match and voucher is ready to use
    if(voucher.product_id !== event.product_id) {
      return {
        status: 'err_product_id'
      }
    }

    if (voucher.status !== 'active') {
      return {
        status: 'err_voucher_status'
      }
    }

    // redeem the voucher
    // make the voucher status redeemed
    const doc_ok = 'document.update:ok'
    const coll_ok = 'collection.update:ok'
    const add_ok = 'collection.add:ok'

    let check = await db.collection('voucher').doc(voucher._id).update({
      data: {
        status: 'redeemed'
      }
    })

    if (check.errMsg !== doc_ok) {
      return {
        status: 'err_redeem_voucher'
      }
    }

    // update the expire date of the user
    check = await db.collection('account').where({
      _openid: event.openid
    }).update({
      data: {
        expire_date: expire_date
      }
    })

    if (check.errMsg !== coll_ok) {
      return {
        status: 'err_update_expire_date'
      }
    }

    // record the transaction
    check = await db.collection('transaction').add({
      data: {
        _openid: event.openid,
        date: transaction_date,
        method: event.method,
        product_id: event.product_id,
        expire_date: expire_date,
        amount: event.price
      }
    })

    if (check.errMsg !== add_ok) {
      return {
        status: 'err_add_transaction'
      }
    }

    return {
      status: 'ok'
    }

  } else {
    return {
      status: 'err_voucher_number'
    }
  }
}