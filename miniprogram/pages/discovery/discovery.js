const app = getApp()
const window_width = app.globalData.sys_info.windowWidth

Page({
  data: {
    scroll_y_height: 0,
    current_interest: 0,
    current_category: 0,
    interest_tags: app.globalData.interest_tags,
    cat_tags: app.globalData.category_tags,
    scroll_left: 0,
    toView: "",
    loading: true,
    refreshing: false,
    loading_more: false, // when reach bottom check if a loading is in process
    has_more: true,
    load_error: false,
    msg: '读取中',
    article: [],
    art_ids: [], 
    num_per_load: 20, // number of articles generated in each loading
  },


  renewArticles: function () {
    this.setData({
      has_more: true,
      loading: true,
      load_error: false,
      msg: "读取中"
    })

    const current_int_name = this.data.interest_tags[this.data.current_interest].tag
    const current_cat_name = this.data.cat_tags[this.data.current_category].tag

    // check cache, if has cache feedToLists(), else renewFromCloud()
    // rule of naming key: current_int_name"_"current_cat_name
    let key = current_int_name.concat("_", current_cat_name)
    // console.log("combined key is:", key)
    let cache = app.utility.getCachedData("discovery", key)

    if (cache.has_data) {
      // console.log('cache got for', key)
      this.feedToLists(cache.data)
    }

    else {
      // console.log("no cache got for current combination, will load from cloud")
      this.renewFromCloud(current_int_name, current_cat_name, key)
    }
  },


  moreArticles: function (e) {
    this.setData({
      loading_more: true,
      load_error: false,
      msg: "读取中"
    })

    const current_int_name = this.data.interest_tags[this.data.current_interest].tag
    const current_cat_name = this.data.cat_tags[this.data.current_category].tag

    wx.cloud.callFunction({
      name: "loadDiscoverList",
      data: {
        openid: app.globalData.openid,
        category: current_cat_name,
        tag: current_int_name,
        num_articles: this.data.num_per_load,
        ex_articles: this.data.art_ids
      },
      success: res => {
        const feed = res.result.data
        
        if (feed.length > 0) {
          // render more to current page
          let temp_article = this.data.article
          let temp_ids = this.data.art_ids
          for (let i = 0; i < feed.length; i++) {
            temp_article.push(feed[i])
            temp_ids.push(feed[i].article_id)
          }
          this.setData({
            article: temp_article,
            art_ids: temp_ids,
            loading_more: false,
          })

          if (feed.length < this.data.num_per_load) {
            this.setData({
              has_more: false
            })
          }

          // update cache as more loaded
          let key = current_int_name.concat("_", current_cat_name)
          let cache = app.utility.getCachedData("discovery", key)
          let new_cache = cache.data.concat(res.result.data)
          // console.log("new cache is: ", new_cache)
          app.utility.saveCachedData('discovery', key, new_cache)
          
        } else {
          this.setData({
            loading_more: false,
            has_more: false,
          })
        }
      },

      fail: err => {
        // console.log("more article requested fail", err)
        this.setData({
          loading_more: false,
          load_error: true,
          msg: "读取错误"
        })
      }
    })
  },

  
  getScrollViewHeight: function () {
    let that = this
    let query = wx.createSelectorQuery().in(this)
    query.select('.bar-container').boundingClientRect(function (res) {
      //在这里做计算，res里有需要的数据
      let barHeight = res.height
      // console.log("barHight: ", barHeight)
      let screenHeight = app.globalData.sys_info.windowHeight
      let scrollHeight = screenHeight - barHeight
      that.setData({
        scroll_y_height: scrollHeight
      })
    }).exec()

  },


  onLoad: function (options) {
    this.getScrollViewHeight()
  },

  
  onShow: function () {
    //home page选中兴趣项，跳转到该页面，调取当前所选兴趣项index,并更新滚动条位置，以显示被选中的元素
    let current_interest = 0

    try{
      let id = wx.getStorageSync('selected_interest_id')
      if (id) {
        current_interest = id
      }
    } catch (e) {} 
    
    this.setData({
      current_category: 0,
      current_interest: current_interest,
      toView: "int" + current_interest,
    });

    this.renewArticles()
  },

  reload: function () {
    this.renewArticles()
  },

  switchIntTab: function (e) {
    // update index of interest clicked on this page
    this.setData({
      loading: true,
      msg: "读取中",
      current_interest: e.target.dataset.index
    })

    // update sync interest id
    try {
      wx.setStorageSync("selected_interest_id", this.data.current_interest)
    } catch (e) { }
    // move selected tag to the middle of the window 
    let offset_left = e.target.offsetLeft
    let tag_width = offset_left / this.data.current_interest / 2
    let scroll_left = offset_left - window_width / 2 + tag_width
    scroll_left = scroll_left > 0 ? scroll_left : 0
    this.setData({ scroll_left: scroll_left })

    this.renewArticles()
  },


  switchCatTab: function (e) {
    // update index of category clicked on this page
    this.setData({
      loading: true,
      msg: "读取中",
      current_category: e.target.dataset.index
    })

    this.renewArticles()
  },

  scrollToUpper: function (e) {
    if (!this.data.loading_more && !this.data.refreshing) {
      wx.stopPullDownRefresh()
      wx.vibrateShort()
      this.setData({
        refreshing: true,
        has_more: true,
        load_error: false,
      })
      const current_int_name = this.data.interest_tags[this.data.current_interest].tag
      const current_cat_name = this.data.cat_tags[this.data.current_category].tag
      let key = current_int_name.concat("_", current_cat_name)
      this.renewFromCloud(current_int_name, current_cat_name, key)
    }
  },

  scrollToLower: function (e) {

    // load more articles
    if (this.data.has_more && !this.data.loading_more && !this.data.refreshing) {
      this.moreArticles()
    } else {
      // console.log("loading in progress / no more articles")
    }
  },

  viewArticle: function (e) {
    app.utility.goToArticle(app, e.currentTarget.dataset.id)
  },

  feedToLists: function (data_source) {
    // feed is a list of objects
    const feed = data_source
    if (feed.length > 0) {
      let temp_article = []
      let temp_ids = []
      for (let i = 0; i < feed.length; i++) {
        temp_article.push(feed[i])
        temp_ids.push(feed[i].article_id)
      }
      this.setData({
        article: temp_article,
        art_ids: temp_ids,
        loading: false,
      })

      if (feed.length < this.data.num_per_load) {
        this.setData({
          has_more: false
        })
      }
    } else {
      this.setData({
        article: [],
        art_ids: [],
        loading: false,
        has_more: false
      })
    }
    // console.log(this.data.art_ids)
  },

  renewFromCloud: function (interest, category, key) {
    this.setData({
      load_error: false,
      msg: "读取中"
    })

    wx.cloud.callFunction({
      name: "loadDiscoverList",
      data: {
        openid: app.globalData.openid,
        category: category,
        tag: interest,
        num_articles: this.data.num_per_load,
        ex_articles: []
      },

      success: res => {
        this.feedToLists(res.result.data)
        app.utility.saveCachedData('discovery', key, res.result.data)
        this.setData({
          refreshing: false
        })
      },

      fail: err => {
        // console.log("renew from cloud fails", err)
        this.setData({
          refreshing: false,
          load_error: true,
          msg: "读取错误"
        })
      }
    })
  },
})