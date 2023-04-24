const app = getApp()

Page({
  data: {
    loading: true,
    load_error: false,
    msg: '读取中',

    numDays: 0,
    numArticles: 0,
    numWords: 0,
    numQuestions: 0,
    avgScores: 0,
    refDate: '2019/01/01',
    badgeURL: '',
    award: '',
    openid: '',
    username: '',

    section_margin: 'l'
  },

  updatePage: function(isPullDown) {
    // remove the error
    this.setData({
      msg: '读取中',
      load_error: false
    })

    // init updating display
    if (!isPullDown) {
      this.setData({
        loading: true
      })
    }

    // call the cloud function to update
    wx.cloud.callFunction({
      name: 'showStats',
      data: {
        openid: this.data.openid
      },
      success: res => {
        const showStats = res.result
        
        let award = 'Lazy'
        let url = '../../images/showPageImages/lazy.png'
        
        if (showStats.numDays === 0) {
          url = '../../images/showPageImages/lazy.png'
          award = 'Lazy'
        } else if (showStats.numDays === 1) {
          url = '../../images/showPageImages/bronze.png'
          award = 'Bronze'
        } else if (showStats.numDays > 1 && showStats.numDays < 4) {
          url = '../../images/showPageImages/silver.png'
          award = 'Silver'
        } else if (showStats.numDays === 4) {
          url = '../../images/showPageImages/gold.png'
          award = 'Gold'
        } else if (showStats.numDays > 4) {
          url = '../../images/showPageImages/trophy.png'
          award = 'Trophy'
        }
        
        const sysh = app.globalData.sys_info.screenHeight
        const sysw = app.globalData.sys_info.screenWidth
        
        let section_margin = 'l'

        if (sysh / sysw < 1.4) {
          section_margin = 's'
        }

        this.setData({
          loading: false,
          
          numDays: showStats.numDays,
          numArticles: app.utility.getStatsNumString(showStats.numArticles),
          numWords: app.utility.getStatsNumString(showStats.numWords),
          numQuestions: app.utility.getStatsNumString(showStats.numQuestions),
          avgScores: app.utility.getStatsNumString(showStats.avgScores),

          username: showStats.userInfo.nickName,

          badgeURL: url,
          refDate: app.utility.getDateStringCh(new Date()),

          award: award,

          section_margin: section_margin
        })

        // wx.hideNavigationBarLoading()
        wx.stopPullDownRefresh()
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

  onPullDownRefresh() {
    // wx.showNavigationBarLoading()
    wx.vibrateShort()

    // request for the reading stats
    this.updatePage(true)
  },

  onLoad: function (options) {
    this.setData({
      openid: options.who
    })

    this.updatePage()
  },

  reload: function () {
    this.updatePage()
  }
})