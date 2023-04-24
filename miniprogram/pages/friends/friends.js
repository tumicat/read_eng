const app = getApp()

Page({
  data: {
    loading: true,
    load_error: false,
    msg: '读取中',

    friends: [],
    no_friend: true,
    friend_code: '',

    s_view_height: 0,
    screen_fill_height: 0,
    refreshing: false
  },

  handleInput: function (e) {
    this.setData({
      friend_code: e.detail.value.trim()
    })
  },

  deleteFriend: function (e) {
    wx.vibrateShort()

    const friendid = e.currentTarget.dataset.id
    const friendName = this.data.friends.find(f => f._openid == friendid)
    const that = this

    wx.showModal({
      title: '删除好友',
      content: '确认删除好友' + friendName.nickName + '吗?',

      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '删除好友中'
          })

          setTimeout(function () {
            wx.hideLoading()
          }, 30000)

          wx.cloud.callFunction({
            name: 'deleteFriend',
            data: {
              openid: app.globalData.openid,
              friendid: friendid
            },

            success: res => {
              wx.hideLoading()

              if (res.result.confirm.status === 'ok') {
                that.updatePage()
              } else {
                if (res.result.confirm.error === 'noFriend') {
                  that.updatePage()
                } else {
                  wx.showModal({
                    title: '删除好友',
                    showCancel: false,
                    content: '发生错误啦 *_* 请重试'
                  })
                }
              }

            },

            fail: err => {
              wx.hideLoading()

              wx.showModal({
                title: '删除好友',
                showCancel: false,
                content: '发生错误啦 *_* 请重试'
              })
            }
          })
        }
      }
    })
  },

  goToShowPage: function(e) {
    const friendid = e.currentTarget.dataset.id

    wx.navigateTo({
      url: '../showPage/showPage?who=' + friendid
    })
  },

  addFriend: function () {
    if (this.data.friend_code !== '') {
      wx.showLoading({
        title: '添加好友中'
      })

      setTimeout(function () {
        wx.hideLoading()
      }, 30000)

      wx.cloud.callFunction({
        name: 'addFriend',
        data: {
          openid: app.globalData.openid,
          code: this.data.friend_code
        },

        success: res => {
          wx.hideLoading()

          if (res.result.confirm.status === 'ok') {
            
            this.setData({
              friend_code: ''
            })

            this.updatePage()
          } else {
            let err = ''

            if (res.result.confirm.error === 'expired') {
              err = '好友码过期啦 *_* 请重新获取好友码'
            } else if (res.result.confirm.error === 'noCode') {
              err = '好友码错误 *_* 请重新获取好友码'
            } else {
              err = '发生错误啦 *_* 请重试'
            }

            wx.showModal({
              title: '添加好友',
              showCancel: false,
              content: err
            })
          }
        },

        fail: err => {
          wx.hideLoading()

          wx.showModal({
            title: '添加好友',
            showCancel: false,
            content: '发生错误啦 *_* 请重试'
          })
        }
      })
    } else {
      wx.showModal({
        title: '添加好友',
        showCancel: false,
        content: '请输入好友码'
      })
    }
    
  },

  genCode: function () {
    wx.showLoading({
      title: '获取好友码'
    })

    setTimeout(function () {
      wx.hideLoading()
    }, 30000)

    wx.cloud.callFunction({
      name: 'genFriendCode',
      data: {
        openid: app.globalData.openid
      },

      success: res => {
        wx.hideLoading()
        
        if (res.result.confirm.errMsg === 'collection.add:ok' || 
          res.result.confirm.errMsg === 'collection.update:ok') {
          
          wx.showModal({
            title: '好友码',
            showCancel: false,
            content: res.result.code
          })

        } else {
          wx.showModal({
            title: '好友码',
            showCancel: false,
            content: '发生错误啦 *_* 请重试'
          })
        }
      },

      fail: err => {
        wx.hideLoading()

        wx.showModal({
          title: '好友码',
          showCancel: false,
          content: '发生错误啦 *_* 请重试'
        })
      }
    })
  },

  renderFriendList: function (data) {
    let no_friend = true
    if (data.length > 0) {
      no_friend = false
    }

    this.setData({
      friends: data,
      no_friend: no_friend
    })

    // calculate the fill height
    let that = this
    let query = wx.createSelectorQuery().in(this)
    try {
      query.select('.loader-msg').boundingClientRect(function (res) {
        if (res.height < that.data.s_view_height) {
          that.setData({
            screen_fill_height: that.data.s_view_height - res.height + 1
          })
        } else {
          that.setData({
            screen_fill_height: 0
          })
        }
      }).exec()
    } catch (error) {
      that.setData({
        screen_fill_height: 0
      })
    }
  },
  
  updatePage: function (isPullRefresh) {
    if (isPullRefresh) {
      // no whole loading and show refreshing message
      this.setData({
        msg: '读取中',
        refreshing: true,
        loading: false,
        load_error: false
      })
    } else {
      // no refreshing message and show whole loading
      this.setData({
        msg: '读取中',
        refreshing: false,
        loading: true,
        load_error: false
      })
    }

    // load the friend list
    wx.cloud.callFunction({
      name: 'loadFriendList',
      data: {
        openid: app.globalData.openid
      },

      success: res => {
        // render to the page
        let data = res.result.friendInfo
        
        this.renderFriendList(data)

        this.setData({
          refreshing: false,
          loading: false,
          load_error: false
        })
      },

      fail: err => {
        this.setData({
          load_error: true,
          msg: '读取错误'
        })
      }
    })
  },

  onLoad: function (options) {
    // set the height of the friend list
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.friend-conainer').boundingClientRect(function (res) {
      //在这里做计算，res里有需要的数据
      that.setData({
        s_view_height: app.globalData.sys_info.windowHeight - res.height
      })
    }).exec()

    this.updatePage()
  },

  reload: function () {
    this.updatePage()
  },

  scrollToUpper: function (e) {
    if (!this.data.refreshing) {
      wx.vibrateShort()

      this.updatePage(true)
    }
  }
})