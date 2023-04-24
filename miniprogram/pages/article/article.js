const app = getApp()

Page({

  data: {
    loading: true,
    load_error: false,
    msg: '读取中',

    title: '',
    source: '',
    author: '',
    num_words: 0,
    cover_url: '',
    article_content: {},
    
    type: '',
    id: 0,
    isAdv: false
  },

  renderArticleData: function (res) {
    const article_data = res.result.article_data
    const article_content_data = res.result.article_content_data
    
    if (article_data && article_content_data) {
      app.globalData.selected_article_title = article_data.title
      app.globalData.selected_article_num_words = article_data.num_words
      app.globalData.selected_article_category = article_data.category      

      this.setData({
        title: article_data.title,
        source: article_data.source,
        author: article_data.author,
        num_words: article_data.num_words,
        cover_url: article_data.url,
        article_content: article_content_data,
        loading: false
      })
    } else {
      this.setData({
        load_error: true,
        msg: '读取错误'
      })
    }
  },

  updatePage: function () {
    // initialize when update
    this.setData({
      loading: true,
      load_error: false,
      msg: '读取中'
    })

    // load article conent
    wx.cloud.callFunction({
      name: "loadArticle",
      data: {
        type: this.data.type,
        article_id: this.data.id
      },
      success: res => {
        this.renderArticleData(res)
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
    let isAdv = false

    if (options.type === 'adv') {
      isAdv = true
    }

    this.setData({
      type: options.type,
      id: parseInt(options.id),
      isAdv: isAdv
    })
    
    this.updatePage()
  },

  reload: function () {
    this.updatePage()  
  },

  goToQuestion: function () {
    wx.navigateTo({
      url: '../question/question'
    })
  },

  onUnload: function () {
    app.utility.removeCachedData('questions', this.data.id)
  }
})