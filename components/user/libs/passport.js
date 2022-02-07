const {KoaPassport} = require('koa-passport');
const passport = new KoaPassport();
const LocalStrategy = require('./strategies/local');

passport.use(LocalStrategy);

module.exports = passport;


/*примерно так работает passport, если использовать его согласно документации "в лоб"
получается громоздкое и не очень красивое решение. В частности я так и не понял как работают serializeUser/deserializeUser.
Вариант, когда passport используется вне контекста приложения нарвится больше + отдельная реализация механизма сессий гораздо лучше чем сессии "из коробки"



const {KoaPassport} = require('koa-passport');
const passport = new KoaPassport();
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');

//Обязательно написать реализацию функций serializeUser/deserializeUser
//иначе будет вылетать ошибка
//
passport.serializeUser(function(user, done) {
    console.log('serializeUser');
    console.log(user);
    done(null, 25);
  });
  
  passport.deserializeUser(function(user, done) {
    console.log('deserializeUser');
    console.log(user);
    done(null, 21);
  });


passport.use(new LocalStrategy(
    {usernameField: 'email', passwordField: 'password', session: true},
    async function(email, password, done){
        try{
            const user = await User.findOne({email: email});

            if(!user) return done(null, false, 'not usur');

            if(!await user.checkPassword(password)) return done(null, false, 'incorrect pass');

            done(null, user);
        }
        catch(error) {
            done(error);
        }
    }
));

//Использовать сессию
//
const session = require('koa-session');
app.keys = ['secret'];
app.use(session({}, app));

//использовать passport в приложении
//
app.use(passport.initialize());
app.use(passport.session());

...

router.post('/signin', 
    koaBody, 
    passport.authenticate('local'),
    async (ctx, next) => {
        //await ctx.login();
        console.log( ctx.state );
    ctx.body = 'end';
});
*/