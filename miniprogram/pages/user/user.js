const app = getApp()

Page({
  data: {
    loading: true,
    load_error: false,
    msg: '读取中',
    
    is_stats_loaded: false,
    is_weekly_loaded: false,

    avatarUrl: '../../images/user-unlogin.png',
    username: '',
    exp_level: 0,
    expire_date: '',

    week_read_num: 0,
    
    //star-active
    //today
    week: [
      { id: 1, date: '一', cls_dt: '', cls_star: '' },
      { id: 2, date: '二', cls_dt: '', cls_star: '' },
      { id: 3, date: '三', cls_dt: '', cls_star: '' },
      { id: 4, date: '四', cls_dt: '', cls_star: '' },
      { id: 5, date: '五', cls_dt: '', cls_star: '' },
      { id: 6, date: '六', cls_dt: '', cls_star: '' },
      { id: 7, date: '日', cls_dt: '', cls_star: '' }
    ],

    total_articles: 0,
    total_words: 0,
    total_questions: 0,
    avg_score: 0,

    current_eng_lvl: app.globalData.eng_level_list[0],
    
    num_cat_article: {
      news: 0,
      non_fiction: 0,
      story: 0
    }
  },

  modalChange: function () {
    this.setData({
      modalHidden: true
    })
  },

  goToResetEngLvl: function () {
    wx.navigateTo({
      url: '../setting/eng_lvl/eng_lvl'
    })
  },

  goToReadHistory: function () {
    wx.navigateTo({
      url: '../history/history'
    })
  },

  getNumReadDay: function (read_hist_data, td) {
    if(td === 0) {
      td = 7
    }

    const cn_week = ['一', '二', '三', '四', '五', '六', '日']
    let default_week = []

    for (let i = 0; i < 7; i++) {
      default_week.push({
        id: (i+1),
        date: cn_week[i],
        cls_dt: '',
        cls_star: ''
      })
    }
    
    // mark today
    default_week[td-1].date = '今日'
    default_week[td-1].cls_dt = 'today'

    // mark stars
    let last_d = -1
    let count_d = 0

    for (const dt of read_hist_data) {
      let d = new Date(dt.date).getDay()
      
      if (last_d !== d) {
        if (d === 0) {
          default_week[default_week.length - 1].cls_star = 'star-active'
        } else {
          default_week[d - 1].cls_star = 'star-active'
        }

        count_d = count_d + 1
        last_d = d
      }
    }

    return {
      week_read_num: count_d,
      week: default_week
    }
  },

  checkLoad: function () {
    if (this.data.is_stats_loaded && this.data.is_weekly_loaded) {
      this.setData({
        loading: false
      })

      // set it back to true when any update to the read_stats collection
      app.globalData.reloadUserPage = false

      // wx.hideNavigationBarLoading()
      wx.stopPullDownRefresh()
      
    }
  },

  loadWeekly: function () {
    // request for the reading history
    const dt = app.utility.getCurrentMonday()
    const start_date = app.utility.getDateString(dt.monday)

    wx.cloud.callFunction({
      name: 'getWeekly',
      data: {
        openid: app.globalData.openid,
        start_date: start_date
      },
      success: res => {
        
        let read_hist_data = res.result.data
        
        let num_read_day = this.getNumReadDay(read_hist_data, dt.td_day)
        
        this.setData({
          week_read_num: num_read_day.week_read_num,
          week: num_read_day.week,
          is_weekly_loaded: true,
        })

        this.checkLoad()
      },

      fail: err => {
        this.setData({
          load_error: true,
          msg: '读取错误'
        })

        // wx.hideNavigationBarLoading()
        wx.stopPullDownRefresh()
      }
    })
  },
  
  loadStats: function () {
    app.db.collection('read_stats').where({
      _openid: app.globalData.openid
    }).get({
      success: res => {
        let stats_data = res.data[0]

        app.globalData.read_stats = stats_data
        
        this.setData({
          exp_level: app.utility.getStatsNumString(stats_data.exp_lvl),

          total_articles: app.utility.getStatsNumString(stats_data.tot_article),
          total_words: app.utility.getStatsNumString(stats_data.tot_words),
          total_questions: app.utility.getStatsNumString(stats_data.tot_question),
          avg_score: app.utility.getStatsNumString(stats_data.avg_score),

          current_eng_lvl: app.globalData.eng_level_list[stats_data.eng_lvl], 
          num_cat_article: stats_data.lvl_progress,
          is_stats_loaded: true,
        })

        this.checkLoad()
      },
      fail: err => {
        this.setData({
          load_error: true,
          msg: '读取错误'
        })

        // wx.hideNavigationBarLoading()
        wx.stopPullDownRefresh()
      }
    })
  },

  updatePage: function () {
    const expire_date = new Date(app.globalData.expire_date)

    this.setData({
      avatarUrl: app.globalData.userInfo.avatarUrl,
      username: app.globalData.userInfo.nickName,
      expire_date: expire_date.toLocaleDateString('zh-Hans-CN'),
      loading: false,
      load_error: false,
      msg: '读取中'
    })

    if (app.globalData.reloadUserPage) {
      // reset states
      this.setData({
        loading: true,
        load_error: false,
        msg: '读取中',

        is_stats_loaded: false,
        is_weekly_loaded: false,
      })

      // request for the reading stats
      this.loadStats()
      this.loadWeekly()
    }
  },

  onLoad: function (options) {
    
  },

  onShow: function () {
    this.updatePage()
  },

  reload: function () {
    this.updatePage()
  },

  onPullDownRefresh() {
    // wx.showNavigationBarLoading()
    wx.vibrateShort()

    this.setData({
      is_stats_loaded: false,
      is_weekly_loaded: false,
    })

    // request for the reading stats
    this.loadStats()
    this.loadWeekly()
  },


  goToShowPage: function() {
    wx.navigateTo({
      url: '../showPage/showPage?who=' + app.globalData.openid
    })
  },


  goToFriends: function() {
    wx.navigateTo({
      url: '../friends/friends'
    })
  }
})