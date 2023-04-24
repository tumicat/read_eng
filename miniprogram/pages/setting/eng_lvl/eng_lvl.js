const app = getApp()

Page({
  data: {
    loading: false,
    eng_level: app.globalData.eng_level_list,
    eng_level_select: 0,
    last_level_select: 0
  },

  pickChange: function (e) {
    this.setData({
      loading: true,
      last_level_select: this.data.eng_level_select
    })

    let selected_lvl = e.detail.value

    this.setData({
      eng_level_select: selected_lvl
    })

    let data_to_update = {
      eng_lvl: parseInt(selected_lvl),
      eng_lvl_init: parseInt(selected_lvl),
      lvl_progress: {
        news: 0,
        non_fiction: 0,
        story: 0
      }
    }

    app.db.collection('read_stats').doc(app.globalData.read_stats._id).update({
      data: data_to_update,

      success: res => {
        app.globalData.reloadUserPage = true
        app.globalData.reloadHomePage = true
        
        try {
          wx.clearStorageSync()
        }
        catch (err) {
          // don't know what to do yet
        }

        this.setData({
          loading: false
        })
      },

      fail: err => {
        this.setData({
          loading: false,
          eng_level_select: this.data.last_level_select
        })

        wx.showToast({
          title: '更新失败',
          icon: 'none',
          duration: 1000
        })
      }
    })
  },

  onLoad: function (options) {
    this.setData({
      eng_level_select: app.globalData.read_stats.eng_lvl
    })
  }
})