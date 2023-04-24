const app = getApp()

Page({

  data: {
    loading: true,
    load_error: false,
    msg: '读取中',
    has_submitted: false,
    load_cls: '',

    product_list: [],
    product_id_list: [],
    product_name_list: [],
    num_month_list: [],
    price_list: [],
    product_selected: 0,
    discount_list: [],
    discount_msg: '',

    voucher_number: ''
  },

  bindKeyInput: function (e) {
    this.setData({
      voucher_number: e.detail.value
    })
  },

  recordTransaction: function () {
    if (app.globalData.transaction) {
      app.db.collection('transaction').add({
        data: {
          amount: app.globalData.transaction.price,
          date: app.globalData.transaction.transaction_date,
          expire_date: app.globalData.transaction.expire_date,
          method: app.globalData.transaction.method,
          product_id: app.globalData.transaction.product_id
        },
        success: res => {
          console.log(res)
        },
        fail: err => {
          console.log(err)
        }
      })
    }
  },

  showPaymentError: function () {
    wx.showToast({
      title: '支付失败',
      icon: 'none',
      duration: 2000
    })

    this.setData({
      load_cls: '',
      has_submitted: false
    })
  },

  successBack: function () {
    // update the expire date and allow access the article
    app.globalData.expire_date = app.globalData.transaction.expire_date

    wx.showToast({
      title: '支付成功',
      icon: 'success',
      duration: 2000,
      complete: function () {
        setTimeout(function () { wx.navigateBack({ delta: 1 }) }, 2000)
      }
    })

    this.setData({
      load_cls: '',
      has_submitted: false
    })
  },
  
  cacheTransaction: function (product_id, transaction_date, expire_date, method, price) {
    app.globalData.transaction = {
      product_id: product_id,
      transaction_date: transaction_date,
      expire_date: expire_date,
      method: method,
      price: price
    }
  },

  submitPurchase: function () {
    if (!this.data.has_submitted) {
      // start loading and put the button disabled to avoid double clicking
      this.setData({
        load_cls: 'loading-bar-active',
        has_submitted: true
      })

      const transaction_date = new Date()

      let method = 'wechat'
      const voucher_number = this.data.voucher_number.trim()

      if (voucher_number.length > 0) {
        method = 'voucher'
      }

      const product_id = this.data.product_id_list[this.data.product_selected]
      const product_name = this.data.product_name_list[this.data.product_selected]
      const month = this.data.num_month_list[this.data.product_selected]

      const today = new Date()
      const expire_date = new Date(today.setMonth(today.getMonth() + month));

      const price = this.data.price_list[this.data.product_selected]

      // pay with wechat pay
      this.cacheTransaction(
        product_id, transaction_date, expire_date, method, price
      )

      if (voucher_number.length > 0) {
        // pay with voucher
        wx.cloud.callFunction({
          name: 'redeemVoucher',
          data: {
            openid: app.globalData.openid,
            product_id: product_id,
            voucher: voucher_number,
            transaction_date: app.utility.getDateString(transaction_date),
            expire_date: app.utility.getDateString(expire_date),
            method: method,
            price: price
          },
          success: res => {
            if (res.result.status === 'ok') {
              this.successBack()
            } else {
              this.showPaymentError()
            }

            // hide the loading icon and mark not submitted
            this.setData({
              load_cls: '',
              has_submitted: false
            })
          },
          fail: err => {
            this.showPaymentError()
          }
        })

      } else {
        wx.cloud.callFunction({
          name: 'getPay',
          data: {
            price: Math.round(price * 100),
            attach: method,
            body: '读英语吧 - ' + product_name
          },
          success: res => {
            wx.requestPayment({
              appId: res.result.appid,
              timeStamp: res.result.timeStamp,
              nonceStr: res.result.nonce_str,
              package: 'prepay_id=' + res.result.prepay_id,
              signType: 'MD5',
              paySign: res.result.paySign,

              success: res => {
                console.log(res)
                // need to update the expire date to account
                app.db.collection('account').doc(app.globalData.account_id).update({
                    data: {
                      expire_date: app.globalData.transaction.expire_date
                    },
                    success: res => {
                      console.log(res)
                    },
                    fail: err => {
                      console.log(err)
                    }
                })

                // record the payment
                this.recordTransaction()
                
                this.successBack()
              },

              fail: err => {
                this.showPaymentError()
              }
            })
          },
          fail: err => {
            this.showPaymentError()
          }
        })
      }
    }
  },

  pickChange: function (e) {
    const product_selected = e.detail.value
    let discount_msg = ''
    
    if (this.data.discount_list[product_selected] > 0) {
      discount_msg = '优惠' + this.data.discount_list[product_selected] + '%'
    }

    this.setData({
      product_selected: product_selected,
      discount_msg: discount_msg
    })
  },

  update: function () {
    // init the loading
    // loading-bar-active
    this.setData({
      loading: true,
      load_error: false,
      msg: '读取中',
      load_cls: '',
    })

    // get product info
    app.db.collection('product').orderBy('price', 'desc').get({
      success: res => {
        const product_data = res.data

        let product_list = []
        let product_id_list = []
        let product_name_list = []
        let price_list = []
        let discount_list = []
        let num_month_list = []

        for (let i = 0; i < product_data.length; i++) {
          product_list.push(product_data[i].title)
          product_id_list.push(product_data[i].product_id)
          product_name_list.push(product_data[i].title)
          num_month_list.push(product_data[i].month)
          price_list.push(product_data[i].price)
          discount_list.push(product_data[i].discount)
        }

        let discount_msg = ''

        if (discount_list[this.data.product_selected] > 0) {
          discount_msg = '优惠' + discount_list[this.data.product_selected] + '%'
        }

        this.setData({
          loading: false,
          
          product_list: product_list,
          product_id_list: product_id_list,
          product_name_list: product_name_list,
          num_month_list: num_month_list,
          price_list: price_list,
          discount_list: discount_list,
          discount_msg: discount_msg
        })
      },
      fail: err=> {
        this.setData({
          load_error: true,
          msg: '读取错误'
        })
      }
    })
  },

  onLoad: function (options) {
    this.update()
  },

  reload: function () {
    this.update()
  }
})