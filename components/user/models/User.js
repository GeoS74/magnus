const mongoose = require('mongoose');
const crypto = require('crypto');
const connection = require('@root/libs/connection');
const config = require('@root/config');


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: 'не заполнено обязательное поле {PATH}',
        validate: [
            {
                validator(value) {
                    return /^[-.\w]+@([\w-]+\.)+[\w-]{2,12}$/.test(value);
                },
                message: 'Некорректный {PATH}',
            },
        ],
        unique: 'Не уникальное значение {PATH}',
    },
    passwordHash: {
        type: String,
        required: 'не заполнено обязательное поле {PATH}',
    },
    salt: String,
    displayName: {
        type: String,
        //unique: 'Не уникальное значение {PATH}',
        validate: [
            {
                validator(value) {
                    return /^\w[\d\s-.\w]{2,}/.test(value);
                },
                message: 'Совсем некорректный {PATH}',
            },
        ],
    },
    rank: {
        type: String,
        default: 'user'
    },
    verificationToken: { //токен подтверждения email при регистрации
        type: String,
        index: true
    },
    recoveryToken: { //токен восстановления пароля
        type: String,
        index: true
    }
}, {
    timestamps: true
});

function generatePassword(salt, password) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(
            password, 
            salt,
            config.crypto.iterations,
            config.crypto.length,
            config.crypto.digest,
            (err, buffer) => {
                if (err) return reject(err);
                resolve(buffer.toString('hex'));
            },
        );
    });
}

function generateSalt() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(config.crypto.length, (err, buffer) => {
            if (err) return reject(err);
            resolve(buffer.toString('hex'));
        });
    });
}
  
userSchema.methods.setPassword = async function setPassword(password) {
    this.salt = await generateSalt();
    this.passwordHash = await generatePassword(this.salt, password);
};
  
userSchema.methods.checkPassword = async function(password) {
    if (!password) return false;

    const hash = await generatePassword(this.salt, password);
    return hash === this.passwordHash;
};

module.exports = connection.model('User', userSchema);