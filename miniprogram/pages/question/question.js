const app = getApp()

Page({
  data: {
    loading: true,
    load_error: false,
    msg: '读取中',
    has_warning: false,
    is_submitted: false,

    questions: [],
    answers: [],
    tot_q: 0,
    corr_q: 0,
    score: 0,
    result_msg: ''
  },

  pageScrollToBottom: function () {
    wx.createSelectorQuery().select('.article-container').boundingClientRect(function (rect) {
      if (rect) {
        wx.pageScrollTo({
          scrollTop: rect.bottom + 5000
        })
      }
    }).exec()
  },

  updatePage: function() {
    this.setData({
      loading: true,
      load_error: false,
      msg: '读取中',
      has_warning: false,
      is_submitted: false,
    })

    const check = app.utility.getCachedData('questions', app.globalData.selected_article_id)

    if (check.has_data) {
      this.setData({
        loading: false,
        questions: check.data.questions,
        answers: check.data.answers,
        tot_q: check.data.tot_q
      })
    } else {
      app.db.collection('article_questions').where({
        article_id: app.globalData.selected_article_id
      }).get({
        success: res => {
          if (res.data.length > 0) {
            let questions = res.data[0].questions
            let answers = []

            for (let i = 0; i < questions.length; i++) {
              answers[i] = null // init the answer list
              questions[i]['is_correct'] = null // init the questions
              questions[i]['select_index'] = null
              questions[i].answer_index = parseInt(questions[i].answer_index)
            }

            this.setData({
              loading: false,
              questions: questions,
              answers: answers,
              tot_q: answers.length
            })
          } else {
            this.setData({
              load_error: true,
              msg: '读取错误'
            })
          }
        },
        fail: err => {
          this.setData({
            load_error: true,
            msg: '读取错误'
          })
        }
      })
    }
  },

  onLoad: function (options) {
    this.updatePage()
  },

  onUnload: function () {
    if (!this.data.is_submitted && !this.data.load_error) {
      app.utility.saveCachedData(
        'questions', 
        app.globalData.selected_article_id, 
        {
          questions: this.data.questions,
          answers: this.data.answers,
          tot_q: this.data.tot_q,
        })
    }
  },

  reload: function () {
    this.updatePage()
  },

  radioChange: function(e) {
    const q_id = parseInt(e.currentTarget.dataset.id)
    const val = parseInt(e.detail.value)

    let new_answers = this.data.answers
    let new_questions = this.data.questions

    new_answers[q_id] = val
    new_questions[q_id].select_index = val

    this.setData({
      answers: new_answers
    })
  },
  
  showResult: function() {
    // check if all questions answered
    let all_answered = true

    for (let i = 0; i < this.data.answers.length; i++) {
      if (this.data.answers[i] === null) {
        all_answered = false
        break
      }
    }

    if (all_answered) {
      if (!this.data.is_submitted) {
        // remove the cache
        app.utility.removeCachedData('questions', app.globalData.selected_article_id)

        // check the results and upload
        const new_questions = this.data.questions
        let corr_q = 0

        for (let i = 0; i < new_questions.length; i++) {
          if (new_questions[i].select_index === new_questions[i].answer_index) {
            new_questions[i].is_correct = true
            corr_q++
          } else {
            new_questions[i].is_correct = false
          }
        }

        let score = Math.round(corr_q / this.data.tot_q * 100)

        this.setData({
          questions: new_questions,
          corr_q: corr_q,
          score: score,
          result_msg: score >= 85 ? '好厉害! 你的英语越来越棒啦!': '加油! 下次会有更好的成绩的!',
          is_submitted: true
        })

        this.pageScrollToBottom()

        // do all upload
        const today = new Date()

        app.db.collection('reading_records').add({
          data: {
            article_id: app.globalData.selected_article_id,
            date: today,
            score: this.data.score,
            title: app.globalData.selected_article_title
          },
          success: res => {
            console.log(res)
          },
          fail: err => {
            console.log(err)
          }
        })

        // ask cloud function to process the read stats
        wx.cloud.callFunction({
          name: "updateReadStats",
          data: {
            openid: app.globalData.openid,
            article_id: app.globalData.selected_article_id,
            category: app.globalData.selected_article_category,
            num_words: app.globalData.selected_article_num_words,
            num_questions: this.data.tot_q,
            score: this.data.score,
          },
          success: res => {
            console.log(res)
            // now need to refresh the stats
            app.globalData.reloadUserPage = true
          },
          fail: err => {
            console.log(err)
          }
        })
      }
    } else {
      this.setData({
        has_warning: true
      })
    }
  }
})