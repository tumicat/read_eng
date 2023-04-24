const app = getApp()

Page({
  data: {
    is_art_loaded: false,
    is_fea_loaded: false,
    loading: false,
    loading_more: false, // when reach bottom check if a loading is in process
    has_more: true, // check if db request retures more article list
    load_error: false,
    msg: '读取中',  

    article: [], //from db article collection filted to the same lvl, as backup for rendering
    art_ids: [], // ids of articles already rendered on page
    swiper_featured: [], // cleaned top featured articles
    list_featured: [], // cleaned second featured articles

    ads: [
      {ad_id: 1, ad_name: "新手指南"},
      {ad_id: 2, ad_name: "近期活动"},
      {ad_id: 3, ad_name: "高效学习"}
    ],
    
    interest_tags: app.globalData.interest_tags,
    selected_interest_id: 0,

    // data for swiper view
    indicatorDots: true,
    autoplay: true,
    circular: true,
    interval: 5000,
    duration: 500,
    previousMargin: 0,
    nextMargin: 0,
    num_per_load: 10, // number of articles generated in each loading
  },

  // get level featured raw data from cloud db, while rendering loading icon
  loadFeatured: function () {
    this.setData({
      is_fea_loaded: false
    })

    wx.cloud.callFunction({
      name: "loadFeaturedList",
      data: {
        openid: app.globalData.openid,
        num_articles: 8,
      },
      success: res => {
        this.feedToFeatures(res.result.data)
        if (this.data.is_art_loaded && this.data.is_fea_loaded) {
          wx.stopPullDownRefresh()

          this.setData({
            loading: false
          })
        }
      },
      fail: err => {
        this.setData({
          load_error: true,
          msg: "读取错误"
        })
      }
    })
  },
  
  // get filted article raw data from cloud db, while rendering loading icon
  loadArticles: function (isReload) {
    this.setData({
      is_art_loaded: false,
      loading_more: true
    })

    wx.cloud.callFunction({
      name: "loadHomeList",
      data:{
        openid: app.globalData.openid,
        num_articles: this.data.num_per_load,
        ex_articles: this.data.art_ids
      },

      success: res => {
        this.feedToArticle(res.result.data, isReload)

        if (this.data.is_art_loaded && this.data.is_fea_loaded) {
          wx.stopPullDownRefresh()

          this.setData({
            loading: false
          })
        }
      },

      fail: err => {
        this.setData({
          load_error: true,
          msg: "读取错误"
        })
      }
    })
  },

  onLoad: function(options) { 
    // initialise variables
    this.init_variables()
    // check if featured & 1st 20 articles in cache while rendering nothing
    let featured_cache = app.utility.getCachedData("article", "featured")
    let article_cache = app.utility.getCachedData("article", "article")

    if (featured_cache.has_data && article_cache.has_data) {
      // console.log('cache got')
      this.feedToFeatures(featured_cache.data.result.data)
      this.feedToArticle(article_cache.data.result.data, true)
      
    } else {
      // console.log('cache checked but no cache')
      this.setData({
        loading: true
      })

      this.loadArticles(true)
      this.loadFeatured()
    }
  },

  reload: function() {
    this.onLoad()
  },

  onReachBottom: function() {   
    // console.log("reach bottom")
    
    if (!this.data.loading_more) {
      this.loadArticles(false)
    }  else {
      // console.log("loading in progress")
    }
  },

  viewArticle: function(e) {
    app.utility.goToArticle(app, e.currentTarget.dataset.id)
  },

  gotoDiscovery: function(e) { 
    // 更新本地的当前兴趣
    this.setData({
      selected_interest_id: e.currentTarget.id
    });

    try{ 
      wx.setStorageSync("selected_interest_id", this.data.selected_interest_id)
    } catch (e) {}
    
    wx.switchTab({ url: '../discovery/discovery' })
  },

  reload: function () {
    this.onLoad()
  },

  onShow: function () {
    if (app.globalData.reloadHomePage) {
      app.globalData.reloadHomePage = false
      this.onLoad()
    }
  },
  

  feedToFeatures: function (data_source) {
    let temp_swiper = []
    let temp_list = []

    const feed_fea = data_source

    if (feed_fea.length > 0) {
      for (let i = 0; i < 3; i++) {
        temp_swiper.push(feed_fea[i])
      }
      for (let i = 3; i < feed_fea.length; i++) {
        temp_list.push(feed_fea[i])
      }
    }
    
    this.setData({
      swiper_featured: temp_swiper,
      list_featured: temp_list,
      is_fea_loaded: true
    })
    // console.log("swiper featured:", temp_swiper)
    // console.log("list featured:", temp_list)
  },

  feedToArticle: function (data_source, isReload) {
    const feed = data_source
    var temp_article = []
    var temp_ids = []
    if (!isReload) {
      var temp_article = this.data.article
      var temp_ids = this.data.art_ids
    } 
    
    if (feed.length > 0) {  
      for (let i = 0; i < feed.length; i++) {
        temp_article.push(feed[i])
        temp_ids.push(feed[i].article_id)
      }
      this.setData({
        article: temp_article,
        art_ids: temp_ids,
        is_art_loaded: true,
        loading_more: false,
      })
      // console.log("updated articles:", temp_ids)

      if (feed.length < this.data.num_per_load) {
        this.setData({
          has_more: false
        })
      }
    } else {
      this.setData({
        has_more: false,
        is_art_loaded: true,
        loading_more: false,
      })
    }
  },

  onPullDownRefresh() {
    // wx.showNavigationBarLoading()
    wx.vibrateShort()
    
    this.init_variables()

    // request for latest features and articles
    this.loadArticles(true)
    this.loadFeatured()
  },

  init_variables: function () {
    this.setData({
      is_art_loaded: false,
      is_fea_loaded: false,
      loading: false,
      loading_more: false,
      has_more: true,
      load_error: false,
      msg: '读取中',
    })
  },

  goToAdPage: function (e) {
    app.utility.goToArticle(app, e.currentTarget.dataset.id, true)
  }
})