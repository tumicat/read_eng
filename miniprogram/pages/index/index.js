const app = getApp()

Page({
  data: {
    msg: '一起读英语吧, 马上就来！',
    load_error: false,
    show_load: false,
    first_time: false,
    is_old_user_back: false,

    is_init_acct_done: false,
    is_init_read_stats_done: false,
    
    eng_level: app.globalData.eng_level_list,
    eng_level_select: 0,
    msg_welcome: '获取免费阅读30天',
    msg_btn: '开始免费试用',
    btn_top_margin: '18rpx',
    load_cls: '',
    is_grant_color: 0
  },
  
  // get level featured raw data from cloud db, while rendering loading icon
  loadFeatured: function () {
    wx.cloud.callFunction({
      name: "loadFeaturedList",
      data: {
        openid: app.globalData.openid,
        num_articles: 8,
      },
      success: res => {
        app.utility.saveCachedData('article', 'featured', res)
      }
    })
  },

  // get filted article raw data from cloud db, while rendering loading icon
  loadArticles: function () {
    wx.cloud.callFunction({
      name: "loadHomeList",
      data: {
        openid: app.globalData.openid,
        num_articles: 10,
        ex_articles: []
      },
      success: res => {
        app.utility.saveCachedData('article', 'article', res)
      }
    })
  },

  updatePage: function () {
    this.setData({
      msg: '一起读英语吧, 马上就来！',
      load_error: false,
      show_load: false,
      first_time: false,
      is_old_user_back: false,

      is_init_acct_done: false,
      is_init_read_stats_done: false,

      eng_level: app.globalData.eng_level_list,
      eng_level_select: 0,
      msg_welcome: '获取免费阅读30天',
      msg_btn: '开始免费试用',
      btn_top_margin: '18rpx',
      load_cls: ''
    })

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    // try to get the open id and go to home if successful
    this.getOpenid()
  },

  reload: function () {
    this.updatePage()
  },

  onLoad: function() {
    // wx.navigateTo({
    //   url: '../friends/friends'
    // })
    this.updatePage()
  },

  pickChange: function (e) {
    this.setData({
      eng_level_select: e.detail.value
    })
  },

  gotoHome: function() {
    wx.switchTab({ url: '../home/home' })
  },

  showError: function() {
    this.setData({
      msg: '加载失败',
      load_error: true
    })
  },

  showLoadBar: function() {
    this.setData({
      show_load: true,
      load_cls: 'loading-bar-active',
      is_grant_color: 0
    })
  },

  checkInitStatus: function () {
    if (this.data.is_init_read_stats_done) {
      // try to load the home page list and save to cache
      this.loadFeatured()
      this.loadArticles()
    }

    // get the expire date
    if (this.data.is_init_acct_done) {
      this.getExpireDate()
    }

    if (this.data.is_init_acct_done && this.data.is_init_read_stats_done) {
      wx.showToast({
        title: '用户创建成功',
        icon: 'success',
        duration: 2000,
        complete: function () {
          setTimeout(function () { wx.switchTab({ url: '../home/home' }) }, 2000)
        }
      })
    }
  },

  initAccount: function() {
    // calc expire_date
    const num_days = 30
    let today = new Date()
    let expire_date = new Date()
    expire_date.setDate(today.getDate() + num_days)
    expire_date = new Date(expire_date.toDateString())
    
    app.globalData.expire_date = expire_date

    app.db.collection('account').add({
      data: {
        expire_date: expire_date
      },
      success: res => {
        this.setData({
          is_init_acct_done: true
        })

        this.checkInitStatus()
      },
      fail: err => {
        this.showError()
      }
    })
  },

  initReadStats: function() {
    app.db.collection('read_stats').add({
      data: {
        eng_lvl_init: this.data.eng_level_select,
        eng_lvl: this.data.eng_level_select,
        exp_lvl: 0,

        lvl_progress: {
          news: 0,
          non_fiction: 0,
          story: 0
        },

        tot_article: 0,
        tot_words: 0,
        tot_question: 0,
        avg_score: 0
      },
      success: res => {
        this.setData({
          is_init_read_stats_done: true
        })

        this.checkInitStatus()
      },
      fail: err => {
        this.showError()
      }
    })
  },

  onGetUserInfo: function (e) {
    if (e.detail.userInfo) {
      app.globalData.userInfo = e.detail.userInfo

      if (!this.data.is_old_user_back) {
        this.setData({
          is_init_acct_done: false,
          is_init_read_stats_done: false
        })

        this.initAccount()
        this.initReadStats()
      } else {
        // try to load the home page list and save to cache
        this.loadFeatured()
        this.loadArticles()

        // get the expire date
        this.getExpireDate()

        // wait a bit before going to home
        wx.showToast({
          title: '欢迎回来',
          icon: 'success',
          duration: 2000,
          complete: function () {
            setTimeout(function () { wx.switchTab({ url: '../home/home' }) }, 2000)
          }
        })
      }
    } else {
      // user reject give access
      this.setData({
        load_cls: '',
        is_grant_color: 1
      })
    }
  },
  
  getUserInfoThenGoHome: function () {
    // get the user info to safe to global data
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              app.globalData.userInfo = res.userInfo

              // update the user info to account
              app.db.collection('account').where({
                _openid: app.globalData.openid
              }).get({
                success: function (res) {
                  let docID = res.data[0]._id
                  
                  app.db.collection('account').doc(docID).update({
                    data: {
                      nickName: app.globalData.userInfo.nickName,
                      gender: app.globalData.userInfo.gender,
                      language: app.globalData.userInfo.language,
                      city: app.globalData.userInfo.city,
                      province: app.globalData.userInfo.province,
                      avatarUrl: app.globalData.userInfo.avatarUrl
                    },

                    success: console.log,
                    fail: console.error
                  })
                }
              })
              
              // if success go to the home page
              this.gotoHome()
            },

            fail: err => {
              // this means the user removed the app and come back again
              app.globalData.isFirstTime = true

              this.setData({
                first_time: true,
                is_old_user_back: true,
                msg_welcome: '欢迎回来!',
                msg_btn: '开始阅读',
                btn_top_margin: '88rpx'
              })
            }
          })
        } else {
          // this means the user removed the app and come back again
          app.globalData.isFirstTime = true

          this.setData({
            first_time: true,
            is_old_user_back: true,
            msg_welcome: '欢迎回来!',
            msg_btn: '开始阅读',
            btn_top_margin: '88rpx'
          })
        }
      },
      fail: err => {
        app.globalData.isFirstTime = true
        
        this.setData({
          first_time: true
        })
      }
    })
  },
  
  getExpireDate: function () {
    app.db.collection('account').where({
      _openid: app.globalData.openid
    }).get({
      success: res => {
        app.globalData.expire_date = res.data[0].expire_date
        app.globalData.account_id = res.data[0]._id
      },
      fail: err => {
        console.log(err)
      }
    })
  },

  getOpenid: function() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        app.globalData.openid = res.result.openid

        // check if it's the first time user
        if (res.result.is_first_time) {
          app.globalData.isFirstTime = true

          this.setData({
            first_time: true
          })
        } else {
          // try to load the home page list and save to cache
          this.loadFeatured()
          this.loadArticles()

          // get the expire date
          this.getExpireDate()

          // go to home page
          this.getUserInfoThenGoHome()
        }
      },
      fail: err => {
        // console.error('[云函数] [login] 调用失败 请部署云函数', err)
        this.setData({
          msg: '加载失败',
          load_error: true
        })
      }
    })
  }

})
