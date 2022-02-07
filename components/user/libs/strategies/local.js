const LocalStrategy = require('passport-local').Strategy;
const User = require('@user/models/User');

module.exports = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        session: false
    },
    async function(email, password, done){
        try{
            const user = await User.findOne({email: email});

            if(!user) return done(null, false, {path: 'user', message: 'Нет такого пользователя'});
            
            if(!await user.checkPassword(password)) return done(null, false, {path: 'password', message: 'Не корректный пароль'});

            done(null, user);
        }
        catch(error) {
            
            done(error);
        }
    }
);