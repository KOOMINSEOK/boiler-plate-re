const express = require('express')
const app = express()
const port = 5000
const bodyParser =  require("body-parser");
const cookieParser = require('cookie-parser');
const config = require('./config/dev')

const { User } = require('./server/models/User'); 
const {auth} = require('./server/middleware/auth');

//application/x-www-form-urlencoded(url로 된거 읽어올수 있게 해줌)
app.use(bodyParser.urlencoded({extended: true}));
//application/json (json 으로 된거 읽게 해줌)
app.use(bodyParser.json());
app.use(cookieParser());
const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
mongoose.connect(config.mongoURI,
{useNewUrlParser: true, useUnifiedTopology: true
}).then(()=> console.log('MongoDB Connected...'))
.catch(err=> console.log(err))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/api/users/register', (req,res) => {
    //회원 가입시 필요한 정보들을 client에서 가져오면
    //그것들을 데이터 베이스에 넣어준다.

    const user = new User(req.body)
    user.save((err,userInfo)=>{
        if(err) return res.json({success: false, err})
        return res.status(200).json({
            success: true
        })
    })
})

app.post('/api/users/login',(req,res) =>{
  //요청된 email을 db에 있는지 찾는다
  User.findOne({email: req.body.email}, (err, user)=>{
    if(!user){
      return res.json({
        loginSuccess: false,
        message: "제공된 이메일에 해당한는 유저가 없습니다."
      })
    }
    
    user.comparePassword(req.body.password , (err, isMatch) =>{
      if(!isMatch)
        return res.json({ loginSuccess: false, message : "비밀번호가 틀렸습니다."});
      //비밀번호  까지 맞다면  토큰을 생성하기
      user.generateToken((err, user) => {
        if(err) return res.status(400).send(err);
        //토큰을 원하는 장소에 저장(쿠키,로컬 스토리지, 세션 등)
        res.cookie("x_auth",user.token)
          .status(200)
          .json({loginSuccess: true, userId : user._id}) 


      })
    })
  })
  //요청된 이메일이 db에 있다면 비밀번호가 맞는 비밀번호인지 확인

  //비밀번호 일치시 토큰 생성
})


app.get('/api/users/auth', auth , (req,res)=> {
  //여기까지 미들웨어를 통과해왔다는 얘기는 authentication이 True라는 말

  res.status(200).json({
    _id: req.user._id,
    isAdmin : req.user.role === 0 ? false: true,
    isAuth : true,
    email: req.user.email,
    name: req.user.name,
    lastname : req.user.lastname,
    role : req.user.role,
    image: req.user.image
  })
})

app.get('/api/users/logout', auth, (req, res) => {
   User.findOneAndUpdate({_id: req.user._id},
    {token: ""},
    (err,user)=> {
      if(err) return res.json({success : false, err});
      return res.status(200).send({
        success: true 
      })
    })
})



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})